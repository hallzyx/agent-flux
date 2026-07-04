# The Transition Guide — An Executive Playbook

**This is the executive's side of adopting Agent Flux: what you decide, what you fund, what you say to your people, and how you kill the pilot if it fails.** The pod-level mechanics live in [Adoption & Metrics](06-adoption-and-metrics.md); this document covers everything that happens above the pod — because the transition succeeds or dies at your level, not theirs.

The transition is deliberately boring: one workflow, one pod, one quarter, hard gates. Nothing here requires stopping Scrum, reorganizing, or announcing a transformation program. That is the point.

## Readiness check (before spending anything)

Answer these five with evidence, not optimism. Two or more "no" answers means you are not ready — fix those first; they cost less than a failed pilot.

- [ ] **A candidate workflow exists**: document-grounded, high-frequency, painful, and currently blocked from AI leverage by confidentiality
- [ ] **"Done" is definable**: your best domain expert can write a checkable acceptance contract for that workflow's output in under a day
- [ ] **A supervisor exists**: a respected senior domain expert willing to judge work instead of producing it — and their manager will protect that time
- [ ] **An agent engineer exists**: one engineer who can own agents, tools, and telemetry (full-time for the pilot quarter)
- [ ] **You can make the three commitments below** — in writing, before the pilot starts

## The three commitments

These are the executive's contribution to the methodology. Each one has a failure mode with your name on it.

| Commitment | What it means | What happens if you break it |
|---|---|---|
| **1. Metrics never touch individuals** | Cycle metrics diagnose the system, pod-level only. No scorecard, no bonus linkage, no exceptions | Concealment behaviors return within two quarters — you rebuild Scrum's 11pm ticket-shuffle inside Flux |
| **2. Fund the slow start** | Stage 1 (L0 trust) *feels* slower than the demo promised. That is the cost of the track record that justifies later autonomy | Pressure to skip probation grants unearned trust; the first silent error in production discredits the entire program |
| **3. No big-bang, no decree** | Adoption spreads workflow by workflow on evidence. You sponsor; you do not mandate | Teams comply theatrically, the methodology gets blamed for the rollout, and you lose the option to try again |

## The transition, phase by phase

Phases align with the stages in [Adoption & Metrics](06-adoption-and-metrics.md). Each has an executive action list and a **gate** — checkable criteria to fund the next phase. No gate, no next phase; that discipline is what makes this transformation credible where others became slideware.

### Phase 0 — Selection (week 1) · cost: days of attention

