# Supervision & Trust

**Supervision is the engineering discipline of Agent Flux: checkpoints are designed, escalation is a protocol, trust is earned per agent per task type, and the privacy boundary is enforced by architecture.** This is the document that answers the executive question: *"How do I know the agent didn't quietly get it wrong?"*

## Checkpoint design

A checkpoint is a designed pause, not an interruption. Three kinds:

| Checkpoint | Trigger | Human cost | Catches |
|---|---|---|---|
| **Plan approval** | Always, before execution | Seconds | Misread intent, wrong scope, wrong sources |
| **Escalation** | Agent detects ambiguity/risk above threshold | Seconds | Genuine unknowns the source material cannot resolve |
| **Boundary review** | Data is about to cross the privacy boundary | Seconds–minutes | Sensitive data leakage (see below) |

Design rule: **a checkpoint must be answerable in under a minute.** If a checkpoint requires the human to re-do the analysis, it is not a checkpoint — it is the old workflow wearing a costume. The Agent Engineer's job is to keep questions concrete: not *"is this okay?"* but *"one-time payment or subscription?"*

## The escalation protocol

A valid escalation contains four parts:

1. **The blocked decision** — what the agent cannot proceed on
2. **The evidence** — the exact source fragments that conflict or fall silent
3. **The options** — the concrete interpretations, with implications of each
4. **The default** — what the agent would do if forced, so the human can approve with one click

Escalations route to wherever the judgment actually lives — including **across organizational boundaries**. In client-service organizations, many rulings belong to the client, not the firm: those escalations route to a named client contact, are answered asynchronously against the same four-part format, and are recorded as precedent like any other. This turns the oldest pain of consulting — waiting days for client answers — into a measured queue with timestamps and proposed defaults; when delivery dates slip, the trace attributes the waiting hours to their source, which is the difference between a dispute and a document.

Escalation rate is a managed health signal, not noise. Too low means the agent is guessing (hallucination risk); too high means frames are poor or thresholds are miscalibrated (attention waste). Healthy systems settle into a band — see [Adoption & Metrics](06-adoption-and-metrics.md).

### Escalations never block

An escalation parks the cycle; it does not halt the system. The agent moves on to its next delegation, and escalations accumulate in the supervisor's queue — each one self-contained (evidence, options, default), so the supervisor answers them **in batches, asynchronously**, instead of being interrupted five times an hour. A parked cycle resumes the moment its answer lands. Concurrency is preserved on both sides of the human–agent boundary.

### Answered escalations become precedent

Every answered escalation is recorded as a **decision precedent**: the question, the context, the ruling, and who ruled. Precedents are injected into the framing context of future delegations of the same type, which yields two compounding effects:

1. **The same question is never asked twice.** Escalation rate on a mature workflow falls naturally — not because agents guess more, but because the organization's rulings travel with the work.
2. **Judgment becomes consistent.** Two supervisors can no longer silently resolve the same ambiguity in opposite directions; the second one sees the first ruling and either follows it or explicitly overrides it — and the override is itself recorded.

Precedents are the organizational memory Scrum never had: in sprint-based teams, these rulings lived in Slack threads and left with the people who wrote them.

In organizations serving multiple clients or domains, precedents live in a **scoped hierarchy**: engagement-level (this project's rulings), client-level (this client's standing conventions), and firm-level (rulings that proved universal). The default scope is the narrowest — most rulings are client conventions wearing the costume of general truths, and injecting client A's billing convention into client B's frames corrupts correctness and confidentiality at once. **Promotion up the hierarchy is an explicit curation act**, never automatic. Two dividends follow: the firm-level library becomes the consultancy's compounding methodology asset, and the engagement-level library becomes a closing deliverable — the client receives the complete decision memory of their own project.

One safeguard is mandatory, because a wrong ruling propagates exactly as efficiently as a right one: **precedents are versioned and revocable**. When rework or a defect escape traces back to a precedent — a supervisor answered under pressure, and the error compounded — the precedent is flagged, re-ruled, and every delegation that relied on it is enumerated from the traces for targeted review. Organizational memory that cannot be corrected is not memory; it is dogma.

## Trust calibration

Trust in Agent Flux is **earned, scoped, and revocable** — never global.

- **Earned:** each agent × task-type pair has a track record (acceptance rate, rework rate). Checkpoint density decreases as the record strengthens.
- **Scoped:** an agent trusted to draft specifications is not thereby trusted to estimate budgets. Trust levels attach to the pair, not the agent. In multi-client or multi-domain organizations, scope has a third dimension — **context**: a pair that earned L1 drafting fintech specifications re-enters a healthcare engagement one level down, because domain risk does not transfer even when the task type does. It re-earns quickly — firm-wide telemetry on the task type provides the prior — but it re-earns.
- **Revocable:** a validation failure or rework event automatically drops the trust level and re-tightens checkpoints. Autonomy is a dial the metrics turn, in both directions.

