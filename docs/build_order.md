> **Internal design log, published for transparency.** This is the milestone-by-milestone build sequence with validation gates, including a "Post-iteration-3 hardening" section documenting bugs an independent code review found and how they were fixed. Kept public because the gates and the hardening log are direct evidence the claims elsewhere are verified, not asserted. For a judge-facing summary, see [`SUBMISSION.md`](../SUBMISSION.md); for exactly how to verify the key claims yourself, see [`VERIFICATION.md`](../VERIFICATION.md).

# Build Order — AGENT FLUX MVP

> Implementation sequence with validation gates. Complements `product.md` v1.3 (the WHAT); this is the ORDER.
> Golden rule: **no milestone starts until the previous one's gate passes.** If a gate fails, fix it or degrade to the fallback — never build on top of something broken.

**Status (5 Jul 2026):** M0–M11 ✅ merged into `main`. Post-MVP iteration 2 ✅ (redirect + LLM tools). Iteration 3 ✅ (plan-approval checkpoint, completion report, Reject verdict, precedent-in-plan) — see the table below. Post-iteration-3 hardening ✅ — see the section at the end.

## The 3 ordering principles

1. **Build in user-flow order.** Each milestone extends the user journey one more step (upload → pseudonymize → boundary review → agent → escalation → validate → export). Benefit: a recordable partial demo exists at every point — if time runs out at milestone N, milestones 1..N-1 are already a coherent demo.
2. **Stable ports at the boundaries.** The riskiest pieces are hidden behind interfaces defined BEFORE implementing them, so they can be swapped without breaking what's above:
   - `PseudonymizerPort` — `pseudonymize(text) → {masked_text, mapping}` / `reidentify(text, mapping) → text`. First implemented by **local regex/NER** (deterministic, testable); Gemma comes in AFTER as a drop-in behind the same port. The app never knows which one is running.
   - `TraceEvent` schema — everything the backend emits (plan, retrieval, tool_call, escalation, critic, verdict) is a typed event from day 1. The trace UI is written once and never touched as the pipeline grows.
   - `EscalationPayload` — the 4 parts (blocked_decision, evidence, options[], default) as a fixed JSON contract.
3. **The demo brief is the golden fixture.** A single test PDF, designed with: known entities (to validate pseudonymization), ONE planted ambiguity (to trigger the escalation deterministically), and an optional seeded error (for the Critic to genuinely catch). Every milestone re-runs the accumulated E2E against this fixture — that's the regression suite.

## The sequence (M0–M11)

| # | Milestone | Depends on | Validation gate (acceptance contract) | Status |
|---|---|---|---|---|
| M0 | **Skeleton**: Next.js + FastAPI + healthcheck + hello-world against Vultr. Confirm ≥2 available models (Executor/Critic) | — | A prompt travels browser→FastAPI→Vultr→browser and renders. Both models respond. Credentials in `.env` | ✅ |
| M1 | **Ingestion**: PDF upload + text extraction | M0 | The golden fixture uploads and its extracted text shows complete and readable | ✅ |
| M2 | **Pseudonymizer v1 (local regex/NER)** + mapping table + re-identification | M1 | Lossless round-trip: `reidentify(pseudonymize(x)) == x`. All the fixture's entities come out masked with typed+magnitude placeholders. **Unit test, not visual inspection** | ✅ |
| M3 | **Boundary review UI**: original vs. masked side by side, entities highlighted, approve button | M2 | NOTHING leaves over the network before the click (verifiable in the Network tab). Approving triggers sending the masked text only | ✅ |
| M4 | **Pipeline v0 + live trace**: Plan (Planner) → 1 tool (`extract_requirements`) → PRD draft, `TraceEvent`s over SSE | M3 | The trace renders live, step by step. The PRD arrives with placeholders INTACT (the cloud never saw real data — grepping real entities against the response = 0 matches) | ✅ |
| M5 | **Tools + multiple retrievals**: `score_risks`, `estimate_effort`, `export_structured`; the agent goes back to the brief N times | M4 | Each tool independently testable. The trace shows ≥2 retrievals with different queries. The PRD has epics+stories+criteria+risks+sizes | ✅ *(deterministic MVP; see I2 for LLM)* |
| M6 | **4-part escalation**: cycle pause, full payload, one-click "accept default," resume | M5 | The fixture's planted ambiguity triggers the escalation 100% of the time. The default is accepted in one click and the run continues from where it paused | ✅ |
| M7 | **Session precedent**: recording + UI chip + re-application | M6 | Run the fixture twice in the same session: the second time it does NOT escalate — the trace says "precedent applied" | ✅ |
| M8 | **Critic**: a second call (different model/config) reviewing the draft against the contract, visible in the trace | M5 (parallel to M6-M7 if needed) | The fixture's seeded error is caught by the Critic and appears in the trace. Fallback ready: adversarial self-check with the same model | ✅ |
| M9 | **Cycle closure**: contract visible at start, Accept/Redirect verdicts, final PRD re-identification, JSON+Markdown export | M7+M8 | Complete E2E against the fixture: one full Flux Cycle with no manual intervention outside the flow's clicks. The final PRD has the REAL data | ✅ |
| M10 | **On-device Gemma**: MediaPipe + Gemma 3 behind `PseudonymizerPort` | M9 (not before!) | The SAME M2 tests pass with Gemma as the implementation. If WebGPU fails → the port falls back to regex only, without touching anything else | ✅ |
| M11 | **Hardening + submission**: error handling, cached Vultr responses, README linking to `framework-docs/`, deploy, video | M9 (M10 if it landed) | Clean checkout + README = running app. Video recorded. The E2E passes one last time | ✅ |

