> **Internal design log, published for transparency.** This is the working product-scope document written before and during the build — not judge-facing marketing copy. It's kept public (unlike the other files in `docs/`) because the reasoning behind scope cuts, pivots, and priority calls is itself evidence of engineering judgment. For a judge-facing summary, see [`SUBMISSION.md`](../SUBMISSION.md); for proof that the claims below are real and not staged, see [`VERIFICATION.md`](../VERIFICATION.md).

# AGENT FLUX — Product Definition v1.3

> Definitive pre-code document → **updated post-MVP + iteration 2 + iteration 3 hardening** (5 jul 2026). RAISE Summit Hackathon 2026 (7–9 July, remote, team of 1).
> Replaces the scope of `idea.md`. Pivots relative to the initial proposal are marked with ⚠️ PIVOT.
> **v1.3** — M0–M11 implemented in `main`. Iteration 2: redirect with replan, risk/estimation tools via Vultr (reinforced prompting), LLM requirement enrichment. Iteration 3: plan-approval checkpoint, completion report (Slippage Protocol), Reject verdict, precedent-in-plan. Post-iteration-3 hardening: real LLM-driven escalation trigger (not regex-only), Vultr engine visibility in the default trace UI, generalized LLM prompts (no demo-fixture leakage), and the Critic genuinely catching the planted deadline error (fixed via supervisor Redirect, not silently auto-corrected).

---

## 1. One-liner

**AGENT FLUX** — From client brief to execution-ready PRD, through a human-supervised agent pipeline. Sensitive data never leaves the device.

*Positioning:* the product is the **reference implementation** of the Agent Flux framework (`framework-docs/`, public in the same repo). The demo shows **one complete Flux Cycle end to end** — Frame → Plan → Execute → Checkpoint → Validate → Integrate. No other team shows up with a documented 9-piece framework backing their demo; that's the edge.

---

## 2. Pivots relative to the initial proposal

### ⚠️ PIVOT 1 — The HR flow is ELIMINATED (non-negotiable)
The hackathon's automatic-disqualification list includes **"Job application screeners."** The HR flow (upload CVs → rank candidates → shortlist) IS exactly that. Presenting it disqualifies the entire project, not just that flow. Out.

### ⚠️ PIVOT 2 — The Developer flow becomes a stretch goal (likely won't be built)
"Upload a doc → ask a question → get an answer with references" is the definition of a **"Basic RAG application,"** another automatic-disqualification cause. Even with added tools, the demo's visual pattern reads as RAG. Unnecessary risk. If time allows (it won't), redesign it; otherwise, mention it as roadmap.

### ⚠️ PIVOT 3 — One core flow only: PM, but deep
With 48h and one person, 3 flows = 3 broken features. One flawless flow with a visible agent trace beats three mediocre ones (Demo = 50% of the score). All time goes to the PM flow.

### ⚠️ PIVOT 4 — The "agentic SCRUM" thesis stops being marketing and becomes a demonstrable feature
The methodology isn't pitched as an abstract concept: it materializes as **human supervision checkpoints** inside the agent's run. The PM doesn't execute — they approve, correct, and redirect the agent at decision points. That IS the "agentic cycle" (execute → validate → iterate) made product. It's also the "interactive solution" the Cursor track asks for, without depending on voice.

### ⚠️ PIVOT 5 — Voice becomes a stretch goal
The Web Speech API is quick to integrate but fragile in a demo (microphone, accents, browser permissions). The core interactivity comes from the checkpoints. Voice gets added in the final hours only if the core is bulletproof.

### ⚠️ PIVOT 6 — Explicit track prioritization
1. **Vultr (primary)** — the product is built to match its problem statement.
2. **Cursor (secondary)** — a real workflow problem + an interactive solution. A natural fit.
3. **DeepMind Remote (tertiary/opportunistic)** — on-device Gemma is load-bearing (the privacy layer), but the product isn't 100% offline because reasoning lives on Vultr. Presented honestly: "on-device inference IS the privacy guarantee." If DeepMind's judges prefer fully local apps, that track is lost without affecting the other two.

---

## 3. User and problem

**User:** Product Manager at an IT consultancy.