**Your actions:** pick the pilot workflow with the pod, not for it. Resist the political choice (the CEO's pet process) and the trophy choice (the hardest problem in the company). The right pilot is *boring, frequent, and measurable* — brief-to-spec, contract review, report drafting.
**Gate to Phase 1:** acceptance contract written and signed off by the domain expert; baseline measured (current cycle time, current rework, current human-hours per output). **No baseline, no pilot** — without it you will be arguing about anecdotes in month three.

### Phase 1 — Probation pod (weeks 2–6) · cost: 3 people part-to-full-time + platform

**Your actions:** shield the pod from delivery pressure (their job this quarter is calibration, not throughput); receive the weekly one-page cycle analytics; say publicly that slower-than-demo is expected and funded.
**Gate to Phase 2:** escalations read like good questions; acceptance audit running; at least one agent × task-type pair has the data trail to justify L1; supervisors report the checkpoint rhythm is workable.

### Phase 2 — Earned autonomy (months 2–4) · cost: same pod, rising throughput

**Your actions:** watch two numbers only — **human-minutes per accepted output** (the cost curve) and **defect escape rate** (the trust curve). Ignore demos and vibes; these two are the pilot. Begin the second workflow's readiness check now, not after.
**Gate to Phase 3:** the quarter checklist in [Adoption & Metrics](06-adoption-and-metrics.md#what-working-looks-like-after-one-quarter) passes — including the one most executives skip: compliance has seen a boundary review and a trace, and signed off in writing.

### Phase 3 — Spread (month 4+) · cost: scales linearly with pods

**Your actions:** new workflows get new pods seeded with one veteran from the pilot; the Agent Engineer role becomes a platform function; firm-level precedent curation gets an owner. Scrum teams keep running — the seam is managed as described in Stage 3 of the adoption path, and each team migrates when *its* workflow passes a readiness check, not when a memo says so.

## The people conversation

The transition fails silently if your people believe it is a headcount program. Have the conversation early, honestly, and in this order:

1. **What changes:** roles move up the stack — from producing artifacts to framing, judging, and directing. Seniority becomes *more* valuable, not less: judgment is the scarce resource, and your experts have the most of it.
2. **What you can point to:** supervisors keep authorship (validation *is* the decision-making), juniors train through the residency model ([Roles](03-roles.md#growing-supervisors)), and the metrics governance means nobody's dashboard becomes a surveillance tool — commitment 1, in writing.
3. **What you don't promise:** that nothing changes. Work changes shape. The honest pitch is that it changes *upward* — and the pilot pod's own testimony in month three will do more than any town hall.

Titles stay put during the pilot. "Intent Owner" and "Supervisor" are accountabilities, not badges — rebranding job titles on day one signals transformation theater and buys you nothing.

## Budget shape

No vendor pricing here — the shape is what matters for approval:

- **People** (the dominant cost): one Agent Engineer full-time, supervisor and intent-owner time carved out and protected. If this line is zero, the pilot is fake.
- **Platform**: trace storage, telemetry, checkpoint UX — whether built or bought, it must exist before Stage 1; the methodology runs on its artifacts.
- **Inference**: cloud inference for the reasoning tier; local/on-premises inference at the privacy boundary where confidentiality demands it. Costs scale with cycles, which scale with value delivered — a variable cost tied to output, which is the budget conversation executives already know how to have. It is also a **hedgeable** cost: because trust telemetry shows exactly where cheaper open-weight or self-hosted models hold quality (see [the model is a supplier, not a dependency](04-supervision-and-trust.md#the-model-is-a-supplier-not-a-dependency)), the model mix is a dial you own — a provider price shock becomes a re-routing decision inside your change regime, not a mid-year budget crisis. Enterprises running this playbook have cut inference spend by half while usage grew; what they lacked, and Flux provides, is the per-task quality evidence that says where the cheap model is safe.
- **The return curve**: flat or negative in Phase 1 (calibration), crossing in Phase 2, compounding in Phase 3 as precedent libraries and trust levels accumulate. Anyone selling a Phase-1 ROI is selling something else.

## Kill criteria

Decide these before starting, in writing — a pilot without kill criteria is a belief, not an experiment:

- **Kill** if by week 6 the pod cannot write acceptance contracts the domain expert stands behind — the workflow was wrong, or the organization defines quality orally. Pick a different workflow before trying again.
- **Kill** if acceptance audit disagreement stays high through Phase 2 — validation is not real, and scaling unvalidated output is worse than Scrum.
- **Kill** if by end of quarter human-minutes per accepted output shows no downward trend *and* defect escapes exceed baseline — the engine runs but produces no surplus.
- **Do not kill** for: feeling slower in Phase 1 (funded, expected), a noisy first month of escalations (calibration working), or one bad output caught by validation (the system doing its job).

A killed pilot with a measured baseline and a documented cause is a cheap, respectable outcome — you learned which precondition your organization lacks. An undead pilot that limps for a year is how methodologies get poisoned company-wide.

## The first-quarter calendar, compressed

| When | What happens | You show up by |
|---|---|---|
| Week 1 | Workflow selected, contract written, baseline measured | Approving the pick, signing the three commitments |
| Weeks 2–6 | Probation pod, everything validated, thresholds calibrated | Shielding the pod, reading the weekly page |
| Months 2–3 | Trust levels rise on data, throughput becomes visible | Watching the two numbers, prepping workflow #2 |
| Month 4 | Gate review: scale, adjust, or kill | Making that call on the criteria you pre-committed to |

## Closing

Executives do not adopt methodologies; they adopt **risk profiles**. This transition is designed to have the profile of an experiment, the paper trail of an audit, and the exit criteria of a disciplined investment — one workflow, one pod, one quarter, three commitments, and a kill switch you defined while you were still objective.
