# Core Concepts

**Agent Flux rests on six principles. Every practice in this framework derives from one of them.** If a practice ever conflicts with a principle, the principle wins.

## The six principles

### 1. Humans supervise; agents execute

The human contribution moves up the stack: from writing the artifact to defining what a correct artifact looks like, and judging whether the delivered one qualifies. A person who spends their day typing implementation is misallocated; a person who spends their day framing, validating, and answering escalations is operating at the level the system needs.

### 2. Judgment is the scarce resource — budget it

Agent throughput is effectively unlimited; human attention is not. Agent Flux treats validation capacity like Scrum treated velocity: it is measured, planned against, and protected. Work is shaped so that each unit of human judgment resolves the maximum amount of ambiguity — approving a plan, answering a targeted escalation, accepting an output against an explicit contract.

### 3. Escalation over hallucination

An agent that guesses when uncertain is a liability; an agent that asks a precise question at the right moment is a colleague. Agents in Flux have **permission not to know**: when they detect ambiguity above threshold, they pause and escalate a concrete, answerable question instead of fabricating an answer. A healthy escalation rate is a feature of the system, not a failure of the agent.

### 4. The trace is the artifact of record

Every execution produces a full trace: the plan, each retrieval, each tool call, each decision, each escalation and its answer. The trace replaces the status report, powers the audit trail, and is what makes trust *inspectable* rather than assumed. If it isn't in the trace, it didn't happen.

### 5. Data sovereignty is architectural, not contractual

Enterprises don't block AI adoption because models are weak; they block it because sending client data to third-party clouds violates their obligations. Flux draws a hard **privacy boundary**: sensitive data is pseudonymized inside the organization's trust perimeter (on-device or on-premises) before any external inference, and re-identified only back inside the perimeter. Privacy is enforced by the data flow itself — no policy document required.

### 6. Assume slippage — make honesty cheaper than concealment

Work will run late. Any methodology that plans only for the punctual case forces its people to choose, at the deadline, between honesty and their performance review — and they will choose rationally. Flux designs for the late case as a first-class path: completeness is **computed** against the acceptance contract (not claimed), slippage is **detected** by telemetry (not confessed), partial delivery is a **legitimate state** with its gaps explicitly registered, and scope is reduced only by **recorded amendment** — never by quiet renegotiation of "done." Health metrics belong to the pod and the system, never to an individual's scorecard. The goal is not to tolerate lateness; it is to make the truth about lateness the path of least resistance. See the [Slippage Protocol](04-supervision-and-trust.md#the-slippage-protocol).

## Vocabulary

| Term | Definition |
|---|---|
| **Delegation** | The unit of work: an intent, its constraints, and an acceptance contract, issued to an agent |
| **Acceptance contract** | The explicit, checkable definition of "done" for a delegation — written before execution |
| **Flux Cycle** | One full loop: Frame → Plan → Execute → Checkpoint(s) → Validate → Integrate |
| **Checkpoint** | A designed pause where a human approves, corrects, or redirects the agent mid-execution |
| **Escalation** | An agent-initiated checkpoint triggered by detected ambiguity or risk |
| **Decision precedent** | A recorded escalation ruling — question, context, verdict, who ruled — injected into future frames of the same type so the same question is never answered twice |
| **Trace** | The complete, human-readable record of an execution: plan, retrievals, tool calls, decisions |
| **Validation debt** | Agent outputs awaiting human review — the work-in-progress of the agentic era |
| **Privacy boundary** | The perimeter sensitive data never crosses in identifiable form |
| **Trust level** | An earned, per-agent, per-task-type setting that determines checkpoint density |
| **Slippage** | A cycle or chain exceeding the measured time band for its delegation type — detected by telemetry, never self-reported |
| **Completion report** | The critic's clause-by-clause computation of output vs. acceptance contract — "done" as a calculation, not a claim |
| **Gap register** | The visible queue of unmet contract clauses from partial deliveries, each auto-converted into a new delegation |
| **Contract amendment** | The only legitimate way to reduce scope: an explicit, recorded change to the acceptance contract by the Intent Owner |

## Next

The principles come alive in the loop: read [The Flux Cycle](02-the-flux-cycle.md).
