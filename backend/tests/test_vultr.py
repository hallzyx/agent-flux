"""Vultr client helpers."""

from types import SimpleNamespace

from app.llm import vultr


def test_extract_text_from_content():
    msg = SimpleNamespace(content="pong", reasoning_content=None, refusal=None)
    assert vultr._extract_text(msg, "stop") == "pong"


def test_extract_text_fallback_when_empty():
    msg = SimpleNamespace(content="", reasoning_content=None, refusal=None)
    assert vultr._extract_text(msg, "length") == "connected (finish_reason=length)"
