# Adoption & Metrics

**Adopt Agent Flux one workflow at a time, measure from day one, and let trust levels — not enthusiasm — set the pace of autonomy.** This document gives the adoption path and a two-layer measurement model: engine KPIs that tell you the machine is healthy, and outcome metrics that tell you it is pointed at something worth hitting. Either layer without the other is how organizations fool themselves.

## Adoption path

This section is the **pod-level** view: what the team does at each stage. The executive's side of the same transition — readiness checks, commitments, budget shape, and kill criteria — lives in [The Transition Guide](08-transition-guide.md).

### Stage 0 — Pick one workflow (week 1)

Choose a workflow that is: document-grounded, high-frequency, painful, and currently blocked from AI leverage by confidentiality. (Brief-to-spec, contract review, and report drafting are classic first candidates.) Write the acceptance contract for it **before** any agent exists — if the team cannot define "done" checkably, the workflow is not ready.

### Stage 1 — One pod, L0 trust (weeks 2–6)

One Intent Owner, one Supervisor, one Agent Engineer. Every output fully validated, every escalation answered, every trace read. This stage feels slower than promised — that is expected: you are buying the track record that justifies loosening checkpoints later, and calibrating escalation thresholds with real data.

### Stage 2 — Earned autonomy (months 2–4)

Cycle analytics move agent × task-type pairs to L1 where the record supports it. Validation shifts from exhaustive to sampled on critic-passed outputs. Concurrency becomes real: supervisors run multiple cycles in parallel. This is where the throughput gain becomes visible in the metrics.

### Stage 3 — Scale by pods (month 4+)

New workflows get new pods; the Agent Engineer role becomes a shared platform function; the ceremony replacements (trace digests, cycle analytics reviews) become the organization's operating rhythm. Scrum artifacts are retired workflow by workflow, not by decree.

Flux pods will coexist with sprint-based teams for quarters, and the seam is asymmetric by design: the pod treats a Scrum team as a slow external dependency — framing delegations for whatever can be produced locally (drafts, stubs, contract proposals) and routing genuine judgment questions to that team's lead as escalations, precedent-recorded like any other. The pod loses nothing to the neighbor's cadence except what truly requires the neighbor's judgment.

**Anti-pattern for the whole path:** the big-bang rollout. Trust calibration is empirical; it cannot be skipped by executive sponsorship, only funded by it.

## The two-layer measurement model

**Layer 1 (engine KPIs)** measures whether the delivery system is healthy. **Layer 2 (outcome metrics, expressed as OKRs)** measures whether that healthy system is producing business value. The most dangerous pod in an organization is one with a green Layer 1 and no Layer 2 — an efficient machine building the wrong thing at unprecedented speed.

### Layer 1 — Engine KPIs

Every efficiency KPI ships **paired with a counter-metric that degrades visibly when the primary is gamed**. Reviewing one without its pair is not permitted; Goodhart's law is a design input here, not a surprise.

| Primary KPI | Definition | Healthy signal | Paired counter-metric (catches the gaming) |
|---|---|---|---|
| **Cycle time** | Frame → integrated, per delegation type | Minutes–hours, stable band | **Human-minutes per accepted outcome** — slicing delegations thin makes cycle time look great while per-outcome overhead climbs |
| **Escalation rate** | Escalations per cycle | Stable band (typically 1–3 on complex documents) | **Rework rate** — suppressing escalations via loosened thresholds shows up as guessing, which shows up as rework |
| **Validation debt** | Outputs awaiting human review | Bounded, hard WIP limit | **Acceptance audit disagreement** (below) — clearing debt by rubber-stamping shows up in audit sampling |
| **Rework rate** | Accepted outputs later corrected | Low and falling per trust level | **Defect escape rate** — hiding corrections as "new work" moves the error downstream, where escapes are counted and attributed back |

Two engine KPIs added by simulation against gaming scenarios:

- **Defect escape rate** — issues discovered *after* integration (production incidents, client-reported errors, downstream contradictions), attributed to their originating cycle via the trace. This is the ground-truth quality number: rework rate measures what the pod caught; defect escape measures what it didn't. A pod with low rework and rising escapes is accepting too generously — auto-demote the affected trust levels.
- **Acceptance audit disagreement** — a random sample of accepted outputs is periodically re-validated blind by a second supervisor (or a stronger critic configuration). The disagreement rate is the *leading* indicator of validation quality — it catches rubber-stamping months before rework and escapes would. Target: low single digits; rising disagreement freezes trust-level promotions until resolved.

