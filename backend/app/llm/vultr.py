"""Vultr Serverless Inference client (OpenAI-compatible)."""

from __future__ import annotations

from openai import AsyncOpenAI

from app.config import settings


def get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.vultr_api_key or "not-configured",
        base_url=settings.vultr_base_url,
    )


def _extract_text(message: object, finish_reason: str | None) -> str:
    """Extract visible text from OpenAI-compatible responses (incl. reasoning models)."""
    content = (getattr(message, "content", None) or "").strip()
    if content:
        return content
    reasoning = getattr(message, "reasoning_content", None)
    if reasoning and str(reasoning).strip():
        return str(reasoning).strip()[:200]
    refusal = getattr(message, "refusal", None)
    if refusal and str(refusal).strip():
        return str(refusal).strip()
    if finish_reason:
        return f"connected (finish_reason={finish_reason})"
    return "connected"


async def chat_completion(
    *,
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    client = get_client()
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    choice = response.choices[0]
    return _extract_text(choice.message, choice.finish_reason)


async def ping_model(model: str, prompt: str = "Reply with exactly: pong") -> str:
    """Health-check a model. Reasoning models may need higher max_tokens for any visible reply."""
    client = get_client()
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Reply in one short line only. No reasoning preamble."},
            {"role": "user", "content": prompt},
        ],
        temperature=0,
        max_tokens=256,
    )
    choice = response.choices[0]
    text = _extract_text(choice.message, choice.finish_reason)
    return text[:300] if text else f"connected ({model})"
