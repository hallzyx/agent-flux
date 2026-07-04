"""In-memory session store for escalation pause/resume and precedents."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Precedent:
    blocked_decision: str
    selected_option_id: str
    label: str


@dataclass
class CycleState:
    cycle_id: str
    session_id: str
    masked_text: str
    resume_token: str
    paused: bool = False
    pause_kind: str | None = None  # "plan_approval" | "escalation"
    escalation_payload: dict[str, Any] | None = None
    partial_prd: dict[str, Any] | None = None
    plan: list[str] | None = None
    supervisor_note: str | None = None
    step_index: int = 0


@dataclass
class SessionStore:
    precedents: list[Precedent] = field(default_factory=list)
    cycles: dict[str, CycleState] = field(default_factory=dict)
    redirect_notes: list[str] = field(default_factory=list)
    revision: int = 1


_store: dict[str, SessionStore] = {}


def get_session(session_id: str) -> SessionStore:
    if session_id not in _store:
        _store[session_id] = SessionStore()
    return _store[session_id]
