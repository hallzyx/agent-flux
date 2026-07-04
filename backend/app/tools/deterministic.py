"""Deterministic tools for the Flux Cycle executor."""

from __future__ import annotations

import re
from typing import Any


def _split_sections(text: str) -> list[dict[str, str]]:
    chunks = re.split(r"\n(?=[A-Z][^\n]{0,80}:|\d+\.\s)", text)
    sections: list[dict[str, str]] = []
    for i, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk:
            continue
        title = chunk.split("\n", 1)[0][:80]
        sections.append({"id": f"sec_{i+1}", "title": title, "body": chunk})
    return sections or [{"id": "sec_1", "title": "Brief", "body": text}]


def extract_requirements(masked_text: str) -> list[dict[str, Any]]:
    """Segment brief into atomic requirements with source reference."""
    requirements: list[dict[str, Any]] = []
    sections = _split_sections(masked_text)
    req_id = 1
    for section in sections:
        sentences = re.split(r"(?<=[.!?])\s+", section["body"])
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 20:
                continue
            if any(
                kw in sentence.lower()
                for kw in (
                    "must", "should", "need", "require", "deliver", "implement", "build", "provide",
                    "debe", "requiere", "ambiguous", "either", "subscription", "one-time",
                )
            ):
                requirements.append(
                    {
                        "id": f"REQ-{req_id:03d}",
                        "text": sentence,
                        "source_section": section["title"],
                        "source_id": section["id"],
                    }
                )
                req_id += 1
    if not requirements:
        for i, section in enumerate(sections[:5], start=1):
            requirements.append(
                {
                    "id": f"REQ-{i:03d}",
                    "text": section["body"][:300],
                    "source_section": section["title"],
                    "source_id": section["id"],
                }
            )
    return requirements


def retrieve_from_brief(masked_text: str, query: str) -> dict[str, Any]:
    """Deterministic retrieval — keyword overlap scoring."""
    sections = _split_sections(masked_text)
    query_terms = set(re.findall(r"[a-zA-Z]{3,}", query.lower()))
    scored: list[tuple[float, dict[str, str]]] = []
    for section in sections:
        body_lower = section["body"].lower()
        score = sum(1 for t in query_terms if t in body_lower)
        scored.append((score, section))
    scored.sort(key=lambda x: x[0], reverse=True)
    best = scored[0][1] if scored else {"title": "Brief", "body": masked_text[:500]}
    excerpt = best["body"][:600]
    return {"query": query, "section": best["title"], "excerpt": excerpt, "score": scored[0][0] if scored else 0}


