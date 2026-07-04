# Agent Flux — Reference Implementation

From messy client brief to execution-ready PRD in minutes — a human-supervised agent pipeline where **sensitive data never leaves your device** unmasked.

This repo contains:
- **[framework-docs/](framework-docs/)** — the Agent Flux methodology (public canon)
- **`frontend/`** — Next.js app (upload, pseudonymization, boundary review, trace UI)
- **`backend/`** — FastAPI Flux Cycle orchestrator (Plan → Execute → Checkpoint → Critic → Validate)

## Quick start

### Prerequisites
- Node.js 20+ and pnpm
- Python 3.11+ and [uv](https://github.com/astral-sh/uv) (or pip)
- Vultr Serverless Inference API key (optional for local demo — deterministic fallbacks when LLM unavailable)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your VULTR_API_KEY

uv sync          # or: pip install -e .
uv run uvicorn app.main:app --reload --port 8000

# Verify M0 gate (>=2 models respond):
uv run python scripts/check_models.py
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo flow (one Flux Cycle)

1. Upload a client brief (or click **Load demo brief**)
2. Review pseudonymized text — **nothing is sent until you approve**
3. Watch the Flux Cycle trace: Plan → Retrievals → Tools (LLM) → Escalation → Critic
4. Accept escalation default (1 click) — recorded as precedent
5. Validate PRD → Accept or **Redirect** (editable note → revision 2) → re-identified export (JSON + Markdown)

Run the demo brief **twice** in the same session to see **precedent applied** (no second escalation).

## Architecture

```
Browser (Next.js)                    FastAPI + Vultr
─────────────────                    ────────────────
PDF extract (local)                  
PseudonymizerPort (regex / Gemma)    
Boundary review ──masked text only──▶ Flux Cycle (SSE trace)
Re-identify PRD ◀──PRD placeholders─┘
```

## Methodology

Agent Flux replaces the sprint with the **Flux Cycle** — Frame → Plan → Execute → Checkpoint → Validate → Integrate.

Read the full framework: [framework-docs/README.md](framework-docs/README.md)

## Tests

```bash
# Frontend M2 gate (pseudonymizer round-trip)
cd frontend && pnpm test

# Backend tools
cd backend && uv run pytest
```

## Known issues

- Gemma on-device (M10): loads Gemma 3 270M via MediaPipe + WebGPU, caches model in OPFS, regex baseline with Gemma supplemental NER; falls back to regex-only when WebGPU or model load fails
- Executor tools (`score_risks_llm`, `estimate_effort_llm`) use Vultr with reinforcement prompting; fall back to deterministic tools without API key
- In-memory session store (no persistence across server restarts)

## Hackathon tracks

- **Vultr** — Enterprise agent with plan, multi-retrieval, tools, escalation
- **Cursor** — Real PM workflow with interactive supervision checkpoints
- **DeepMind** — Privacy boundary with on-device pseudonymization (Gemma when available)

## License

MIT
