"""TraceEvent schema — frozen after M4. Add new types only; do not change existing ones."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TraceEventType(str, Enum):
    PLAN = "plan"
    RETRIEVAL = "retrieval"
    TOOL_CALL = "tool_call"
    ESCALATION = "escalation"
    PRECEDENT_APPLIED = "precedent_applied"
    CRITIC = "critic"
    VERDICT = "verdict"
    STATUS = "status"
    PRD_DRAFT = "prd_draft"
    PRD_FINAL = "prd_final"


class EscalationOption(BaseModel):
    id: str
    label: str
    implication: str


class EscalationPayload(BaseModel):
    """Four-part escalation contract — fixed JSON shape."""

    blocked_decision: str
    evidence: str
    options: list[EscalationOption]
    default: str  # option id


class TraceEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: TraceEventType
    timestamp: str = Field(default_factory=_now_iso)
    cycle_id: str
    message: str
    data: dict[str, Any] = Field(default_factory=dict)


class CycleStartRequest(BaseModel):
    masked_text: str
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    resume_token: str | None = None
    escalation_response: dict[str, Any] | None = None
    supervisor_note: str | None = None


class EscalationResponse(BaseModel):
    session_id: str
    cycle_id: str
    resume_token: str
    selected_option_id: str


class VerdictRequest(BaseModel):
    session_id: str
    cycle_id: str
    verdict: Literal["accept", "redirect", "reject"]
    note: str | None = None


class PingRequest(BaseModel):
    prompt: str = "Reply with exactly: pong"


class PingResponse(BaseModel):
    executor_model: str
    critic_model: str
    executor_reply: str
    critic_reply: str
    vultr_configured: bool
