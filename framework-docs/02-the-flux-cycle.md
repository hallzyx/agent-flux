# The Flux Cycle

**The Flux Cycle is the unit of delivery in Agent Flux — a supervised loop that completes in minutes to hours, replacing the two-week sprint.** A single practitioner runs several cycles per day, often concurrently.

## The loop

```
   ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌────────────┐    ┌───────────┐
   │  FRAME   │───▶│  PLAN   │───▶│ EXECUTE  │───▶│  VALIDATE  │───▶│ INTEGRATE │
   │ (human)  │    │ (agent, │    │ (agent)  │    │  (human)   │    │ (system)  │
   │          │    │ human-  │    │    │     │    │            │    │           │
   └─────────┘    │approved)│    │    ▼     │    └─────┬──────┘    └───────────┘
                   └─────────┘    │CHECKPOINT│          │
                                  │ (human,  │    redirect? ──▶ back to PLAN
                                  │on demand)│
                                  └──────────┘
```

### 1. Frame *(human, 2–10 minutes)*

The human writes the delegation: intent ("turn this client brief into a development-ready spec"), constraints ("our stack, their compliance regime, this budget band"), and the **acceptance contract** — the checkable definition of done. Framing quality is the highest-leverage human act in the entire methodology; a vague frame wastes an entire cycle.

### 2. Plan *(agent proposes, human approves — first checkpoint)*

The agent produces an explicit execution plan: what it will read, in what order, which tools it will call, where it anticipates ambiguity. The human approves or edits in seconds. This checkpoint is cheap and catches misunderstandings **before** compute and attention are spent on them.

### 3. Execute *(agent, minutes)*

The agent runs the plan: multiple targeted retrievals against source documents, deterministic tool calls, intermediate decisions. Everything is written to the trace in real time — execution is watchable, not a black box.

### 4. Checkpoint *(human, seconds — only when triggered)*

When the agent hits ambiguity above threshold, it pauses and escalates one concrete question: *"Requirement 4 can mean one-time payment or subscription — which?"* The human answers in seconds; the agent re-plans if needed and continues. Checkpoints are the methodology's replacement for discovering misunderstandings at sprint review, two weeks too late.

### 5. Validate *(human, 5–15 minutes)*

The human reviews the output **against the acceptance contract** — not against unstated preferences. (Where taste *is* the criterion, the contract says so explicitly through its soft clauses — see [creative deployments](04-supervision-and-trust.md#creative-and-taste-driven-deployments).) Three verdicts: **accept**, **redirect** (back to Plan with a correction; the trace shows exactly where reasoning diverged), or **reject** (the frame was wrong; write a better one).

### 6. Integrate *(automatic)*

Accepted output flows into the system of record — the project tracker, the document repository, the codebase. Cycle telemetry (duration, escalation count, verdict) is captured for the metrics in [Adoption & Metrics](06-adoption-and-metrics.md).

## Ceremonies become artifacts

Scrum's ceremonies exist to move information between humans. When agents hold the information, the meeting becomes a generated document.

| Scrum ceremony | Cost | Agent Flux replacement |
|---|---|---|
| Daily standup | 15 min × whole team, daily | **Trace digest** — auto-generated summary of yesterday's cycles, escalations, and validation debt |
| Sprint planning | 2–4 hours, biweekly | **Framing** — done per-delegation, in minutes, continuously |
| Sprint review | 1–2 hours, biweekly | **Validation** — continuous, built into every cycle |
| Retrospective | 1 hour, biweekly | **Cycle analytics** — escalation rate, redirect rate, and rework trends reviewed weekly |
| Backlog refinement | 1 hour, weekly | **Agent-maintained backlog** — delegations pre-scored for risk and ambiguity, human reorders by intent |

The team still talks — about direction, trade-offs, and what to build next. It stops meeting to exchange status that a trace digest states better.

## Concurrency: the real multiplier

Sprints serialize a team around one shared cadence. Flux Cycles are independent: a practitioner frames delegation A, and while the agent executes, frames delegation B, then answers an escalation on A, then validates C. The practitioner's day becomes a stream of high-judgment moments instead of a queue of implementation hours. **This concurrency — not agent speed — is where the order-of-magnitude gain lives.**

## Work larger than a cycle

Not everything fits in minutes-to-hours. Large work — a system migration, a multi-document engagement — runs as a **delegation chain**: a sequence of framed cycles where each accepted output becomes source material for the next. The cycle remains the unit of supervision and telemetry; the chain is the unit of planning and forecasting. Chains inherit everything cycles already have — contracts, traces, checkpoints, gap handling — and introduce nothing new to learn, which is the point: scale comes from composition, not from a second methodology for big things.

## Next

Who does what: read [Roles](03-roles.md).