**Problem:** The PM receives client briefs (messy PDFs, emails, meeting notes) with confidential information (names, budgets, NDAs) and must turn them into executable specs: epics, stories, acceptance criteria, risks, estimates. Today that takes hours, and **they can't use ChatGPT/Claude because corporate policy prohibits uploading client documents to third-party cloud services**.

**Insight:** the blocker isn't AI capability — it's privacy. If you separate "what's sensitive" (stays on the device) from "the structure of the problem" (travels anonymized), you unblock the whole use case.

---

## 4. Architecture

```
┌─────────────────────── DEVICE (browser) ───────────────────────┐
│                                                                  │
│  1. Upload brief (PDF/text)                                     │
│  2. Gemma 3 (on-device, WebGPU via MediaPipe LLM Inference)      │
│     → detects sensitive entities (names, companies, amounts,     │
│       emails, contract data)                                     │
│     → PSEUDONYMIZES with typed placeholders:                     │
│       "Acme Corp" → [CLIENT_1], "$120,000" → [BUDGET_1]          │
│     → keeps the mapping table LOCAL (never transmitted)          │
│  3. BOUNDARY REVIEW ("Review what leaves your device"):          │
│     the user SEES the anonymized text side by side with the      │
│     original and approves before a single byte leaves the browser│
│                                                                  │
└──────────────┬───────────────────────────────▲───────────────────┘
               │ pseudonymized text only        │ PRD with placeholders
               ▼                               │
┌─────────────────────── BACKEND (FastAPI) ────┴───────────────────┐
│                                                                    │
│  Flux Cycle on Vultr Serverless Inference                          │
│  PLAN (Planner, LLM) → EXECUTE (retrievals + LLM/hybrid tools)     │
│    → CHECKPOINT (4-part escalation) → CRITIC review → VALIDATE     │
│  Human Redirect → replan with supervisor note (iteration 2)        │
│  Full trace streamed to the frontend in real time                  │
│                                                                    │
└─────────────────────────────────────────────────────────────────────┘

  4. Back on the device: RE-IDENTIFICATION — the PRD's placeholders
     are replaced with real data using the local mapping table.
     The cloud never knew the names; the user gets the complete PRD.
```

**Why this isn't decorative:** on-device Gemma is load-bearing — without it there is no local pseudonymization, and without pseudonymization the use case is illegal for the user. Local re-identification closes the loop: the final output has the real data without the cloud ever having seen it. (This is the framework's privacy boundary, implemented literally.)

**Feasibility verified (Jul 2026):**
- WebGPU enabled by default in Chrome, Firefox, Edge, and Safari since Nov 2025 (~83% global coverage).
- MediaPipe LLM Inference API supports Gemma in-browser; Gemma 3 270M/1B are adequate for NER + pseudonymization (an extraction task, not a reasoning task).
- transformers.js v4 (Feb 2026) as an alternative, WebGPU backend.

---

## 5. The agent (Vultr) — one complete Flux Cycle, why it is NOT "basic RAG"

The run implements the framework's canonical cycle — **Frame → Plan → Execute → Checkpoint → Validate → Integrate** — with the 3 agent roles (Planner, Executor, Critic). All visible in the trace:

