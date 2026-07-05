"""Tests for completion report (Slippage Protocol)."""

from app.cycle.completion_report import build_completion_report
from app.cycle.orchestrator import ACCEPTANCE_CONTRACT
from app.tools import deterministic as tools


def test_completion_report_flags_q1_2027_unmet():
    prd = {
        "epics": [
            {"id": "EPIC-01", "title": "Auth", "stories": [{"title": "SSO", "size": "M", "criteria": ["a", "b"]}]},
            {"id": "EPIC-02", "title": "Phase 2", "stories": [{"title": "Q1 2027 PLANTED_ERROR", "size": "L", "criteria": ["x", "y"]}]},
        ],
        "stories": [
            {"title": "SSO", "size": "M", "criteria": ["a", "b"]},
            {"title": "Q1 2027", "size": "L", "criteria": ["x", "y"]},
        ],
        "risks": [{"requirement_id": "REQ-001", "justification": "test", "overall_score": 0.5}],
        "payment_model_resolution": {"choice": "Subscription", "via": "escalation"},
    }
    report = build_completion_report(prd, ACCEPTANCE_CONTRACT)
    deadline = next(r for r in report["clauses"] if "Q3 2026" in r["clause"])
    assert deadline["status"] == "unmet"
    assert report["summary"]["unmet"] >= 1


def test_completion_report_met_when_clean():
    prd = {
        "epics": [
            {"id": "EPIC-01", "title": "Auth", "stories": [{"title": "SSO", "size": "M", "criteria": ["a", "b"]}]},
            {"id": "EPIC-02", "title": "Phase 2 Q3 2026", "stories": [{"title": "Lic", "size": "S", "criteria": ["a", "b"]}]},
        ],
        "stories": [
            {"title": "SSO", "size": "M", "criteria": ["a", "b"]},
            {"title": "Lic", "size": "S", "criteria": ["a", "b"]},
        ],
        "risks": [{"requirement_id": "REQ-001", "justification": "ok", "overall_score": 0.3}],
        "payment_model_resolution": {"choice": "Subscription", "via": "precedent"},
        "acceptance_contract": ACCEPTANCE_CONTRACT,
    }
    report = build_completion_report(prd, ACCEPTANCE_CONTRACT)
    assert report["summary"]["met"] >= 5
    assert report["summary"]["unmet"] == 0
    deadline = next(r for r in report["clauses"] if "Q3 2026" in r["clause"])
    assert deadline["status"] == "met"


def test_completion_report_payment_unmet_without_resolution():
    text = tools.extract_requirements(
        "The payment model is ambiguous — subscription OR one-time license."
    )
    prd = {
        "epics": [{"id": "E1", "title": "A", "stories": [{"title": "s", "size": "M", "criteria": ["a", "b"]}]},
                  {"id": "E2", "title": "B", "stories": [{"title": "s2", "size": "S", "criteria": ["a", "b"]}]}],
        "stories": [{"title": "s", "size": "M", "criteria": ["a", "b"]}, {"title": "s2", "size": "S", "criteria": ["a", "b"]}],
        "risks": [{"requirement_id": "REQ-001", "justification": "ambiguous payment", "overall_score": 0.9}],
        "requirements": text,
    }
    report = build_completion_report(prd, ACCEPTANCE_CONTRACT)
    payment = next(r for r in report["clauses"] if "Payment" in r["clause"])
    assert payment["status"] in ("unmet", "partial")
