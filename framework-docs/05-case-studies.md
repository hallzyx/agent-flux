# Case Studies

**Four organizations, four industries, one pattern: the human moves from producing the artifact to supervising its production, and cycle time collapses from days to hours.** Scenarios are illustrative composites; the numbers show the shape of the gain, not a benchmark.

---

## Case 1 — IT consultancy: client brief to development-ready spec

**Organization.** A 120-person software consultancy. Every engagement starts with a client brief — a messy PDF mixing business goals, half-specified requirements, NDA-protected names, and budget figures.

**Before (Scrum).** A senior PM spends 1–2 days converting the brief into epics, user stories, acceptance criteria, and a risk register. Ambiguities surface piecemeal over the sprint, each one a Slack thread or a client call. Company policy forbids pasting client documents into public AI tools, so the PM gets no leverage at all from the strongest available models. **Elapsed: 3–5 days to a stable spec.**

**After (Agent Flux).**

| Cycle step | What happens | Human time |
|---|---|---|
| Frame | PM writes the delegation: "development-ready spec, our delivery standards, client's compliance regime" + acceptance contract | 8 min |
| Boundary review | Local model pseudonymizes the brief; PM reviews what crosses the perimeter side by side | 2 min |
| Plan approval | Planner proposes: segment brief → extract requirements → score risks → draft epics/stories → estimate | 1 min |
| Execution + escalations | Executor runs; escalates twice. One is the PM's call (estimation basis) — answered in 30 seconds. The other — *"Section 3: one-time payment or subscription? Options + default attached"* — is the **client's** ruling, so it routes to the named client contact and the cycle parks; the agent moves on to its next delegation | 30 sec + routed |
| Validation | Critic pre-reviews and produces the completion report against the contract; PM validates, redirects once on estimation granularity | 12 min |
| Integrate | Accepted spec re-identified locally, exported to the tracker with full trace attached | 0 |

**Elapsed: under one hour of work, ~25 minutes of human attention** — plus a client answer that arrived by next morning with the default already proposed, instead of surfacing as a change request in week three. Both rulings are recorded as precedents: the subscription question is never asked again on this engagement, and at closing, the engagement's precedent library ships to the client as a deliverable — the decision memory of their own project. The PM ran two other engagement cycles the same morning.

---

## Case 2 — Commercial lending: covenant monitoring

**Organization.** A mid-size bank monitoring loan covenants (leverage ratios, reporting deadlines, cross-default clauses) across ~400 active credit agreements.

**Before.** Quarterly, analysts re-read agreements, cross-check ratios against fresh financial statements, and write breach memos. Each analyst covers ~40 agreements; a full pass takes three weeks, and subtle covenant interactions are missed under time pressure. Borrower financials are confidential and cannot be sent to external AI services.

**After (Agent Flux).** One delegation per agreement, run continuously rather than quarterly:

- **Frame:** "Flag any covenant at risk given the latest statements; memo per flag, cited to clause and figure." Acceptance contract requires a clause-level citation for every claim.
- **Privacy boundary:** borrower names and figures pseudonymized in-perimeter; external agents reason over `[BORROWER_7]`'s `[RATIO_2: 4.1x vs 3.5x limit]`.
- **Execution:** executor retrieves the specific clauses, calls a deterministic ratio calculator (tool, not model arithmetic), drafts the memo; critic verifies every citation resolves.
- **Escalation, real example:** *"Amendment 2 redefines EBITDA for this covenant only; statement uses the old definition. Recalculate under (a), (b), or flag for legal? Default: (b) + flag."* The analyst answers in one minute — precisely the judgment call their seniority exists for. The ruling is recorded as a precedent scoped to that amendment pattern: the other agreements sharing it never raise the question again.
- **Validation:** analysts review every flagged memo — covenant flags are consequential enough that this task type runs fully validated. Acceptance audit sampling is owned by the bank's independent risk function, per the [regulated deployment rules](04-supervision-and-trust.md#regulated-deployments).

**Result shape:** continuous coverage instead of quarterly sampling; analyst attention concentrated on genuine edge cases; every memo carries an audit-grade trace — which the regulator can be handed, verbatim.

---

## Case 3 — Telecom: field maintenance dispatch

