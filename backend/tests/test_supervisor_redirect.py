"""Tests for supervisor redirect and LLM-ready revision loop."""

from app.tools import deterministic as tools


def test_apply_supervisor_redirect_adds_revision_epic():
    note = "Needs revision on scope"
    stories, epics, prd = tools.apply_supervisor_redirect([], [], {"title": "Client Brief PRD"}, note, revision=2)

    assert prd["revision"] == 2
    assert prd["supervisor_redirect"] == note
    assert prd["title"] == "Client Brief PRD — revision 2"
    assert len(epics) == 1
    assert epics[0]["id"] == "EPIC-SUP-02"
    assert "Revision 2" in epics[0]["stories"][0]["title"]
    assert len(stories) == 1


def test_supervisor_requirement_prepended_for_risk_scoring():
    note = "Needs revision on scope"
    base = tools.extract_requirements("The system must implement SSO integration with Okta.")
    redirect_req = {
        "id": "REQ-SUPERVISOR",
        "text": f"Supervisor redirect (revision 2): {note}",
        "source_section": "Supervisor correction",
        "source_id": "supervisor",
    }
    merged = [redirect_req, *base]
    risks = tools.score_risks(merged)
    assert any(r["requirement_id"] == "REQ-SUPERVISOR" for r in risks)
