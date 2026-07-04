# Roles

**Agent Flux defines three human roles and three agent roles. Humans own judgment; agents own execution. No role on either side is optional.**

Titles don't change on day one — a Product Manager, a senior developer, and a platform engineer typically grow into these roles. What changes is what the organization holds them accountable for.

## Human roles

### Intent Owner

Owns **what and why**. Writes frames and acceptance contracts, prioritizes the delegation backlog, and decides what is worth an agent's execution and a supervisor's attention at all. The evolution of the Product Manager / Product Owner.

- Accountable for: framing quality, backlog order, saying no
- Anti-pattern: framing so vaguely that the supervisor must reverse-engineer the intent from the escalations

### Supervisor

Owns **judgment during and after execution**. Approves plans, answers escalations, validates outputs against contracts. Supervisors are domain experts — the methodology repurposes their expertise from *doing* the work to *judging* it, which is both faster and a better use of seniority.

- Accountable for: validation latency, redirect quality, keeping validation debt inside its limit
- Anti-pattern: rubber-stamping. A supervisor who approves everything is a supervisor the metrics will expose (see rework rate)

### Agent Engineer

Owns **the agents themselves**. Builds and tunes the planning behavior, the tool inventory, the escalation thresholds, and the privacy boundary. When cycle analytics show an agent guessing instead of escalating, or escalating trivia, the Agent Engineer adjusts it. The evolution of the senior/platform engineer.

- Accountable for: agent reliability, tool correctness, trace quality, boundary enforcement
- Anti-pattern: adding autonomy faster than the trust metrics justify

## Agent roles

### Planner

Decomposes a delegation into an executable plan and presents it for human approval. Explicit plans are what make execution predictable and checkpoints meaningful.

### Executor

Carries out the plan: targeted retrievals, deterministic tool calls, drafting, transformation. Specialized executors (a spec-writer, an analyst, a document processor) are composed per delegation. Executors **must** escalate above their ambiguity threshold — an executor without permission to escalate will hallucinate instead.

### Critic

Reviews the executor's output **before** the human sees it, adversarially, against the acceptance contract. The critic exists to spend cheap agent attention protecting expensive human attention: it catches contract violations, unsupported claims, and internal contradictions, so the supervisor's validation minutes go to genuine judgment calls. One requirement is structural: **the critic must not share the executor's blind spots** — it runs on a different model, or at minimum a deliberately different configuration and instruction set, because a reviewer that thinks identically to the author approves the author's mistakes.

## The interaction pattern

```
Intent Owner          Supervisor              Agents
     │                     │                     │
     │ frames delegation   │                     │
     ├────────────────────────────────────────▶ Planner
     │                     │ ◀── proposed plan ──┤
     │                     │ approves/edits ───▶ Executor ──▶ Critic
     │                     │ ◀── escalation ─────┤              │
     │                     │ answers ──────────▶ (continues)    │
     │                     │ ◀────────── pre-reviewed output ───┘
     │                     │ validates: accept / redirect / reject
     │ ◀── integrated outcome + trace digest ────┘
```

## Team shape

A Flux pod is small: **one Intent Owner, one to three Supervisors, a shared Agent Engineer**, and as many agent instances as the validation capacity can absorb. Scaling the organization means adding pods, not enlarging them — the constraint is always supervision bandwidth, and pods keep it local and measurable.

## Growing supervisors

The fair question every engineering leader asks: *if nobody executes, where does the next generation of supervisors come from?* Judgment is formed by judgment reps, not by watching. Juniors in a Flux pod train the way residents do in medicine: they validate at L0 alongside a senior supervisor, form their own verdict **before** seeing the senior's, and study the diff; they read traces and precedents the way juniors once read production code. What disappears is the decade of typing; what remains — compressed — is the accumulation of calibrated judgment on real cases. The apprenticeship does not vanish; it moves up the stack with the role.

## Next

How supervision actually stays trustworthy: read [Supervision & Trust](04-supervision-and-trust.md).
