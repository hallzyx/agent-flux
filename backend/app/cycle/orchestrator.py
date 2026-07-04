"""Flux Cycle orchestrator — Frame → Plan → Execute → Checkpoint → Critic → Validate."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any
from uuid import uuid4

from app.cycle.completion_report import build_completion_report
from app.config import settings
from app.llm import vultr
from app.session.store import CycleState, Precedent, get_session
from app.tools import deterministic as tools
from app.tools import llm_tools
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


def _format_precedents_for_plan(session_id: str) -> tuple[list[dict[str, str]], str]:
    """I3d — precedents injected into Planner context."""
    session = get_session(session_id)
    items = [
        {
            "blocked_decision": p.blocked_decision,
            "ruling": p.label,
            "option_id": p.selected_option_id,
        }
        for p in session.precedents
    ]
    if not items:
        return [], ""
    lines = ["Prior session precedents (honor in plan and execution):"]
    for p in session.precedents:
        lines.append(f"- {p.blocked_decision} → {p.label}")
    return items, "\n".join(lines)


async def _generate_plan_steps(
    masked_text: str,
    session_id: str,
    *,
    note: str | None,
    revision: int,
) -> list[str]:
    plan_steps = [
        "Analyze RFP structure and identify requirement sections",
        "Retrieve context for SSO / authentication epic (Okta, SOX)",
        "Retrieve context for licensing / fee-structure epic",
        "Retrieve context for compliance (SOC 2, audit trail)",
        "Extract atomic requirements",
        "Score risks and identify ambiguities",
        "Estimate effort per story",
        "Build epics and acceptance criteria",
        "Run critic review against contract",
    ]
    if note:
        plan_steps = [
            f"Apply supervisor redirect (revision {revision}): {note}",
            "Re-scope epics and stories per supervisor correction",
            *plan_steps,
        ]

    _precedent_items, precedent_text = _format_precedents_for_plan(session_id)

    if settings.vultr_api_key:
        try:
            plan_user = f"Plan PRD generation for this brief:\n{masked_text[:3000]}"
            if precedent_text:
                plan_user += f"\n\n{precedent_text}"
            if note:
                plan_user += f"\n\nSupervisor rejected the prior draft. Correction required: {note}"
            llm_plan = await vultr.chat_completion(
                model=settings.vultr_executor_model,
                messages=[
                    {"role": "system", "content": "You are a Planner agent. Output a JSON array of 4-6 plan step strings."},
                    {"role": "user", "content": plan_user},
                ],
            )
            try:
                parsed = json.loads(llm_plan)
                if isinstance(parsed, list):
                    llm_steps = [str(s) for s in parsed]
                    if note:
                        plan_steps = plan_steps[:2] + llm_steps
                    else:
                        plan_steps = llm_steps
            except json.JSONDecodeError:
                pass
        except Exception:
            pass

    return plan_steps


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

    completion_report = build_completion_report(prd, ACCEPTANCE_CONTRACT)
    for row in completion_report["clauses"]:
        if row["status"] == "unmet" and row["clause"] not in str(findings):
            findings.append(f"Contract unmet: {row['clause']} — {row['evidence']}")

    prd_out = dict(prd)
    prd_out["critic_findings"] = findings
    prd_out["completion_report"] = completion_report

    events.append(
        _event(
            cycle_id,
            TraceEventType.CRITIC,
            f"Critic review complete — {completion_report['summary']['met']}/{completion_report['summary']['total']} clauses met",
            {
                "findings": findings,
                "completion_report": completion_report,
                "model": settings.vultr_critic_model,
            },
        )
    )
    return events, prd_out


async def _llm_enrich_requirements(
    masked_text: str,
    requirements: list[dict[str, Any]],
    supervisor_note: str | None = None,
) -> list[dict[str, Any]]:
    """Optional LLM pass — adds requirements regex may miss. Falls back silently."""
    if not settings.vultr_api_key:
        return requirements
    note_clause = f"\nSupervisor redirect to apply: {supervisor_note}" if supervisor_note else ""
    try:
        reply = await vultr.chat_completion(
            model=settings.vultr_executor_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a requirements analyst. Output JSON only: "
                        '{"requirements": [{"id": "REQ-LLM-001", "text": "...", "source_section": "..."}]}. '
                        "Add up to 3 requirements the baseline pass missed."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Brief:\n{masked_text[:2500]}\n"
                        f"Existing requirements:\n{json.dumps(requirements[:6])}{note_clause}"
                    ),
                },
            ],
            temperature=0.2,
        )
        parsed = json.loads(reply)
        extra = parsed.get("requirements", [])
        if not isinstance(extra, list):
            return requirements
        merged = list(requirements)
        existing_ids = {r["id"] for r in merged}
        for item in extra:
            if not isinstance(item, dict) or not item.get("text"):
                continue
            req_id = str(item.get("id", f"REQ-LLM-{len(merged) + 1:03d}"))
            if req_id in existing_ids:
                continue
            merged.append(
                {
                    "id": req_id,
                    "text": str(item["text"]),
                    "source_section": str(item.get("source_section", "LLM enrichment")),
                    "source_id": "llm",
                }
            )
        return merged
    except Exception:
        return requirements


async def _execute_from_plan(
    *,
    cycle_id: str,
    masked_text: str,
    session_id: str,
    session: Any,
    plan_steps: list[str],
    note: str | None,
) -> AsyncGenerator[TraceEvent, None]:
    """Execute phase — retrievals, tools, escalation checkpoint, critic."""
    yield _event(
        cycle_id,
        TraceEventType.PLAN,
        "Execution plan approved by supervisor",
        {"steps": plan_steps, "revision": session.revision, "supervisor_note": note, "pending_approval": False},
    )

    await asyncio.sleep(0.1)

    queries = [
        "SSO Okta authentication SOX audit logging",
        "licensing fee structure subscription recurring one-time ambiguous",
        "SOC 2 compliance document retention audit trail",
    ]
    for q in queries:
        result = tools.retrieve_from_brief(masked_text, q)
        yield _event(cycle_id, TraceEventType.RETRIEVAL, f"Retrieved: {q}", result)
        await asyncio.sleep(0.05)

    requirements = tools.extract_requirements(masked_text)
    yield _event(
        cycle_id,
        TraceEventType.TOOL_CALL,
        "extract_requirements",
        {"tool": "extract_requirements", "engine": "deterministic", "count": len(requirements), "requirements": requirements[:5]},
    )

    enriched = await _llm_enrich_requirements(masked_text, requirements, note)
    if len(enriched) > len(requirements):
        yield _event(
            cycle_id,
            TraceEventType.TOOL_CALL,
            "extract_requirements_llm",
            {
                "tool": "extract_requirements_llm",
                "engine": "vultr",
                "added": len(enriched) - len(requirements),
                "requirements": enriched[len(requirements) :][:3],
            },
        )
        requirements = enriched

    if note:
        redirect_req = {
            "id": "REQ-SUPERVISOR",
            "text": f"Supervisor redirect (revision {session.revision}): {note}",
            "source_section": "Supervisor correction",
            "source_id": "supervisor",
        }
        requirements = [redirect_req, *requirements]

    risks, risks_engine, risks_meta = await llm_tools.score_risks_llm(
        requirements,
        masked_text=masked_text,
        supervisor_note=note,
        acceptance_contract=ACCEPTANCE_CONTRACT,
    )
    yield _event(
        cycle_id,
        TraceEventType.TOOL_CALL,
        "score_risks_llm",
        {
            "tool": "score_risks_llm",
            "engine": risks_engine,
            "prompt_version": risks_meta.get("prompt_version"),
            "reinforcement": risks_meta.get("reinforcement"),
            "risks": risks,
        },
    )

    stories, effort_engine, effort_meta = await llm_tools.estimate_effort_llm(
        requirements,
        risks,
        masked_text=masked_text,
        supervisor_note=note,
    )
    yield _event(
        cycle_id,
        TraceEventType.TOOL_CALL,
        "estimate_effort_llm",
        {
            "tool": "estimate_effort_llm",
            "engine": effort_engine,
            "prompt_version": effort_meta.get("prompt_version"),
            "reinforcement": effort_meta.get("reinforcement"),
            "stories": stories[:8],
        },
    )

    epics = tools.build_epics(requirements, stories)
    prd: dict[str, Any] = {
        "title": "Client Brief PRD",
        "epics": epics,
        "requirements": requirements,
        "risks": risks,
        "stories": stories,
        "acceptance_contract": ACCEPTANCE_CONTRACT,
        "revision": session.revision,
    }
    if note:
        stories, epics, prd = tools.apply_supervisor_redirect(stories, epics, prd, note, session.revision)
        prd["epics"] = epics
        prd["stories"] = stories
    prd = _inject_planted_error(prd)

    ambiguity = tools.detect_planted_ambiguity(masked_text)
    blocked = "Payment model for the licensing module"
    precedent = _find_precedent(session_id, blocked)

    if precedent:
        prd = _apply_payment_decision(prd, precedent.selected_option_id, via="precedent")
        yield _event(
            cycle_id,
            TraceEventType.PRECEDENT_APPLIED,
            "precedent applied — escalation skipped",
            {
                "blocked_decision": blocked,
                "applied_choice": precedent.label,
                "precedent": precedent.__dict__,
            },
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
            pause_kind="escalation",
            escalation_payload=payload.model_dump(),
            partial_prd=prd,
            supervisor_note=note,
        )
        yield _event(
            cycle_id,
            TraceEventType.ESCALATION,
            "Cycle paused — human decision required",
            {"payload": payload.model_dump(), "resume_token": token},
        )
        return

    critic_events, prd = await _run_critic(prd, cycle_id)
    for ev in critic_events:
        yield ev

    export = tools.export_structured(prd)
    prd["export"] = export
    yield _event(cycle_id, TraceEventType.PRD_DRAFT, "PRD ready for validation", {"prd": prd})


async def run_cycle_stream(
    *,
    masked_text: str,
    session_id: str,
    resume_token: str | None = None,
    escalation_response: dict[str, Any] | None = None,
    plan_approval: dict[str, Any] | None = None,
    supervisor_note: str | None = None,
) -> AsyncGenerator[str, None]:
    """SSE stream of TraceEvents for a full Flux Cycle."""
    session = get_session(session_id)

    def sse(event: TraceEvent) -> str:
        return f"data: {event.model_dump_json()}\n\n"

    # Resume: plan approved → execute
    if resume_token and plan_approval is not None:
        state = session.cycles.get(resume_token)
        if not state or state.pause_kind != "plan_approval":
            yield sse(_event(resume_token, TraceEventType.STATUS, "Invalid plan resume token", {"error": True}))
            return
        cycle_id = state.cycle_id
        note = state.supervisor_note
        approved = plan_approval.get("approved_steps")
        plan_steps = [str(s) for s in approved] if isinstance(approved, list) and approved else (state.plan or [])
        async for event in _execute_from_plan(
            cycle_id=cycle_id,
            masked_text=state.masked_text,
            session_id=session_id,
            session=session,
            plan_steps=plan_steps,
            note=note,
        ):
            yield sse(event)
        return

    cycle_id = str(uuid4())

    yield sse(_event(cycle_id, TraceEventType.STATUS, "Flux Cycle started", {"contract": ACCEPTANCE_CONTRACT}))

    note = supervisor_note.strip() if supervisor_note else None
    if note:
        session.redirect_notes.append(note)
        session.revision += 1
        yield sse(
            _event(
                cycle_id,
                TraceEventType.STATUS,
                "Supervisor redirect — replanning with correction",
                {"supervisor_note": note, "revision": session.revision},
            )
        )

    # Resume from escalation
    if resume_token and escalation_response:
        state = session.cycles.get(resume_token)
        if state and state.partial_prd:
            cycle_id = state.cycle_id
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

    precedent_items, precedent_text = _format_precedents_for_plan(session_id)
    if precedent_items:
        yield sse(
            _event(
                cycle_id,
                TraceEventType.STATUS,
                "Precedents injected into plan context",
                {"precedents": precedent_items},
            )
        )

    plan_steps = await _generate_plan_steps(masked_text, session_id, note=note, revision=session.revision)

    token = str(uuid4())
    session.cycles[token] = CycleState(
        cycle_id=cycle_id,
        session_id=session_id,
        masked_text=masked_text,
        resume_token=token,
        paused=True,
        pause_kind="plan_approval",
        plan=plan_steps,
        supervisor_note=note,
    )

    yield sse(
        _event(
            cycle_id,
            TraceEventType.PLAN,
            "Execution plan proposed — awaiting supervisor approval",
            {
                "steps": plan_steps,
                "revision": session.revision,
                "supervisor_note": note,
                "pending_approval": True,
                "resume_token": token,
                "precedents_in_plan": precedent_items,
            },
        )
    )