## Post-MVP — Iteration 2 (supervision + LLM tools)

| # | Deliverable | Depends on | Validation gate | Status |
|---|---|---|---|---|
| I2a | **Redirect with replan**: `supervisor_note` in the API, session `revision` + `redirect_notes`, replan with correction steps, `EPIC-SUP-0N` epic | M9 | Redirect from the UI → a second, different PRD (`revision 2` in the title). Trace keeps the previous run | ✅ |
| I2b | **Editable note in the UI**: textarea in `ValidationPanel` before Redirect | I2a | The user's note reaches the backend and appears in the plan + `REQ-SUPERVISOR` requirements | ✅ |
| I2c | **`score_risks_llm` + `estimate_effort_llm`**: `backend/app/tools/llm_tools.py`, reinforced prompting (role, schema, hard rules, few-shot, contract) | M5 | Trace shows `engine: vultr`, `prompt_version`, `reinforcement`. 18 backend tests passing | ✅ |
| I2d | **`extract_requirements_llm`**: optional post-baseline-regex enrichment | M4 | `extract_requirements_llm` trace event when the LLM adds requirements | ✅ |

## Post-MVP — Iteration 3 (full supervision)

| # | Deliverable | Depends on | Validation gate | Status |
|---|---|---|---|---|
| I3a | **Plan approval checkpoint**: pause after Plan, `POST /api/cycle/approve-plan` | I2 | Without approve → zero `tool_call`s in Network; after approve → execute | ✅ |
| I3b | **Completion report**: clause-by-clause diff vs. the contract in the Critic | M8 | Golden fixture shows ≥1 `unmet` clause (Q1 2027 deadline); no auto-fix. **Confirmed in practice after a fix** — see "Post-iteration-3 hardening" below; a regression had let a silent correction run before the Critic ever saw the draft, which this gate should have caught earlier | ✅ |
| I3c | **Reject verdict**: returns to upload, no replan | M9 | Reject doesn't relaunch the cycle | ✅ |
| I3d | **Precedent in Plan**: injected into the prompt + trace | M7 | 2nd run: status + `precedents_in_plan` in the plan event | ✅ |

### Key files (iteration 3)

```
backend/app/cycle/completion_report.py   — Slippage Protocol completion report
backend/app/cycle/orchestrator.py        — plan pause/resume, _execute_from_plan
backend/app/main.py                      — /api/cycle/approve-plan
frontend/components/PlanApprovalCard.tsx
frontend/components/CompletionReportPanel.tsx
frontend/components/ValidationPanel.tsx  — Reject + completion table
```

```
backend/app/tools/llm_tools.py       — reinforced prompts + LLM score/estimate
backend/app/cycle/orchestrator.py    — redirect pipeline + LLM tools
backend/app/session/store.py         — revision, redirect_notes
frontend/components/ValidationPanel.tsx — redirect note
frontend/app/page.tsx                — startCycle({ supervisorNote })
```

### Vultr models (team's current configuration)

| Role | Env var | Typical model |
|---|---|---|
| Executor (Plan + LLM tools) | `VULTR_EXECUTOR_MODEL` | `nvidia/Nemotron-Cascade-2-30B-A3B` |
| Critic | `VULTR_CRITIC_MODEL` | `nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16` |

## Post-iteration-3 hardening (found and fixed during a code review pass)

A round of independent code review (comparing the implementation against `framework-docs/` and this build order) surfaced four issues, all fixed and re-verified end to end via Playwright:

