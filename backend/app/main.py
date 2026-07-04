from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.cycle.orchestrator import ACCEPTANCE_CONTRACT, run_cycle_stream
from app.llm import vultr
from app.trace.events import (
    CycleStartRequest,
    EscalationResponse,
    PingRequest,
    PingResponse,
    TraceEvent,
    TraceEventType,
    VerdictRequest,
)

app = FastAPI(title="Agent Flux API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "agent-flux-backend"}


@app.get("/api/contract")
async def get_contract() -> dict:
    return {"clauses": ACCEPTANCE_CONTRACT}


@app.post("/api/ping", response_model=PingResponse)
async def ping_vultr(body: PingRequest) -> PingResponse:
    configured = bool(settings.vultr_api_key)
    executor_reply = "Vultr not configured — set VULTR_API_KEY in backend/.env"
    critic_reply = executor_reply
    if configured:
        try:
            executor_reply = await vultr.ping_model(settings.vultr_executor_model, body.prompt)
            critic_reply = await vultr.ping_model(settings.vultr_critic_model, body.prompt)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Vultr error: {exc}") from exc
    return PingResponse(
        executor_model=settings.vultr_executor_model,
        critic_model=settings.vultr_critic_model,
        executor_reply=executor_reply,
        critic_reply=critic_reply,
        vultr_configured=configured,
    )


@app.post("/api/cycle")
async def start_cycle(body: CycleStartRequest) -> StreamingResponse:
    async def event_generator():
        async for chunk in run_cycle_stream(
            masked_text=body.masked_text,
            session_id=body.session_id,
            resume_token=body.resume_token,
            escalation_response=body.escalation_response,
        ):
            yield chunk

    return StreamingResponse(event_generator(), media_type="text/event-stream")


class ResumeRequest(BaseModel):
    session_id: str
    resume_token: str
    selected_option_id: str


@app.post("/api/cycle/resume")
async def resume_cycle(body: ResumeRequest) -> StreamingResponse:
    async def event_generator():
        async for chunk in run_cycle_stream(
            masked_text="",
            session_id=body.session_id,
            resume_token=body.resume_token,
            escalation_response={"selected_option_id": body.selected_option_id},
        ):
            yield chunk

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/verdict")
async def submit_verdict(body: VerdictRequest) -> TraceEvent:
    return TraceEvent(
        cycle_id=body.cycle_id,
        type=TraceEventType.VERDICT,
        message=f"Human verdict: {body.verdict}",
        data={"verdict": body.verdict, "note": body.note},
    )
