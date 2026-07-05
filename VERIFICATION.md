# Verification guide — check the claims yourself

This project makes a few claims that matter for the Vultr track and are easy to dismiss as "probably staged" without a pointer to the exact proof. This doc exists so a judge with a few minutes can verify each one directly in the code, instead of taking our word for it.

## Claim 1 — the escalation is not a scripted trigger; it's a real dual signal

The escalation that pauses the cycle ("Payment model for the licensing module") fires from **two independent signals**, not a single hardcoded check:

- A regex match on the brief's masked text: `tools.detect_planted_ambiguity(masked_text)` — `backend/app/cycle/orchestrator.py:559`
- The LLM's own risk assessment: `_payment_escalation_evidence(risks, requirements)` — `backend/app/cycle/orchestrator.py:75-91`, reading the `triggers_escalation` field that `score_risks_llm` computes per requirement (`backend/app/tools/llm_tools.py`, `SCORE_RISKS_SYSTEM` prompt — see Claim 3 for why that prompt can't just be pattern-matching the demo brief).

Either signal alone is enough (`orchestrator.py:561`: `evidence = ambiguity["evidence"] if ambiguity else llm_evidence`). Upload a brief with a *different* wording of the same kind of unresolved either/or decision and the LLM path can still trigger it even if the regex doesn't match.

## Claim 2 — the Critic genuinely catches the planted error; the fix is not silent

The golden demo fixture deliberately seeds a wrong deadline ("Q1 2027" instead of the contract's "Q3 2026") so there's something concrete for the Critic to catch — this is intentional test-fixture design, documented in `docs/build_order.md`'s golden-fixture principle, not an attempt to hide a bug.

What matters is what happens to it:

- `_inject_planted_error(prd)` seeds it unconditionally — `orchestrator.py:147-163`
- `_correct_planted_deadline(prd)` is the only thing that removes it, and it is called **only when a supervisor Redirect note is present** — `orchestrator.py:556-558` and `:684`. There is no unconditional or silent correction path; grep the file for `_correct_planted_deadline` and confirm both call sites are inside an `if note:` guard.
- `_run_critic` (`orchestrator.py:294`) and `deterministic.detect_planted_error` genuinely see the seeded error on the **first pass** (no note yet). `build_completion_report`'s `_deadline_clause` (`backend/app/cycle/completion_report.py:42-54`) reports it as `unmet`.

**What you'll see running the demo:** first Validate screen shows **5/6 clauses met**, deadline row `Unmet`, with a real Critic finding naming the exact story and date mismatch. Only after clicking **Redirect** with a note does the cycle re-plan, apply the correction, and Validate shows **6/6**. Automated proof: `backend/tests/test_supervisor_redirect.py` and `backend/tests/test_cycle.py`.

## Claim 3 — the LLM prompts don't leak the demo scenario (so success isn't just pattern-matching)

Check `backend/app/tools/llm_tools.py`:
- `SCORE_RISKS_SYSTEM`'s few-shot example is about patient-records hosting (on-premise vs third-party cloud), not payment models.
- `ESTIMATE_EFFORT_SYSTEM`'s few-shot is a logistics carrier API integration, not SSO/Okta.
- The Critic's prompt (`backend/app/cycle/orchestrator.py`, inside `_run_critic`) instructs cross-checking the draft against the `ACCEPTANCE_CONTRACT` JSON it's given at runtime — it does not name "Q1 2027" or "payment model" anywhere in its instructions.

None of the three hard-code the golden fixture's specific wording. The hard rules state general principles (e.g. "two or more mutually exclusive options with no stated choice that materially affects architecture/cost/scope → high ambiguity"), which is why the same logic should generalize to a brief with different wording — that's what Claim 1's dual-signal design depends on.

## Claim 4 — Vultr usage is visible in the default UI, not hidden behind a debug flag

`frontend/components/TracePanel.tsx:24-28` renders a badge (`Vultr` / `Vultr · partial` / `local fallback` / `local`) on `plan`, `tool_call`, and `critic` trace events (`:64`, `:75`, `:80-83`). This is the default expanded trace view shown while the cycle is running or done — not something behind `?debug=1` (that flag only reveals an extra Vultr-connectivity ping panel, unrelated to the badges). Run the demo and watch which steps say `Vultr` vs `local fallback`; that's genuinely which calls succeeded against the live API in that run, not a fixed label.

## Claim 5 — it's a real agent loop, not "basic RAG"

Plan (LLM, human-approved before execution) → 3 targeted retrievals per epic → 4+ tool calls (`extract_requirements`, `score_risks_llm`, `estimate_effort_llm`, `export_structured`) → a checkpoint that pauses the whole cycle for a human decision → a second LLM (different model) reviewing the draft against a machine-checkable contract → a human-directed re-plan loop (Redirect). See `backend/app/cycle/orchestrator.py`'s `run_cycle_stream` for the full sequence, and `backend/tests/test_cycle.py` / `test_plan_approval.py` for automated proof each stage behaves as described.

## If a Vultr call shows "local fallback" in your run

That's expected and documented, not a bug: Vultr's reasoning-heavy models occasionally spend their whole token budget on internal chain-of-thought before writing a final answer, hitting the model's completion limit before emitting valid JSON. See `backend/app/llm/vultr.py` and the "Post-iteration-3 hardening" section of `docs/build_order.md` for the empirical investigation (including the `enable_thinking` parameter that fixes most of it) — the badge is designed to show this honestly rather than hide it.