| # | Issue found | Fix | Files |
|---|---|---|---|
| H1 | Escalation trigger was regex-only (`detect_planted_ambiguity`); the LLM's own `triggers_escalation` risk signal was computed but never consulted | `_payment_escalation_evidence` reads `triggers_escalation` from `score_risks_llm`'s output as a second, OR'd trigger alongside the regex — the regex still wins when it matches, keeping the golden path byte-identical | `backend/app/cycle/orchestrator.py` |
| H2 | Vultr usage was invisible in the default UI — the `engine` field was computed in trace events but never rendered, and the debug ping panel was the only place showing Vultr connectivity | `TracePanel.tsx` renders a Vultr/partial/local-fallback badge on `plan`, `tool_call`, and `critic` events, in the default (non-debug) expanded trace view | `frontend/components/TracePanel.tsx`, `backend/app/cycle/orchestrator.py` |
| H3 | Three of four LLM system prompts (`SCORE_RISKS_SYSTEM`, `ESTIMATE_EFFORT_SYSTEM`, the Critic's inline prompt) leaked the exact golden-fixture scenario (payment-model wording, "Q3 2026 vs Q1 2027") into hard rules and few-shot examples — meaning the model wasn't genuinely reasoning on the demo brief, it was pattern-matching against a near-identical example | Rewrote the three prompts with general principles and few-shot examples from unrelated domains (healthcare hosting, logistics carrier API); the Critic now cross-checks the draft against the `ACCEPTANCE_CONTRACT` JSON it already receives instead of naming fixture specifics | `backend/app/tools/llm_tools.py`, `backend/app/cycle/orchestrator.py` |
| H4 | `_inject_planted_error` seeded the Q1 2027 error, but `_correct_planted_deadline` silently scrubbed it **before** `_run_critic` ever saw the draft — on every run, unconditionally. This meant the Critic never actually caught anything and Validate always showed 6/6 on the first pass, contradicting I3b's own gate | The correction call is now gated on a supervisor Redirect `note` being present. First pass: the Critic sees the real error, Validate shows 5/6 with the deadline clause `unmet` and a genuine Critic finding. Only a Redirect (revision 2) applies the correction and flips it to 6/6 | `backend/app/cycle/orchestrator.py` (`_inject_planted_error`, `_correct_planted_deadline` call sites) |

Also discovered and fixed along the way: exported filenames (`prd.md`, `prd-jira.json`) needed a Blob URL instead of a `data:` URI to reliably keep their names in Chrome (`frontend/lib/downloadFile.ts`); the Vultr executor model needs `enable_thinking=False` for rubric-driven structured-output calls (`score_risks_llm`, `estimate_effort_llm`, plan generation) to reliably finish within its token budget instead of spending it all on chain-of-thought — confirmed empirically against the live API, same model, ~9x faster and reliable once the parameter is set explicitly (`backend/app/llm/vultr.py`, `backend/app/tools/llm_tools.py`); the plan-generation call used a bare `json.loads()` with no fence-stripping, causing an observed ~12.5% failure rate on markdown-fenced responses — fixed with a small tolerant parser (`backend/app/cycle/orchestrator.py`, `_strip_json_fences`).

## Ordering decisions that matter (the why)

- **Gemma comes LAST (M10), not in the middle.** It's the highest technical-risk piece, and the app NEVER depends on it directly — it depends on the port. With M2's regex, the full E2E works from M9 onward; Gemma only improves the port's implementation. If Gemma eats its budget, it gets cut without touching a single line elsewhere. (In `product.md`'s original plan it was hours 18–26 by time budget; this order moves it after the E2E — the hour budget stays the same, only the integration priority changes.)
- **The trace schema (M4) is defined before the pipeline grows.** Everything after (tools, escalation, critic, verdicts) only EMITS new events of the same type — the UI is never rewritten.
- **Escalation (M6) before precedent (M7) and critic (M8):** it's a hard dependency — a precedent IS an answered escalation, and the critic is inserted into a pipeline that already knows how to pause.
- **LLM tools (I2c) after the E2E:** the deterministic MVP guaranteed demo gates; iteration 2 replaces the main risk/estimation path with Vultr without touching pseudonymization or the boundary.
- **Pseudonymization round-trip as a unit test (M2), not visual:** it's the privacy guarantee for the ENTIRE product; if this is wrong, the whole pitch is false. It's proven with code, not with eyes.
- **A partial demo is always recordable:** M3 alone is already the privacy moment of the video; M6 alone is already the methodology moment. I2a adds the redirect moment for the Cursor pitch. The post-iteration-3 hardening (H4) makes the Validate 5/6→Redirect→6/6 loop the strongest single beat.

## Anti-rules (forbidden during the build)

- Forbidden to start M(n+1) with M(n)'s gate red "to save time."
- Forbidden to touch the `TraceEvent` schema after M4 (adding new types is fine; changing existing ones is not).
- Forbidden to integrate Gemma outside `PseudonymizerPort` "because it's faster."
- Forbidden to build features outside `product.md` §11 before hour 45.
