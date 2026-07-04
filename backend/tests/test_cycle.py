"""Tests for Flux Cycle orchestrator."""

import pytest

from app.cycle.orchestrator import _filter_critic_findings
from app.tools import deterministic as tools


@pytest.mark.asyncio
async def test_ambiguity_detection_on_golden_pattern():
    text = (
        "The licensing module is business-critical. The payment model is ambiguous — "
        "it could mean either a one-time license fee OR a recurring subscription model."
    )
    result = tools.detect_planted_ambiguity(text)
    assert result is not None
    assert "payment" in result["evidence"].lower()


def test_planted_error_detection():
    prd = {
        "epics": [
            {
                "id": "EPIC-02",
                "title": "Phase 2 — Licensing",
                "stories": [{"title": "Delivery deadline Q1 2027 PLANTED_ERROR", "criteria": ["Deliver by Q1 2027"]}],
            }
        ]
    }
    finding = tools.detect_planted_error(prd)
    assert finding is not None
    assert "Q1 2027" in finding


def test_filter_critic_drops_payment_false_positive_when_resolved():
    prd = {
        "payment_model_decision": "subscription",
        "payment_model_resolution": {"status": "resolved", "choice": "Subscription (recurring)", "via": "precedent"},
    }
    findings = [
        "Deadline mismatch: Q1 2027 cited but acceptance contract requires Q3 2026 for phase 2",
        "Payment model ambiguity in REQ-004 is not resolved; contract requires resolution via escalation or precedent",
        "Payment model ambiguity remains unresolved",
    ]
    filtered = _filter_critic_findings(findings, prd)
    assert len(filtered) == 1
    assert "Deadline mismatch" in filtered[0]
    assert not any("payment" in f.lower() and "ambigu" in f.lower() for f in filtered)
