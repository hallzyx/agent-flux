"""Flux Cycle orchestrator — Frame → Plan → Execute → Checkpoint → Critic → Validate."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any
from uuid import uuid4

from app.config import settings
from app.llm import vultr
from app.session.store import CycleState, Precedent, get_session
from app.tools import deterministic as tools
from app.trace.events import (
    EscalationOption,
    EscalationPayload,
    TraceEvent,
    TraceEventType,
)

ACCEPTANCE_CONTRACT = [
    "PRD contains at least 2 epics with user stories",
    "Each story has acceptance criteria and size (S/M/L/XL)",
    "Risks are scored with justification",
    "Phase 2 deadline is Q3 2026 (not Q1 2027)",
    "Payment model ambiguity resolved via escalation or precedent",
    "Output preserves all placeholders (no re-identification server-side)",
]


def _event(cycle_id: str, event_type: TraceEventType, message: str, data: dict[str, Any] | None = None) -> TraceEvent:
    return TraceEvent(
        cycle_id=cycle_id,
        type=event_type,
        message=message,
        data=data or {},
    )


def _build_escalation(evidence: str) -> EscalationPayload:
    return EscalationPayload(
        blocked_decision="Payment model for the licensing module",
        evidence=evidence,
        options=[
            EscalationOption(
                id="subscription",
                label="Subscription (recurring)",
                implication="Recurring revenue, requires billing integration and churn tracking",
            ),
            EscalationOption(
                id="one_time",
                label="One-time license",
                implication="Single payment, simpler billing, no renewal workflow",
            ),
        ],
        default="subscription",
    )


def _find_precedent(session_id: str, blocked_decision: str) -> Precedent | None:
    session = get_session(session_id)
    for p in session.precedents:
        if p.blocked_decision.lower() == blocked_decision.lower():
            return p
    return None


def _apply_payment_decision(prd: dict[str, Any], option_id: str, *, via: str = "escalation") -> dict[str, Any]:
    prd = dict(prd)
    prd["payment_model_decision"] = option_id
    label = "Subscription (recurring)" if option_id == "subscription" else "One-time license"
    prd["payment_model_resolution"] = {
        "status": "resolved",
        "choice": label,
        "option_id": option_id,
        "via": via,
    }
    prd.setdefault("decisions", []).append({"topic": "payment_model", "choice": label, "via": via})
    requirements = []
    for req in prd.get("requirements", []):
        req = dict(req)
        text = req.get("text", "")
        if "payment" in text.lower() and ("ambiguous" in text.lower() or "either" in text.lower()):
            req["text"] = f"{text} [RESOLVED via {via}: {label}]"
            req["payment_resolved"] = True
        requirements.append(req)
    if requirements:
        prd["requirements"] = requirements
    return prd


def _payment_is_resolved(prd: dict[str, Any]) -> bool:
    return bool(prd.get("payment_model_decision") or prd.get("payment_model_resolution"))


def _filter_critic_findings(findings: list[str], prd: dict[str, Any]) -> list[str]:
    """Drop LLM false positives when payment was resolved via escalation or precedent."""
    if not _payment_is_resolved(prd):
        return findings
    filtered: list[str] = []
    for finding in findings:
        lower = finding.lower()
        is_payment_false_positive = (
            ("payment" in lower or "subscription" in lower or "license" in lower)
            and any(
                kw in lower
                for kw in (
                    "ambiguous",
                    "ambiguity",
                    "not resolved",
                    "unresolved",
                    "requires escalation",
                    "requires precedent",
                    "without providing a resolution",
                    "without resolution",
                )
            )
        )
        if is_payment_false_positive:
            continue
        filtered.append(finding)
    return filtered


def _inject_planted_error(prd: dict[str, Any]) -> dict[str, Any]:
    """Seed the critic-catching error in phase 2 epic."""
    prd = dict(prd)
    epics = list(prd.get("epics", []))
    for epic in epics:
        if epic.get("id") == "EPIC-02" or "phase 2" in epic.get("title", "").lower():
            stories = list(epic.get("stories", []))
            if stories:
                bad = dict(stories[0])
                bad["title"] = f"{bad.get('title', 'Phase 2 delivery')} — deadline Q1 2027 PLANTED_ERROR"
                bad["criteria"] = list(bad.get("criteria", [])) + ["Deliver by Q1 2027"]
                stories[0] = bad
                epic = dict(epic)
                epic["stories"] = stories
    prd["epics"] = epics
    return prd


async def _run_critic(prd: dict[str, Any], cycle_id: str) -> tuple[list[TraceEvent], dict[str, Any]]:
    events: list[TraceEvent] = []
    planted = tools.detect_planted_error(prd)
    findings: list[str] = []

    # Deterministic critic always catches planted error
    if planted:
        findings.append(planted)

    resolution_note = ""
    if _payment_is_resolved(prd):
        resolution = prd.get("payment_model_resolution") or {}
        resolution_note = (
            f" PAYMENT MODEL ALREADY RESOLVED: {resolution.get('choice', prd.get('payment_model_decision'))} "
            f"via {resolution.get('via', 'escalation/precedent')}. Do NOT flag payment ambiguity as unresolved."
        )

    # LLM critic if configured
    if settings.vultr_api_key:
        try:
            prompt = (
                "Review this PRD draft against the acceptance contract. "
                f"Contract: {json.dumps(ACCEPTANCE_CONTRACT)}. "
                f"PRD: {json.dumps(prd)[:6000]}. "
                f"{resolution_note} "
                "List any contract violations as bullet points. Be strict about deadline Q3 2026 vs Q1 2027. "
                "If payment_model_decision or payment_model_resolution is present, payment ambiguity is satisfied."
            )
            reply = await vultr.chat_completion(
                model=settings.vultr_critic_model,
                messages=[
                    {"role": "system", "content": "You are a strict PRD critic. Output JSON: {\"findings\": [\"...\"]}"},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
            )
            try:
                parsed = json.loads(reply)
                llm_findings = parsed.get("findings", [])
                if isinstance(llm_findings, list):
                    findings.extend(str(f) for f in llm_findings)
            except json.JSONDecodeError:
                if "Q1 2027" in reply or "deadline" in reply.lower():
                    findings.append(reply[:500])
        except Exception as exc:
            events.append(
                _event(cycle_id, TraceEventType.STATUS, f"Critic LLM fallback: {exc}", {"fallback": True})
            )

    findings = _filter_critic_findings(findings, prd)

    if not findings and planted:
        findings = [planted]

    prd_out = dict(prd)
    prd_out["critic_findings"] = findings
    if findings:
        # Auto-fix planted error for final output after critic flags it
        epics = []
        for epic in prd_out.get("epics", []):
            epic = dict(epic)
            stories = []
            for story in epic.get("stories", []):
                story = dict(story)
                story["title"] = story.get("title", "").replace("Q1 2027 PLANTED_ERROR", "Q3 2026")
                story["criteria"] = [c.replace("Q1 2027", "Q3 2026") for c in story.get("criteria", [])]
                stories.append(story)
            epic["stories"] = stories
            epics.append(epic)
        prd_out["epics"] = epics
        prd_out["critic_auto_fixed"] = True

    events.append(
        _event(
            cycle_id,
            TraceEventType.CRITIC,
            f"Critic review complete — {len(findings)} finding(s)",
            {"findings": findings, "model": settings.vultr_critic_model},
        )
    )
    return events, prd_out


async def run_cycle_stream(
    *,
    masked_text: str,
    session_id: str,
    resume_token: str | None = None,
    escalation_response: dict[str, Any] | None = None,
) -> AsyncGenerator[str, None]:
    """SSE stream of TraceEvents for a full Flux Cycle."""
    cycle_id = str(uuid4())
    session = get_session(session_id)

    def sse(event: TraceEvent) -> str:
        return f"data: {event.model_dump_json()}\n\n"

    yield sse(_event(cycle_id, TraceEventType.STATUS, "Flux Cycle started", {"contract": ACCEPTANCE_CONTRACT}))

    # Resume from escalation
    if resume_token and escalation_response:
        state = session.cycles.get(resume_token)
        if state and state.partial_prd:
            option_id = escalation_response.get("selected_option_id", "subscription")
            prd = _apply_payment_decision(state.partial_prd, option_id, via="escalation")
            session.precedents.append(
                Precedent(
                    blocked_decision="Payment model for the licensing module",
                    selected_option_id=option_id,
                    label="Subscription (recurring)" if option_id == "subscription" else "One-time license",
                )
            )
            yield sse(
                _event(
                    cycle_id,
                    TraceEventType.ESCALATION,
                    f"Escalation resolved: {option_id}",
                    {"selected": option_id, "resume_token": resume_token},
                )
            )
            critic_events, prd = await _run_critic(prd, cycle_id)
            for ev in critic_events:
                yield sse(ev)
            export = tools.export_structured(prd)
            prd["export"] = export
            yield sse(_event(cycle_id, TraceEventType.PRD_DRAFT, "PRD ready for validation", {"prd": prd}))
            state.partial_prd = prd
            return

    # Plan
    plan_steps = [
        "Analyze brief structure and identify requirement sections",
        "Retrieve context for authentication epic",
        "Retrieve context for licensing/payment epic",
        "Extract atomic requirements",
        "Score risks and identify ambiguities",
        "Estimate effort per story",
        "Build epics and acceptance criteria",
        "Run critic review against contract",
    ]
    yield sse(_event(cycle_id, TraceEventType.PLAN, "Execution plan approved", {"steps": plan_steps}))

    if settings.vultr_api_key:
        try:
            llm_plan = await vultr.chat_completion(
                model=settings.vultr_executor_model,
                messages=[
                    {"role": "system", "content": "You are a Planner agent. Output a JSON array of 4-6 plan step strings."},
                    {"role": "user", "content": f"Plan PRD generation for this brief:\n{masked_text[:3000]}"},
                ],
            )
            try:
                parsed = json.loads(llm_plan)
                if isinstance(parsed, list):
                    plan_steps = [str(s) for s in parsed]
            except json.JSONDecodeError:
                pass
        except Exception:
            pass

    await asyncio.sleep(0.1)

    # Retrievals
    queries = ["authentication security requirements", "licensing payment model subscription"]
    for q in queries:
        result = tools.retrieve_from_brief(masked_text, q)
        yield sse(_event(cycle_id, TraceEventType.RETRIEVAL, f"Retrieved: {q}", result))
        await asyncio.sleep(0.05)

    # Tool: extract_requirements
    requirements = tools.extract_requirements(masked_text)
    yield sse(
        _event(
            cycle_id,
            TraceEventType.TOOL_CALL,
            "extract_requirements",
            {"tool": "extract_requirements", "count": len(requirements), "requirements": requirements[:5]},
        )
    )

    risks = tools.score_risks(requirements)
    yield sse(
        _event(
            cycle_id,
            TraceEventType.TOOL_CALL,
            "score_risks",
            {"tool": "score_risks", "risks": risks},
        )
    )

    stories = tools.estimate_effort(requirements, risks)
    yield sse(
        _event(
            cycle_id,
            TraceEventType.TOOL_CALL,
            "estimate_effort",
            {"tool": "estimate_effort", "stories": stories[:8]},
        )
    )

    epics = tools.build_epics(requirements, stories)
    prd: dict[str, Any] = {
        "title": "Client Brief PRD",
        "epics": epics,
        "requirements": requirements,
        "risks": risks,
        "stories": stories,
        "acceptance_contract": ACCEPTANCE_CONTRACT,
    }
    prd = _inject_planted_error(prd)

    # Escalation / precedent
    ambiguity = tools.detect_planted_ambiguity(masked_text)
    blocked = "Payment model for the licensing module"
    precedent = _find_precedent(session_id, blocked)

    if precedent:
        prd = _apply_payment_decision(prd, precedent.selected_option_id, via="precedent")
        yield sse(
            _event(
                cycle_id,
                TraceEventType.PRECEDENT_APPLIED,
                "precedent applied — escalation skipped",
                {
                    "blocked_decision": blocked,
                    "applied_choice": precedent.label,
                    "precedent": precedent.__dict__,
                },
            )
        )
    elif ambiguity:
        payload = _build_escalation(ambiguity["evidence"])
        token = str(uuid4())
        session.cycles[token] = CycleState(
            cycle_id=cycle_id,
            session_id=session_id,
            masked_text=masked_text,
            resume_token=token,
            paused=True,
            escalation_payload=payload.model_dump(),
            partial_prd=prd,
        )
        yield sse(
            _event(
                cycle_id,
                TraceEventType.ESCALATION,
                "Cycle paused — human decision required",
                {"payload": payload.model_dump(), "resume_token": token},
            )
        )
        return

    critic_events, prd = await _run_critic(prd, cycle_id)
    for ev in critic_events:
        yield sse(ev)

    export = tools.export_structured(prd)
    prd["export"] = export
    yield sse(_event(cycle_id, TraceEventType.PRD_DRAFT, "PRD ready for validation", {"prd": prd}))