| Trust level | Checkpoints active | Typical stage |
|---|---|---|
| L0 — Probation | Plan approval + all escalations + full validation of every output | New agent or new task type |
| L1 — Supervised | Plan approval + escalations; validation may sample-check the critic-passed outputs | Consistent acceptance record |
| L2 — Trusted | Escalations only; spot validation | Long, clean record on a narrow task type |

There is no L3 "fully autonomous" in Agent Flux. Some judgment stays human by design — that is the point of the methodology, not a limitation of it.

### Regulated deployments

In regulated industries — banking is the canonical case; the rules generalize to health, insurance, and defense — four constraints become explicit:

1. **Trust ceilings.** Regulation can cap autonomy regardless of track record. Task types touching adverse customer decisions (credit denial, AML flags) carry a permanent ceiling — full validation of every output — because human review is a *legal requirement*, not a performance question. A ceiling is declared in the task type's contract template and no accumulation of evidence lifts it; only the regulator can.
2. **Four-eyes is a contract clause.** Where a decision requires dual control, the acceptance contract states the number of independent validators. The methodology does not change; the contract carries the control.
3. **The second line owns the audit.** In regulated deployments, acceptance audit sampling is performed by — or reports to — the independent risk/validation function, mapping cleanly onto three-lines-of-defense and model-risk-management expectations: the agent × task-type registry serves as the model inventory, cycle analytics as ongoing monitoring, traces as the documentation trail. Agent configuration changes (thresholds, tools, prompts) are versioned artifacts that pass through the organization's change regime like any production model.
4. **Precedents respect information barriers.** Precedent libraries are scoped: a ruling formed on one side of an information barrier must not be injected into frames on the other. Scoping is enforced at frame time, and cross-barrier precedent flow is itself an auditable event.

None of these are add-ons for compliance theater. They are the same mechanisms — contracts, trust levels, audits, precedents — with parameters a regulator would set instead of the pod.

### Creative and taste-driven deployments

At the opposite pole from regulation — game studios, creative agencies, brand work — the constraint is not law but taste, and four adaptations become explicit. They mirror the regulated case: there, the ceiling on autonomy was legal; here, it is aesthetic.

1. **Contracts split into hard and soft clauses.** Hard clauses are computable and the critic enforces them completely: technical specs, brand rules, format, lore and continuity, palette. Soft clauses — "feels premium," "reads as playful" — are validated **only** by human taste, and the completion report marks them as such. The critic never scores taste; it clears the mechanical ground so the human's attention lands entirely on it. (The split generalizes: even an enterprise specification has soft clauses — creative work just makes them the majority.)
2. **Divergent delegations.** Early creative work needs breadth, not convergence. A divergent delegation's contract specifies the fan-out — "eight directions, maximally distinct" — and validation is **selection**: keep two, kill six, remix. Distinctness itself is a hard clause the critic can check, which directly counters the known failure mode of generative systems regressing to the safe aesthetic mean. Selected directions then continue as normal convergent cycles.
3. **Iterative framing is legitimate.** "I'll know it when I see it" is not a framing failure in creative work; it is the epistemics of the domain. Cheap cycles make it affordable for the first time: early cycles *are* the requirement discovery, and the acceptance contract sharpens with each validation. (In sprint-based delivery, each IKIWISI iteration cost weeks — which is why creative direction and process methodology have always been at war.)
4. **KPI bands are set per delegation mode.** In divergent mode, a high redirect and kill rate is the process working, not failing. Exploration cycles carry their own health bands; measuring them against delivery bands would optimize the creativity out of the studio. Taste rulings accumulate as precedents like any other — a style memory that keeps a hundred cycles coherent with one director's eye.

One boundary Flux deliberately does not set: **what gets delegated**. The Intent Owner draws that line, and in creative organizations the healthy line delegates the production scaffolding — variations, adaptations, resizing, continuity chores — while the originating act stays in human hands. Validating soft clauses is itself authorship: a film director does not hold the camera, and no one doubts whose film it is.

### The model is a supplier, not a dependency

Frontier inference pricing is volatile: an annual token budget can be fixed in January and obsolete by February, because the provider — not the customer — sets next month's rate. Enterprises are responding with model portfolios: open-weight models, self-hosted tiers, gateways that route each request to the cheapest model that holds quality, and aggressive caching. Flux does not merely tolerate this strategy — its mechanisms double as the governance layer that makes it safe:

1. **The delegation structure is a routing surface.** No cycle needs one model. High-ambiguity planning may merit a frontier model; executors on routine task types and critics run on cheaper open-weight or self-hosted models — the critic *already* must run on a different model than the executor, so a second, cheaper supplier is in the architecture from day one.
2. **Trust telemetry is downgrade evidence.** Anyone can route to a cheap model; knowing *where* it is safe requires quality data. An agent × task-type pair holding L1 with low rework on an inexpensive model is a proven saving; a defect-escape uptick after a downgrade is the system saying the cut went too deep — and re-tightening checkpoints automatically. Routing without quality telemetry is gambling; with it, it is engineering.
3. **A model swap is a context change, not a leap of faith.** Swapping the model behind a task type drops the pair one trust level — the same probation machinery used for a new domain — and it re-earns quickly against the existing telemetry baseline. A provider price shock therefore triggers a configuration change through the normal change regime, not a crisis meeting.
4. **Precedents are the cache.** Every ruling that never gets re-asked is inference that never gets re-bought. Organizational memory compounds in judgment quality and in tokens simultaneously.

