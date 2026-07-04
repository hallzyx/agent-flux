"""Tests for plan approval checkpoint (I3a)."""

import json

import pytest

from app.cycle.orchestrator import run_cycle_stream
from app.session.store import get_session


FIXTURE_MASKED = (
    "The licensing module is business-critical. The payment model is ambiguous — "
    "it could mean either a one-time license fee OR a recurring subscription model. "
    "Must implement SSO integration with Okta."
)


async def _collect_sse(gen, limit: int = 20) -> list[dict]:
    events = []
    async for chunk in gen:
        if chunk.startswith("data: "):
            events.append(json.loads(chunk[6:]))
        if len(events) >= limit:
            break
    return events


@pytest.mark.asyncio
async def test_plan_pauses_for_approval_before_tools():
    session_id = "test-plan-session"
    events = await _collect_sse(
        run_cycle_stream(masked_text=FIXTURE_MASKED, session_id=session_id),
        limit=10,
    )
    plan_events = [e for e in events if e["type"] == "plan"]
    assert len(plan_events) == 1
    assert plan_events[0]["data"].get("pending_approval") is True
    assert plan_events[0]["data"].get("resume_token")
    tool_events = [e for e in events if e["type"] == "tool_call"]
    assert len(tool_events) == 0


@pytest.mark.asyncio
async def test_plan_approval_resume_runs_tools():
    session_id = "test-plan-resume"
    first = await _collect_sse(run_cycle_stream(masked_text=FIXTURE_MASKED, session_id=session_id), limit=10)
    token = next(e["data"]["resume_token"] for e in first if e["type"] == "plan")
    second = await _collect_sse(
        run_cycle_stream(
            masked_text="",
            session_id=session_id,
            resume_token=token,
            plan_approval={"approved_steps": ["Custom step 1", "Extract requirements"]},
        ),
        limit=15,
    )
    assert any(e["type"] == "tool_call" for e in second)
    approved_plan = [e for e in second if e["type"] == "plan" and not e["data"].get("pending_approval")]
    assert len(approved_plan) == 1
    assert "Custom step 1" in approved_plan[0]["data"]["steps"]


@pytest.mark.asyncio
async def test_precedents_injected_on_second_run():
    session_id = "test-precedent-plan"
    session = get_session(session_id)
    from app.session.store import Precedent

    session.precedents.append(
        Precedent(
            blocked_decision="Payment model for the licensing module",
            selected_option_id="subscription",
            label="Subscription (recurring)",
        )
    )
    events = await _collect_sse(
        run_cycle_stream(masked_text=FIXTURE_MASKED, session_id=session_id),
        limit=10,
    )
    status = [e for e in events if "Precedents injected" in e.get("message", "")]
    assert len(status) == 1
    plan = next(e for e in events if e["type"] == "plan")
    assert plan["data"].get("precedents_in_plan")
