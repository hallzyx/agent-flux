"""LLM-backed executor tools — reinforcement prompting for Flux Cycle demo."""

from __future__ import annotations

import json
import re
from typing import Any

from app.config import settings
from app.llm import vultr
from app.tools import deterministic as det

PROMPT_VERSION = "flux-tools-v2-reinforced"

# ---------------------------------------------------------------------------
# Reinforcement prompts (visible in trace for demo / pitch)
# ---------------------------------------------------------------------------

SCORE_RISKS_SYSTEM = """You are the Risk Analyst tool in the Agent Flux executor pipeline.

TASK
Score EVERY requirement on ambiguity, external dependency, and technical complexity.

OUTPUT — JSON only (no markdown fences, no prose before/after):
{
  "risks": [
    {
      "requirement_id": "<exact id from input>",
      "ambiguity": <0.0-1.0>,
      "external_dependency": <0.0-1.0>,
      "technical_complexity": <0.0-1.0>,
      "overall_score": <0.0-1.0>,
      "justification": "<one sentence citing evidence from the requirement>",
      "triggers_escalation": <true|false>
    }
  ]
}

FORMULA (mandatory)
overall_score = round(ambiguity * 0.5 + external_dependency * 0.25 + technical_complexity * 0.25, 2)

HARD RULES — pipeline fails if violated
1. One risk object per requirement_id in the input list. Preserve exact IDs.
2. Payment / licensing ambiguity: if text mentions payment model, subscription vs one-time,
   license fee ambiguity, or explicit either/or on billing → ambiguity >= 0.85 AND triggers_escalation = true.
3. SSO, Okta, third-party integrations → external_dependency >= 0.6.
4. Compliance, security, migration, real-time → technical_complexity >= 0.7.
5. justifications must quote or paraphrase the requirement — no generic filler.

FEW-SHOT
Input: {"id":"REQ-003","text":"The payment model is ambiguous — subscription OR one-time license."}
Output risk: {"requirement_id":"REQ-003","ambiguity":0.95,"external_dependency":0.25,"technical_complexity":0.45,"overall_score":0.61,"justification":"Explicit either/or payment model requires human escalation.","triggers_escalation":true}
"""

ESTIMATE_EFFORT_SYSTEM = """You are the Estimation tool in the Agent Flux executor pipeline.

TASK
Convert requirements + risk scores into sized user stories with testable acceptance criteria.

OUTPUT — JSON only:
{
  "stories": [
    {
      "requirement_id": "<exact id>",
      "title": "<imperative title, max 80 chars>",
      "size": "S"|"M"|"L"|"XL",
      "criteria": ["<criterion 1>", "<criterion 2>", "<criterion 3>"]
    }
  ]
}

SIZING (use linked risk overall_score when provided)
- overall_score >= 0.75 → XL
- >= 0.55 → L
- >= 0.35 → M
- else → S

HARD RULES
1. Exactly one story per requirement_id in the input.
2. Each story has exactly 3 criteria: (a) implements the requirement, (b) includes unit tests, (c) documented.
3. Preserve [ENTITY_*] and [AMOUNT_*] placeholders — never invent real names or numbers.
4. REQ-SUPERVISOR stories must lead with the supervisor correction in the title.
5. Titles are imperative ("Implement…", "Add…") not descriptions.

FEW-SHOT
Input requirement REQ-001 (score 0.3): "Must implement SSO integration with Okta."
Output: {"requirement_id":"REQ-001","title":"Implement Okta SSO integration","size":"S","criteria":["Okta SAML/OIDC flow works end-to-end","Unit tests cover auth callback","Auth flow documented in README"]}
"""


def _parse_llm_json(reply: str) -> dict[str, Any] | None:
    text = reply.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(text[start : end + 1])
                return parsed if isinstance(parsed, dict) else None
            except json.JSONDecodeError:
                return None
    return None