1. **Frame (implicit + contract):** the PRD template IS the **acceptance contract** — the checklist of clauses the output must satisfy (epics with acceptance criteria, scored risks, sized estimates). Shown on screen at the start: the user knows up front what it will be validated against.
2. **Plan (Planner):** the agent produces an explicit plan (which brief sections to analyze, in what order, which tools it will need) before executing.
3. **Execute (Executor) — multiple targeted retrievals:** not a single embedding search; the agent goes back to the brief N times with different queries depending on what each epic needs.
4. **Tool calls (executor — current state after iteration 3):**

   | Tool | Engine | What it does |
   |---|---|---|
   | `extract_requirements` | Deterministic (regex) | Segments the brief into atomic requirements with a source-section reference — an auditable baseline |
   | `extract_requirements_llm` | Vultr (Executor) | Enriches with up to 3 requirements the regex missed; includes redirect context when applicable |
   | `score_risks_llm` | Vultr (Executor) | Scores ambiguity, external dependency, and complexity with **reinforced prompting** (JSON schema, hard rules, generic-domain few-shot, acceptance-contract context). `triggers_escalation` from this call is a real second signal for the escalation trigger (alongside the regex match), not decorative. |
   | `estimate_effort_llm` | Vultr (Executor) | Assigns S/M/L/XL sizes and stories with criteria; receives risks + supervisor note on revisions |
   | `retrieve_from_brief` | Deterministic | Keyword overlap — targeted retrieval, no embeddings |
   | `build_epics` | Deterministic | Groups requirements into epics by section |
   | `export_structured` | Deterministic | Serializes the PRD to Jira/Linear JSON + Markdown |
   | `apply_supervisor_redirect` | Deterministic | Injects an `EPIC-SUP-0N` epic/story when the human chooses Redirect |

   **Fallback:** without `VULTR_API_KEY`, or if the LLM call fails, deterministic `score_risks` / `estimate_effort` cover the pipeline (local tests). With Vultr configured, the trace shows an `engine: vultr` badge (or `partial` / `deterministic_fallback` when a call falls back) and `prompt_version: flux-tools-v2-reinforced`. The badge renders in the **default UI** (`TracePanel.tsx`), not hidden behind a debug flag — a judge sees exactly which decisions were genuinely made by Vultr.

   **Gemma does NOT generate the PRD** — it only enriches on-device pseudonymization (NER) behind `PseudonymizerPort`.

5. **Checkpoint — 4-part escalation:** on critical ambiguity (detected from the brief's text AND from the LLM's `triggers_escalation` risk signal — a dual trigger, not regex-only), the agent PAUSES and escalates with the framework's canonical format: **blocked decision + evidence (exact brief excerpt) + options with implications + proposed default**. The PM can accept the default in ONE click or pick another option.
6. **Precedent:** the answered escalation is recorded in the session and shown as a UI chip — *"Recorded as precedent — this question won't be asked again."* If the brief triggers the same ambiguity again, the agent applies the precedent and says so in the trace.
7. **Critic review — genuinely catches errors, not theater:** before the human sees the PRD, a **Critic** (a second Vultr call with a different model than the Executor) reviews it against the contract: unresolved decisions, contradictions, uncovered clauses. The golden fixture plants a wrong Phase 2 deadline (Q1 2027 instead of Q3 2026); on the first pass the Critic genuinely catches it — the completion report shows **5/6 clauses met** with the deadline marked `unmet`, and the Critic's own finding names the exact story and date mismatch. The fix is **not** a silent auto-correction: it only happens when the supervisor sends a **Redirect** note, which re-plans and re-executes with that correction applied — after which Validate shows **6/6**. This is the framework's critic-diversity principle and the Slippage Protocol's "done is arithmetic, not a checkbox," both made real and testable, not narrated.
8. **Validate — Accept, Redirect, or Reject:** the PM validates the PRD against the contract.
   - **Accept** closes the cycle (only sensible once the contract is genuinely satisfied).
   - **Redirect** sends an editable note to the backend (`supervisor_note`), bumps `revision`, re-plans with correction steps, re-runs the LLM tools, and produces a different PRD (`Client Brief PRD — revision 2`, `EPIC-SUP-02` epic). This is how the planted deadline error actually gets fixed — not automatically, but as a direct, visible consequence of human feedback. The trace keeps the previous run.
   - **Reject** returns to upload without replanning — for when the frame itself (not just the output) is wrong.
9. **Integrate — actionable outcome:** a structured PRD, re-identified locally, exportable (Jira/Linear JSON + Markdown) — not a chat transcript.

**The trace is first-class UI:** every step (plan, retrieval, tool call, escalation, critic, verdict) renders live in a side panel, each LLM-backed step carrying a visible engine badge (Vultr / partial / local fallback). This is simultaneously: proof of a "real agent" for Vultr, the interactive experience for Cursor, and the most photogenic moment of the demo.

---

## 6. Demo flow (the 1-minute video)