The privacy boundary already established Flux's local tier for confidentiality; this section is the same posture applied to cost. In both cases the principle is identical: **no external supplier — of inference or of anything else — holds a structural veto over the workflow.**

## The privacy boundary

The single biggest blocker to enterprise agent adoption is not capability — it is that client contracts, financials, and personal data **cannot legally or contractually leave the organization's perimeter** for third-party inference. Flux resolves this architecturally:

```
 INSIDE THE TRUST PERIMETER            │        OUTSIDE (external inference)
 (on-device / on-premises)             │
                                       │
 original document                     │
   → local model detects sensitive     │
     entities                          │
   → PSEUDONYMIZE, typed + magnitude:  │
     "Acme Corp"  → [CLIENT_1]         │──▶  agents plan, retrieve, call tools,
     "$120,000"   → [BUDGET_1:         │     and reason over structure —
                     ~low-6-figs USD]  │     never over identities
   → mapping table stays local         │
   → human reviews exactly what        │◀──  output returns with placeholders
     will cross (boundary review)      │
   → RE-IDENTIFY locally: placeholders │
     replaced from the local table     │
 final artifact, fully identified      │
```

Three properties make this work:

1. **Pseudonymize, don't redact.** Typed placeholders that preserve magnitude keep the *structure* of the problem intact — external agents can still reason about relationships, priorities, and thresholds. Blacked-out text destroys the reasoning substrate.
2. **The human sees what leaves.** The boundary review shows original and pseudonymized text side by side before a single byte crosses. Compliance stops being a promise and becomes an observable act.
3. **Re-identification never leaves.** The mapping table lives and dies inside the perimeter. The external system produces a correct artifact about entities it never knew.

**Stated limit.** Pseudonymization replaces identifiers; it cannot erase every contextual clue — "[CLIENT_1], the region's largest telecom" may identify the client regardless of the placeholder. This is precisely why the boundary review is human and mandatory: the reviewer redacts identifying *context* that no model can reliably know is identifying. Organizations under stricter regimes tighten the boundary further — for example, running the external inference tier on-premises — without changing anything else in the methodology.

## The Slippage Protocol

Work runs late. Scrum's darkest pathology is not the lateness itself — it is what the deadline does to the truth: tickets quietly moved at 11pm, "done" renegotiated by footnote, a green KPI covering an incomplete increment. People hide slippage because the system punishes disclosure. Flux removes both the ability and the need to hide.

**Making concealment impossible:**

1. **Slippage is detected, not confessed.** Every delegation type has a measured cycle-time band. A cycle exceeding its band auto-flags in the trace digest — neutrally, the way a monitoring system flags latency. Nobody has to walk into a room and admit anything; the telemetry already said it, without blame attached.
2. **Completeness is computed, not claimed.** At validation, the critic produces a **completion report**: the output diffed clause by clause against the acceptance contract. "Done" stops being a negotiable adjective at a deadline and becomes an arithmetic fact. There is no footnote to hide behind, because the contract was written at Frame time — before the pressure existed.

**Making honesty cheap:**

3. **Partial delivery is a first-class outcome.** An output meeting 7 of 9 contract clauses is delivered as exactly that: accepted-partial, with the two unmet clauses auto-converted into new delegations in the **gap register**. The deficit is visible, queued, and owned — the difference between technical debt and technical *deceit* is precisely this register.
4. **Scope is cut by amendment or not at all.** If the deadline genuinely demands less, the Intent Owner amends the acceptance contract — an explicit, recorded, precedent-forming act. A supervisor quietly accepting less than the contract is not flexibility; it is a future rework event, and rework telemetry will trace it back and re-tighten their pod's calibration.
5. **Metrics never attach to individuals.** Cycle time, escalation rate, and slippage flags are pod-level and system-diagnostic — they drive threshold tuning and re-framing, not performance reviews. The moment a slippage flag can hurt a person's bonus, Goodhart's law resurrects the 11pm ticket-shuffle inside Flux. This rule is governance, and it is non-negotiable.

The protocol's intent in one line: **lateness is a normal state of work; lying about lateness is a failure of methodology design — so Flux designs it out.**

## The trace as audit trail

Every claim in this document is inspectable because every cycle emits a trace: plan, retrievals, tool calls, escalations, answers, verdicts. For regulated industries this is the difference between "we use AI responsibly" and **producing the execution record on request**.

## Next

See it running: read [Case Studies](05-case-studies.md).