def _normalize_risks(raw: list[Any], requirements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Align LLM output to input requirement IDs; fill gaps with neutral defaults only."""
    by_id = {str(r.get("requirement_id")): r for r in raw if isinstance(r, dict) and r.get("requirement_id")}
    merged: list[dict[str, Any]] = []
    for req in requirements:
        rid = req["id"]
        item = by_id.get(rid, {})
        amb = float(item.get("ambiguity", 0.3))
        ext = float(item.get("external_dependency", 0.2))
        comp = float(item.get("technical_complexity", 0.4))
        overall = float(item.get("overall_score", round(amb * 0.5 + ext * 0.25 + comp * 0.25, 2)))
        merged.append(
            {
                "requirement_id": rid,
                "ambiguity": amb,
                "external_dependency": ext,
                "technical_complexity": comp,
                "overall_score": overall,
                "justification": str(item.get("justification", "Risk scored by LLM analyst")),
                "triggers_escalation": bool(item.get("triggers_escalation", False)),
            }
        )
    return merged


def _normalize_stories(raw: list[Any], requirements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {str(s.get("requirement_id")): s for s in raw if isinstance(s, dict) and s.get("requirement_id")}
    merged: list[dict[str, Any]] = []
    for req in requirements:
        rid = req["id"]
        item = by_id.get(rid, {})
        size = str(item.get("size", "M"))
        if size not in ("S", "M", "L", "XL"):
            size = "M"
        title = str(item.get("title", req["text"][:80]))[:80]
        criteria = item.get("criteria")
        if not isinstance(criteria, list) or len(criteria) < 2:
            criteria = [
                f"Implements: {req['text'][:120]}",
                "Includes unit tests",
                "Documented in README",
            ]
        merged.append(
            {
                "requirement_id": rid,
                "title": title,
                "size": size,
                "criteria": [str(c) for c in criteria[:5]],
            }
        )
    return merged


def _supervisor_clause(supervisor_note: str | None) -> str:
    if not supervisor_note:
        return ""
    return f"\n\nSUPERVISOR REDIRECT (revision context — prioritize in scoring/sizing):\n{supervisor_note}"


async def score_risks_llm(
    requirements: list[dict[str, Any]],
    *,
    masked_text: str,
    supervisor_note: str | None = None,
    acceptance_contract: list[str] | None = None,
) -> tuple[list[dict[str, Any]], str, dict[str, Any]]:
    """
    Score risks via Vultr LLM with reinforcement prompting.
    Returns (risks, engine, meta) where engine is 'vultr' or 'deterministic_fallback'.
    """
    meta: dict[str, Any] = {"prompt_version": PROMPT_VERSION, "tool": "score_risks_llm"}
    if not settings.vultr_api_key:
        risks = det.score_risks(requirements)
        meta["reason"] = "no_api_key"
        return risks, "deterministic_fallback", meta

    contract = acceptance_contract or []
    user_payload = {
        "requirements": requirements,
        "brief_excerpt": masked_text[:2000],
        "acceptance_contract": contract,
    }
    try:
        reply = await vultr.chat_completion(
            model=settings.vultr_executor_model,
            messages=[
                {"role": "system", "content": SCORE_RISKS_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Score risks for these requirements:\n{json.dumps(user_payload, indent=2)}"
                        f"{_supervisor_clause(supervisor_note)}"
                    ),
                },
            ],
            temperature=0.1,
            max_tokens=2048,
        )
        parsed = _parse_llm_json(reply)
        if not parsed or not isinstance(parsed.get("risks"), list):
            raise ValueError("invalid LLM JSON for score_risks")
        risks = _normalize_risks(parsed["risks"], requirements)
        meta["raw_count"] = len(parsed["risks"])
        meta["reinforcement"] = ["role_task", "json_schema", "hard_rules", "formula", "few_shot", "contract_context"]
        return risks, "vultr", meta
    except Exception as exc:
        risks = det.score_risks(requirements)
        meta["reason"] = f"llm_error: {exc}"
        return risks, "deterministic_fallback", meta


async def estimate_effort_llm(
    requirements: list[dict[str, Any]],
    risks: list[dict[str, Any]],
    *,
    masked_text: str,
    supervisor_note: str | None = None,
) -> tuple[list[dict[str, Any]], str, dict[str, Any]]:
    """
    Estimate story sizes via Vultr LLM with reinforcement prompting.
    Returns (stories, engine, meta).
    """
    meta: dict[str, Any] = {"prompt_version": PROMPT_VERSION, "tool": "estimate_effort_llm"}
    if not settings.vultr_api_key:
        stories = det.estimate_effort(requirements, risks)
        meta["reason"] = "no_api_key"
        return stories, "deterministic_fallback", meta

    payload = {
        "requirements": requirements,
        "risks": risks,
        "brief_excerpt": masked_text[:1500],
    }
    try:
        reply = await vultr.chat_completion(
            model=settings.vultr_executor_model,
            messages=[
                {"role": "system", "content": ESTIMATE_EFFORT_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Estimate effort and produce stories:\n{json.dumps(payload, indent=2)}"
                        f"{_supervisor_clause(supervisor_note)}"
                    ),
                },
            ],
            temperature=0.15,
            max_tokens=3072,
        )
        parsed = _parse_llm_json(reply)
        if not parsed or not isinstance(parsed.get("stories"), list):
            raise ValueError("invalid LLM JSON for estimate_effort")
        stories = _normalize_stories(parsed["stories"], requirements)
        meta["raw_count"] = len(parsed["stories"])
        meta["reinforcement"] = ["role_task", "json_schema", "hard_rules", "sizing_rubric", "few_shot", "supervisor_context"]
        return stories, "vultr", meta
    except Exception as exc:
        stories = det.estimate_effort(requirements, risks)
        meta["reason"] = f"llm_error: {exc}"
        return stories, "deterministic_fallback", meta