1. (0–10s) The PM drags in the client brief. "This document has NDAs and budgets — it can't go to ChatGPT."
2. (10–25s) Gemma pseudonymizes on-device. **Boundary review** ("Review what leaves your device"): original vs. anonymized, entities highlighted. Click to approve. **Key privacy-pitch moment.**
3. (25–45s) The Flux Cycle runs: visible plan (with a Vultr engine badge), retrievals, tool calls in the trace. Pauses on a **4-part escalation**: "Requirement X is ambiguous — one-time or subscription? Evidence attached. Default: subscription." The PM accepts the default in ONE click; the *"Recorded as precedent"* chip appears. **Key methodology moment — this IS Agent Flux.**
4. (45–60s) Validate shows **5/6** — the Critic genuinely caught the planted deadline error, no auto-fix. The PM clicks **Redirect** with a one-line note. Second pass: **6/6**. **Accept** → re-identification + export. Close: *"One full Flux Cycle — with a real human correction loop when the draft isn't good enough. Not a single sensitive byte left the device."*

---

## 7. 48h scope (execution plan only)

**Status (5 Jul 2026):** M0–M11 ✅ in `main`. Iteration 2 ✅ (redirect + LLM tools). Iteration 3 ✅ (plan-approval checkpoint, completion report, Reject verdict, precedent-in-plan). Post-iteration-3 hardening ✅ (real escalation trigger, Vultr visibility, generalized prompts, genuine critic-catch).

The integration order with per-milestone validation gates lives in `docs/build_order.md` (M0–M11 + post-MVP). The structural decision held: **Gemma was integrated last (M10)** behind `PseudonymizerPort`; the model is bundled in `frontend/public/models/` (~249MB, gitignored).

| Block | Hours | Milestones | Deliverable |
|---|---|---|---|
| Setup + skeleton | 0–4 | M0–M1 | Next.js + FastAPI + hello-world against Vultr (validate credentials NOW — confirm ≥2 models for Executor/Critic) + PDF upload with text extraction |
| Privacy v1 | 4–8 | M2–M3 | Local regex/NER pseudonymizer behind `PseudonymizerPort` + mapping table + re-identification (**unit round-trip test**) + boundary review UI (nothing crosses the network before the click) |
| Flux Cycle pipeline | 8–22 | M4–M8 | `TraceEvent` schema + live SSE trace → Plan → 4 tools with multiple retrievals → 4-part escalation with default → session precedent → Critic (2nd call, different model/config) |
| Cycle closure + UI | 22–30 | M9 | Contract visible at start, Accept/Redirect buttons, final PRD re-identification, JSON+Markdown export, PRD render, precedent chip |
| On-device Gemma | 30–36 | M10 | MediaPipe + Gemma 3 (270M or 1B) as a drop-in behind `PseudonymizerPort`. **M2's tests must pass identically.** If WebGPU fails → the port falls back to regex only |
| Demo hardening | 36–40 | M11 | Error handling, pre-loaded golden fixture, cached responses in case Vultr goes down live |
| Submission | 40–46 | M11 | README (what it is, how to run it, `.env.example`, known issues, link to `framework-docs/`), deploy, **record the video early** |
| Buffer | 46–48 | — | Polish only. Zero new features. |

**Cutoff rule:** any block that exceeds 50% of its budget degrades to its fallback and moves on. **Gate rule:** no milestone starts with the previous one's gate red (`docs/build_order.md`).

### 24h fallback plan (if time shrinks)

Thanks to the integration order, the cutback is natural: **milestones get cut from the end.** Sacrifice order: (1) on-device Gemma → simply skip M10 integration and keep `PseudonymizerPort`'s regex pseudonymizer (loses the DeepMind track, keeps the privacy narrative — ZERO refactor), (2) Critic with a different model → self-check with the same model and an adversarial prompt (loses critic diversity, keeps the visible trace step), (3) re-planning checkpoint → approve-only checkpoint, (4) Jira export → Markdown only. **Never sacrificed:** the visible trace, the boundary review, or the escalation-with-default — they are the framework on screen.

---

## 8. Risks and mitigations

| Risk | Prob. | Mitigation |
|---|---|---|
| Gemma 270M/1B pseudonymizes poorly (misses entities) | Medium | Hybrid pipeline: deterministic regex/NER pass + Gemma as reviewer. The review screen puts the human as the last line — turns the flaw into a feature |
| Vultr Serverless Inference slow/down during recording | Medium | Cached responses from the demo run; record the video as soon as the flow works once |
| Model download (0.5–1GB) ruins the first impression | High | Preload with a progress bar on app open; model cached in OPFS; demo recorded with a warm cache |
| Vultr judges read it as RAG | Low (post-pivot) | The trace with plan + 4 tools + human-escalated decision is the evidence; the README makes it explicit with a loop diagram |
| Scope creep (voice, Dev flow) | High (know ourselves) | This document IS the scope contract. Stretch goals only from hour 45 onward |
| Reasoning-heavy Vultr models silently degrade structured-output reliability | Medium (confirmed in practice) | `enable_thinking=False` for rubric-driven tool calls (score_risks, estimate_effort, plan) where the prompt's hard rules already remove the need for deliberation; `enable_thinking=True` explicit for the Critic's more open-ended judgment. Both empirically verified against the live API. Engine badges in the trace make any residual fallback honest and visible instead of hidden. |