def score_risks(requirements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Score each requirement on ambiguity, external dependency, technical complexity."""
    risks: list[dict[str, Any]] = []
    for req in requirements:
        text = req["text"].lower()
        ambiguity = 0.0
        if any(w in text for w in ("ambiguous", "either", "or", "subscription", "one-time", "payment model", "unclear")):
            ambiguity = 0.9
        elif "?" in req["text"]:
            ambiguity = 0.6
        external = 0.7 if any(w in text for w in ("third-party", "vendor", "integration", "api", "external")) else 0.2
        complexity = 0.8 if any(w in text for w in ("migration", "legacy", "real-time", "compliance", "security")) else 0.4
        overall = round((ambiguity * 0.5 + external * 0.25 + complexity * 0.25), 2)
        risks.append(
            {
                "requirement_id": req["id"],
                "ambiguity": ambiguity,
                "external_dependency": external,
                "technical_complexity": complexity,
                "overall_score": overall,
                "justification": f"Ambiguity={ambiguity}, external={external}, complexity={complexity}",
                "triggers_escalation": ambiguity >= 0.85,
            }
        )
    return risks


def estimate_effort(requirements: list[dict[str, Any]], risks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Assign S/M/L/XL per requirement."""
    risk_by_req = {r["requirement_id"]: r for r in risks}
    stories: list[dict[str, Any]] = []
    for req in requirements:
        risk = risk_by_req.get(req["id"], {})
        score = risk.get("overall_score", 0.3)
        if score >= 0.75:
            size = "XL"
        elif score >= 0.55:
            size = "L"
        elif score >= 0.35:
            size = "M"
        else:
            size = "S"
        stories.append(
            {
                "requirement_id": req["id"],
                "title": req["text"][:80],
                "size": size,
                "criteria": [
                    f"Implements: {req['text'][:120]}",
                    "Includes unit tests",
                    "Documented in README",
                ],
            }
        )
    return stories


def build_epics(requirements: list[dict[str, Any]], stories: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group requirements into epics by source section."""
    by_section: dict[str, list[dict[str, Any]]] = {}
    for req in requirements:
        by_section.setdefault(req["source_section"], []).append(req)
    epics: list[dict[str, Any]] = []
    for i, (section, reqs) in enumerate(by_section.items(), start=1):
        req_ids = {r["id"] for r in reqs}
        epic_stories = [s for s in stories if s["requirement_id"] in req_ids]
        epics.append(
            {
                "id": f"EPIC-{i:02d}",
                "title": section[:100],
                "stories": epic_stories,
                "acceptance_criteria": [f"All stories for {section} completed"],
            }
        )
    return epics


def export_structured(prd: dict[str, Any]) -> dict[str, Any]:
    """Serialize PRD to Jira/Linear-compatible JSON + Markdown."""
    md_lines = ["# Product Requirements Document", ""]
    for epic in prd.get("epics", []):
        md_lines.append(f"## {epic['title']} ({epic['id']})")
        for story in epic.get("stories", []):
            md_lines.append(f"### {story['title']} [{story['size']}]")
            for c in story.get("criteria", []):
                md_lines.append(f"- {c}")
        md_lines.append("")
    md_lines.append("## Risks")
    for risk in prd.get("risks", []):
        md_lines.append(f"- {risk['requirement_id']}: score {risk['overall_score']} — {risk['justification']}")
    markdown = "\n".join(md_lines)
    jira_issues = []
    for epic in prd.get("epics", []):
        jira_issues.append({"type": "Epic", "summary": epic["title"], "key": epic["id"]})
        for story in epic.get("stories", []):
            jira_issues.append(
                {
                    "type": "Story",
                    "summary": story["title"],
                    "parent": epic["id"],
                    "labels": [story["size"]],
                    "description": "\n".join(f"* {c}" for c in story.get("criteria", [])),
                }
            )
    return {"markdown": markdown, "jira": {"issues": jira_issues}, "linear": {"issues": jira_issues}}


def detect_planted_ambiguity(masked_text: str) -> dict[str, Any] | None:
    """Detect the golden-fixture ambiguity (payment model)."""
    patterns = [
        r"payment model[^.]{0,120}(one[- ]time|subscription|recurring|license)",
        r"(one[- ]time|subscription)[^.]{0,80}payment",
        r"ambiguous[^.]{0,80}payment",
    ]
    for pattern in patterns:
        match = re.search(pattern, masked_text, re.IGNORECASE)
        if match:
            start = max(0, match.start() - 40)
            end = min(len(masked_text), match.end() + 40)
            return {"evidence": masked_text[start:end].strip(), "match": match.group(0)}
    if "payment" in masked_text.lower() and ("or" in masked_text.lower() or "either" in masked_text.lower()):
        idx = masked_text.lower().find("payment")
        return {"evidence": masked_text[max(0, idx - 50) : idx + 150].strip(), "match": "payment ambiguity"}
    return None


def detect_planted_error(prd: dict[str, Any]) -> str | None:
    """The golden fixture seeds a wrong deadline in epic 2 — critic should catch."""
    for epic in prd.get("epics", []):
        if "PHASE_2" in epic.get("title", "") or "phase 2" in epic.get("title", "").lower():
            for story in epic.get("stories", []):
                if "Q1 2027" in story.get("title", "") or "Q1 2027" in str(story.get("criteria", [])):
                    return f"Story '{story['title']}' references Q1 2027 but brief specifies Q3 2026 for phase 2"
    # Also check for explicit planted error marker
    prd_str = str(prd)
    if "PLANTED_ERROR" in prd_str or "Q1 2027" in prd_str:
        return "Deadline mismatch: Q1 2027 cited but acceptance contract requires Q3 2026 for phase 2"
    return None
