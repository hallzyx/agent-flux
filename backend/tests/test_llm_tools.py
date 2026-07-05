"""Tests for LLM executor tools (mocked Vultr)."""

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.tools import deterministic as det
from app.tools import llm_tools


@pytest.mark.asyncio
async def test_score_risks_llm_parses_reinforced_response():
    requirements = det.extract_requirements(
        "The payment model is ambiguous — subscription OR one-time license. Must implement SSO with Okta."
    )
    llm_json = {
        "risks": [
            {
                "requirement_id": requirements[0]["id"],
                "ambiguity": 0.92,
                "external_dependency": 0.2,
                "technical_complexity": 0.4,
                "overall_score": 0.56,
                "justification": "Either/or payment model in requirement text.",
                "triggers_escalation": True,
            }
        ]
    }

    with patch("app.tools.llm_tools.settings.vultr_api_key", "test-key"):
        with patch("app.tools.llm_tools.vultr.chat_completion", new_callable=AsyncMock) as mock_chat:
            mock_chat.return_value = json.dumps(llm_json)
            risks, engine, meta = await llm_tools.score_risks_llm(
                requirements,
                masked_text="payment ambiguous subscription one-time",
            )

    assert engine == "vultr"
    assert meta["prompt_version"] == llm_tools.PROMPT_VERSION
    assert len(risks) == len(requirements)
    assert any(r["triggers_escalation"] for r in risks)
    mock_chat.assert_awaited_once()
    # enable_thinking=False: the HARD RULES already spell out the rubric, so the model doesn't
    # need to deliberate — and leaving this unset made the executor model burn its token budget
    # on chain-of-thought and never emit the JSON answer (confirmed against the live API).
    assert mock_chat.await_args.kwargs["enable_thinking"] is False
    system_msg = mock_chat.await_args.kwargs["messages"][0]["content"]
    assert "HARD RULES" in system_msg
    assert "FEW-SHOT" in system_msg


@pytest.mark.asyncio
async def test_estimate_effort_llm_parses_stories():
    requirements = [{"id": "REQ-001", "text": "Must implement SSO with Okta.", "source_section": "Auth", "source_id": "s1"}]
    risks = [
        {
            "requirement_id": "REQ-001",
            "ambiguity": 0.1,
            "external_dependency": 0.7,
            "technical_complexity": 0.5,
            "overall_score": 0.4,
            "justification": "Okta integration",
            "triggers_escalation": False,
        }
    ]
    llm_json = {
        "stories": [
            {
                "requirement_id": "REQ-001",
                "title": "Implement Okta SSO integration",
                "size": "M",
                "criteria": ["SSO works", "Unit tests", "Docs"],
            }
        ]
    }

    with patch("app.tools.llm_tools.settings.vultr_api_key", "test-key"):
        with patch("app.tools.llm_tools.vultr.chat_completion", new_callable=AsyncMock) as mock_chat:
            mock_chat.return_value = json.dumps(llm_json)
            stories, engine, _meta = await llm_tools.estimate_effort_llm(
                requirements,
                risks,
                masked_text="SSO Okta",
                supervisor_note="Narrow scope to SSO only",
            )

    assert engine == "vultr"
    assert stories[0]["title"] == "Implement Okta SSO integration"
    assert stories[0]["size"] == "M"
    assert mock_chat.await_args.kwargs["enable_thinking"] is False
    user_msg = mock_chat.await_args.kwargs["messages"][1]["content"]
    assert "SUPERVISOR REDIRECT" in user_msg


@pytest.mark.asyncio
async def test_score_risks_llm_falls_back_without_api_key():
    requirements = det.extract_requirements("Must implement SSO.")
    with patch("app.tools.llm_tools.settings.vultr_api_key", ""):
        risks, engine, meta = await llm_tools.score_risks_llm(requirements, masked_text="SSO")
    assert engine == "deterministic_fallback"
    assert meta["reason"] == "no_api_key"
    assert len(risks) >= 1


def test_parse_llm_json_strips_fences():
    raw = 'Here is JSON:\n```json\n{"risks": []}\n```'
    parsed = llm_tools._parse_llm_json(raw)
    assert parsed == {"risks": []}


@pytest.mark.asyncio
async def test_score_risks_llm_falls_back_on_malformed_json():
    requirements = [{"id": "REQ-001", "text": "Must implement SSO.", "source_section": "Auth", "source_id": "s1"}]
    with patch("app.tools.llm_tools.settings.vultr_api_key", "test-key"):
        with patch(
            "app.tools.llm_tools.vultr.chat_completion", new_callable=AsyncMock, return_value="not json at all"
        ):
            risks, engine, meta = await llm_tools.score_risks_llm(requirements, masked_text="SSO")

    assert engine == "deterministic_fallback"
    assert "llm_error" in meta["reason"]
    assert len(risks) == 1