---

## 9. Validation "putting myself in the agent's shoes"

If I were the agent receiving the pseudonymized brief, can I do my job well?

- ✅ **Yes, if the pseudonymization is typed and consistent.** `[CLIENT_1]`, `[BUDGET_1]`, `[DEADLINE_1]` preserve semantic structure: I know there's a client, a budget, and a date, and I can reason about their relationships without knowing the values. Redacting with `███` instead would leave me blind — that's why the contract is **pseudonymize, don't censor**.
- ✅ **Yes, if I can go back to the document.** Multiple targeted-query retrievals let me go deep per epic instead of depending on a single truncated context.
- ✅ **Yes, if I'm allowed to not know.** The escalation checkpoint removes the pressure to hallucinate under ambiguity: I ask, and continue. This is what most raises output quality.
- ⚠️ **Honest weak point:** if the brief heavily depends on exact amounts to prioritize (e.g. "epic A only if budget exceeds X"), the placeholder limits me. Mitigation: numeric placeholders preserve order of magnitude and currency (`[BUDGET_1: ~low-6-figures USD]`) — anonymity without losing decision-making capacity. This convention lives in the pseudonymization contract.

**Verdict as the agent:** the design suits me well. The typed-placeholder-with-magnitude contract is the piece that makes the whole system work — it's the first thing to test against real documents.

---

## 10. Answers to `idea.md`'s open questions

1. **Is on-device Gemma feasible in 48h?** Yes, verified (WebGPU default in all 4 browsers since Nov 2025; MediaPipe LLM Inference supports Gemma on the web). Real risk: pseudonymization quality with small models → hybrid pipeline + human review.
2. **Which flow maximizes score?** PM, single core. HR disqualifies; Dev smells like RAG.
3. **How to avoid "basic RAG"?** Explicit plan (LLM) + multiple targeted retrievals + tools (reinforced-prompting LLM + deterministic baseline) + human-escalated decisions + redirect with replan + visible trace. Section 5.
4. **Is the agentic-SCRUM thesis a feature or a vision?** Both — and it evolved: the methodology IS a public 9-document framework (`framework-docs/` in the repo) and the product is its reference implementation. It materializes as checkpoints/escalations/precedents (demonstrable features) and is narrated in the pitch as "one full Flux Cycle."
5. **Disqualification risk?** Yes, two: HR = job screener (eliminated) and Dev = basic RAG (demoted to stretch). Post-pivot, no known red flags.
6. **Name and one-liner?** AGENT FLUX stands. One-liner in section 1.
7. **Priority if only 24h remain?** Fallback plan in section 7. Untouchable: the agent trace + review-before-send.

---

## 11. Stretch goals (only from hour 45, in order)

1. ~~**Redirect with replan**~~ ✅ iteration 2 — supervisor note → replan + PRD revision N
2. ~~**Reinforced-prompting LLM tools**~~ ✅ `score_risks_llm`, `estimate_effort_llm` (`backend/app/tools/llm_tools.py`)
3. ~~**Critic completion report**~~ ✅ iteration 3 — clause-by-clause PRD-vs-contract diff (`backend/app/cycle/completion_report.py`), and confirmed to genuinely flip from 5/6 to 6/6 only via a real supervisor Redirect
4. Voice interaction over the generated PRD (Web Speech API)
5. "Paste text" brief mode in addition to PDF *(partial — Load demo brief exists)*
6. Developer flow redesigned as an agent (not Q&A)

## 12. Out of scope (explicit)

- HR flow / anything touching CVs or candidate screening
- Authentication, multi-tenancy, user persistence
- Gemma fine-tuning
- Mobile