**Organization.** A regional telecom operator dispatching crews for tower maintenance, balancing outage tickets, weather windows, crew certifications, and equipment lead times.

**Before.** Two dispatchers spend each morning assembling the day's plan from six systems. When a storm reshuffles the day, re-planning takes hours and is done under pressure — which is when certification mismatches slip through.

**After (Agent Flux).**

- **Frame (standing delegation):** "Produce today's dispatch plan; hard constraints: certifications, safety windows, SLA priorities. Escalate any constraint conflict — never trade off safety silently."
- **Execution:** planner sequences tickets; executor retrieves crew rosters, weather feeds, and parts availability via tools; critic checks the plan against every hard constraint before a human sees it.
- **Checkpoint, real example:** *"Ticket 4417 (SLA breach in 6h) needs a rigging-certified crew; the only one is assigned to preventive job 4402. Swap (delays 4402 two days) or subcontract (cost band attached)? Default: swap."* The dispatcher decides in seconds, with the trade-off already priced — and the ruling becomes precedent, so the next identical conflict surfaces with this decision already attached as the default.
- **Validation:** dispatcher approves the morning plan in ~10 minutes; mid-day disruptions trigger re-plan cycles that take minutes, not hours.

**Result shape:** dispatchers supervise two regions instead of one; safety constraints are enforced by the critic on every plan, including the chaotic re-plans where humans used to slip.

---

## Case 4 — Game studio: seasonal content under one creative director

**Organization.** A 60-person studio running a live game: seasonal events, skins, narrative beats, and marketing assets — all owing consistency to a lore bible and one creative director's taste.

**Before.** Concept phase: the director briefs, artists produce two or three options over several days, and "I'll know it when I see it" costs a week per iteration. The director is the approval bottleneck for everything; senior artists burn hours on production scaffolding — variations, resizes, adaptations — instead of originating work; and the lore inconsistency that slips through gets caught by the community, publicly. **Elapsed: 2–3 weeks from brief to approved direction, before production even starts.**

**After (Agent Flux).**

- **Frame (divergent delegation):** "Eight key-art directions for the winter event, maximally distinct. Hard clauses: brand palette, lore-bible continuity, format specs. Soft clause: 'festive without being generic.'"
- **Execution:** the critic enforces every hard clause — palette, continuity against the lore bible, distinctness across the set — before the director sees anything. Mechanically wrong options never reach a human eye; the director's attention lands entirely on taste.
- **Validation is selection:** the director keeps two, kills six, attaches remix notes. The taste rulings are recorded as precedents — a style memory ("nothing gradient-heavy; silhouettes must read at small sizes") that every future frame inherits, keeping a hundred cycles coherent with one director's eye.
- **Convergent chains:** the two survivors continue as normal cycles for the production scaffolding, while the originating art stays with human artists — the line the Intent Owner drew on purpose.
- **Mode-aware metrics:** the 75% kill rate is the divergent band working, not failing.

**Result shape:** the iteration cost of "I'll know it when I see it" drops from a week to an afternoon; the director's eye scales through precedents instead of meetings; senior artists spend their hours on originating work; and the studio's most leak-sensitive asset — unreleased content — never crosses the boundary unreviewed.

---

## The pattern across all four

| | Consultancy | Bank | Telecom | Game studio |
|---|---|---|---|---|
| Old cycle time | 3–5 days | 3 weeks / quarter | Hours per re-plan | ~1 week per iteration |
| Flux cycle time | < 1 hour | Continuous | Minutes | An afternoon |
| Human attention per cycle | ~25 min | Minutes per flag | ~10 min + escalations | Selection minutes |
| What escalated | Requirement ambiguity | Definition conflicts | Constraint trade-offs | Taste calls the brief couldn't settle |
| Where the ruling lived | The client (routed escalation) | The analyst | The dispatcher | The creative director |
| What compounded as precedent | Client conventions | Amendment rulings | Conflict resolutions | Style rulings |
| Why privacy boundary mattered | Client NDAs | Borrower confidentiality | (internal perimeter) | Unreleased IP |

In every case the humans did **less production and more judgment** — and the judgment moments arrived pre-structured: evidence attached, options priced, default proposed.

## Next

How to start, and how to prove it is working: [Adoption & Metrics](06-adoption-and-metrics.md).
