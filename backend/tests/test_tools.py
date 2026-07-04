"""Backend tool tests."""

from pathlib import Path

from app.tools import deterministic as tools

FIXTURE = (Path(__file__).parent / "fixtures" / "brief.txt").read_text(encoding="utf-8")


def test_extract_requirements():
    reqs = tools.extract_requirements(FIXTURE)
    assert len(reqs) >= 1
    assert all("id" in r for r in reqs)


def test_score_risks_triggers_escalation():
    reqs = tools.extract_requirements(FIXTURE)
    risks = tools.score_risks(reqs)
    assert any(r.get("triggers_escalation") for r in risks)


def test_detect_planted_ambiguity():
    text = "payment model could mean one-time license OR recurring subscription"
    result = tools.detect_planted_ambiguity(text)
    assert result is not None


def test_export_structured():
    prd = {
        "epics": [{"id": "EPIC-01", "title": "Auth", "stories": [{"title": "SSO", "size": "M", "criteria": ["Okta"]}]}],
        "risks": [{"requirement_id": "REQ-001", "overall_score": 0.5, "justification": "test"}],
    }
    out = tools.export_structured(prd)
    assert "markdown" in out
    assert "jira" in out
    assert "SSO" in out["markdown"]
