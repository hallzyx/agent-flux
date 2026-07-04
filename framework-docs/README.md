# Agent Flux — An Agile Methodology for the Agentic Era

**Agent Flux is a working methodology for teams where AI agents execute and humans supervise.** It replaces the sprint with the Flux Cycle — a minutes-to-hours loop of framing, delegation, supervised execution, and validation — and replaces Scrum ceremonies with artifacts that agents generate automatically.

## The problem in one paragraph

Scrum was designed in the 1990s to synchronize humans whose work takes days or weeks. Its entire machinery — two-week sprints, daily standups, planning poker — exists to manage one constraint: **human implementation is slow**. That constraint is gone. Agents draft the spec, write the code, and produce the analysis in minutes. Today the bottleneck is not implementation; it is **human judgment**: deciding what to delegate, validating what comes back, and catching what the agent got wrong. A methodology built to ration implementation capacity cannot manage a system whose scarce resource is validation capacity. Agent Flux is built for the new constraint.

And the pressure is double-sided. While judgment became the bottleneck inside the organization, inference became a volatile supplier cost outside it — annual token budgets fixed in January, repriced by the provider in February. Enterprises are already hedging with model portfolios and routing; what they lack is the per-task quality evidence that says where a cheaper model is *safe*. Flux produces that evidence as a by-product of how it works: the same telemetry that governs agent autonomy [governs model cost](04-supervision-and-trust.md#the-model-is-a-supplier-not-a-dependency).

## The core inversion

| | Scrum | Agent Flux |
|---|---|---|
| Humans | Execute tasks | Frame intent, supervise, validate |
| Agents | Autocomplete / assistants | Execute end-to-end under contract |
| Unit of work | Task assigned to a person | Delegation issued to an agent |
| Cycle | 2-week sprint | Flux Cycle (minutes to hours) |
| Ceremonies | Meetings | Auto-generated artifacts |
| Progress signal | Standup reports | Execution traces |
| Quality gate | Code review at the end | Checkpoints during execution |
| The scarce resource | Developer hours | Human judgment |

## Reading map

Read in order the first time; each document stands alone afterward. **Executive with ten minutes?** Read this page, then [Where Agile Breaks](07-where-agile-breaks.md), then [The Transition Guide](08-transition-guide.md) — the problem, the proof, and the price.

1. [Core Concepts](01-core-concepts.md) — the six principles and the vocabulary
2. [The Flux Cycle](02-the-flux-cycle.md) — the loop that replaces the sprint
3. [Roles](03-roles.md) — what humans and agents each own
4. [Supervision & Trust](04-supervision-and-trust.md) — checkpoints, escalation, the privacy boundary
5. [Case Studies](05-case-studies.md) — four organizations running Agent Flux
6. [Adoption & Metrics](06-adoption-and-metrics.md) — how to start, and how to know it is working
7. [Where Agile Breaks](07-where-agile-breaks.md) — eleven failure scenarios of sprint-based agile, and the Flux answer to each
8. [The Transition Guide](08-transition-guide.md) — the executive playbook: readiness, commitments, budget shape, and kill criteria

## What Agent Flux is not

- **Not "Scrum plus Copilot."** Bolting assistants onto sprints keeps the old bottleneck and adds a new review burden. The cycle itself must change.
- **Not full autonomy.** Unsupervised agents accumulate silent errors. Agent Flux treats human judgment as the load-bearing component and designs the workflow around spending it well.
- **Not Kanban with agents.** Kanban limits the work-in-progress of *execution*; Flux limits the work-in-progress of *judgment* (validation debt), and adds the contracts, escalations, and precedents that make agent output governable. The constraint being managed is different in kind.
- **Not a tool.** It is a methodology. It can be practiced with any agent stack that supports planning, tool use, traces, and human checkpoints.
