#!/usr/bin/env python3
"""Verify Vultr credentials and >=2 models (Executor + Critic)."""

from __future__ import annotations

import asyncio
import sys

from app.config import settings
from app.llm import vultr


async def main() -> int:
    print("Agent Flux — Vultr model check")
    print(f"  Base URL:       {settings.vultr_base_url}")
    print(f"  Executor model: {settings.vultr_executor_model}")
    print(f"  Critic model:   {settings.vultr_critic_model}")

    if not settings.vultr_api_key:
        print("\nERROR: VULTR_API_KEY not set. Copy backend/.env.example to backend/.env")
        return 1

    try:
        executor = await vultr.ping_model(settings.vultr_executor_model)
        print(f"\n  Executor OK: {executor[:80]}")
        critic = await vultr.ping_model(settings.vultr_critic_model)
        print(f"  Critic OK:   {critic[:80]}")
        print("\nGate M0 PASSED: >=2 models respond.")
        return 0
    except Exception as exc:
        print(f"\nERROR: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