And one queue-health KPI required by the [Slippage Protocol](04-supervision-and-trust.md#the-slippage-protocol):

- **Gap register aging** — registered gaps are honest debt, but a register without a clock becomes a landfill where "accepted-partial" quietly means "never." Every gap carries an age; aging past its band triggers a forced decision by the Intent Owner: schedule it, amend it out of the contract explicitly, or escalate the capacity problem. The register may grow, but it may not silently *rot* — and its size counts against the pod's validation-debt limit.

**Secondary signals:** redirect precision (how often a redirect fixes the output in one pass — a proxy for trace quality and supervisor skill); precedent reuse rate (rising reuse means organizational memory is compounding; falling escalations *without* rising reuse suggests threshold gaming, not learning); **amendment rate** (contract amendments are legitimate one by one, but a rising rate means frames overpromise or capacity is short — serial amendment is scope erosion with a paper trail, and the trail must be read); and **default acceptance rate** (the share of escalations resolved by one-click accepting the agent's proposed default — near 100% signals automation complacency: the human has stopped judging and started clicking, which audit disagreement will soon confirm). Where model routing is in play, add **cost per accepted output** — inference spend divided by accepted outcomes, tracked per model mix. It is the cost twin of human-minutes per accepted output, and the number that turns model portfolio decisions from belief into accounting.

### Layer 2 — Outcome metrics and OKRs

Flux plugs into standard quarterly OKRs, with two rules the agentic era makes non-negotiable:

1. **Key Results must be outcome-denominated, never output-denominated.** "Complete 400 cycles" or "generate 60 specs" was always a weak KR; under Flux it is a broken one *by construction* — execution is abundant, so any output target is trivially and meaninglessly hittable. Valid KRs move something outside the pod: client acceptance without revision rounds, engagement margin, time-to-first-delivery on new accounts, covenant breaches caught before default.
2. **Every delegation declares the Key Result it serves.** This is enforced at Frame time — the frame template has a mandatory objective field. The resulting KPI, **value linkage** (% of cycles traceable to an active Key Result), is the bridge between the layers. Healthy: >85%, with the remainder explicitly tagged as maintenance or exploration. Falling linkage is the earliest signal of a pod drifting into busy-work — visible in a week, not at the quarterly review.

**Cadence:** Layer 1 reviewed weekly by the pod (this *is* the retrospective's replacement). Layer 2 reviewed monthly by Intent Owners against KR movement, quarterly with leadership. The forecast connects them: remaining backlog × measured throughput per delegation type, weighted by risk scores, reported as a confidence range that narrows as cycles complete — never a single negotiated date.

### The two standing rules the metrics enforce

- **Validation debt is the new WIP, and it gets a hard limit** (gap register included). Agents can generate without bound; unvalidated output is not an asset but a liability queue. At the limit, the system stops accepting new delegations until judgment catches up.
- **Metrics attach to pods and systems, never to individuals.** The moment a cycle metric enters a personal scorecard, Goodhart resurrects every concealment behavior Flux was designed to eliminate. This is a governance commitment, restated here because it is the one executives are most tempted to break.

## What "working" looks like after one quarter

- [ ] The pilot workflow's cycle time dropped an order of magnitude, **and** rework rate and defect escape rate are at or below the pre-Flux baseline
- [ ] Escalation rate sits in a stable band and escalations read like good questions from a sharp junior
- [ ] At least one agent × task-type pair earned L1 on data, not on optimism
- [ ] Acceptance audit disagreement is measured and in low single digits — validation is real, not ceremonial
- [ ] Value linkage exceeds 85% and at least one Key Result moved measurably because of Flux-delivered outcomes
- [ ] The gap register is aging within its bands — honest debt, on a clock
- [ ] Supervisors report their day contains more judgment and less production — and can show the trace digests that prove it
- [ ] Compliance has seen a boundary review and an execution trace, and signed off in writing

## Closing

Scrum answered the question of its era: *how do slow humans stay synchronized?* Agent Flux answers the question of this one: **how does scarce human judgment govern abundant machine execution?** The organizations that answer it first won't just ship faster — they will be the ones whose AI output can actually be trusted, audited, and defended.
