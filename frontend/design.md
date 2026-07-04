# Agent Flux — Ledger Light Design System

Single source of truth for the **Ledger Light** visual language and the **P3 consistency tokens**.
Coders: match this doc. If code and doc disagree, fix the code (or flag the doc). Tokens live in
`frontend/app/globals.css` `:root`; do not hardcode hex values in components.

---

## 1. Overview

Ledger Light is an **editorial finance** aesthetic — think a well-set legal ledger or a quiet
private-bank statement. Calm parchment surfaces, deep navy ink, restrained amber/teal accents,
generous whitespace, and typography that carries the hierarchy so chrome can stay minimal.

**Type families**

| Role | Family | Fallback |
|---|---|---|
| Headings | Fraunces (`--font-heading`) | Georgia, serif |
| Body / UI | IBM Plex Sans (`--font-ui`) | system-ui, sans-serif |
| Labels / trace / code | IBM Plex Mono (`--font-mono`) | ui-monospace, monospace |

Rule of thumb: **serif for meaning, sans for reading, mono for machinery** (trace events, tokens,
placeholders, code, metadata).

---

## 2. Color tokens

All colors are CSS variables. Never inline hex outside `:root`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f7f5f0` | App background (parchment) |
| `--surface` | `#ffffff` | Cards, panels |
| `--surface-sunk` | `#f1eee7` | Inset areas: code blocks, table headers, rails |
| `--border` | `#e3ded4` | Default hairline border |
| `--border-strong` | `#cfc7b8` | Emphasized border, pill outlines, markers |
| `--ink` | `#14213d` | Primary text on light, navy brand, primary buttons |
| `--ink-hover` | `#0d1730` | Primary button/link hover |
| `--ink-muted` | `#4b5563` | Softer ink for lead paragraphs (P3 token) |
| `--text` | `#1f2733` | Body copy |
| `--muted` | `#6b7280` | Secondary/meta text, hints |
| `--accent` | `#14213d` | Alias of ink for accent surfaces |
| `--attention` | `#b45309` | Amber — action needed, escalation, current step |
| `--attention-bg` | `#fdf2e3` | Amber tint background |
| `--verified` | `#0f766e` | Teal — done, verified, precedent, success |
| `--verified-bg` | `#e6f2f0` | Teal tint background |
| `--danger` | `#b42318` | Red — errors, critic findings, unmet criteria |
| `--danger-bg` | `#fdeceb` | Red tint background |
| `--entity-mark` | `#fdf2e3` | Highlight background for detected PII entities |
| `--entity-text` | `#92400e` | Highlighted entity text |

**Semantic pairing:** every tone is a `{color}` + `{color}-bg` pair. Foreground text uses the base;
fills/tints use `-bg`. Amber = *act now*. Teal = *resolved/trusted*. Red = *problem*. Navy = *neutral authority*.

---

## 3. Typography scale

Body base is **17px** (`1.0625rem`), `line-height: 1.5`. Steps below are the working scale.

| Token / element | Size | Weight | Family | Use |
|---|---|---|---|---|
| `header h1` | `1.75rem` | 500 | heading | Page title |
| `h2` | `~1.25rem` | 500 | heading | Checkpoint titles |
| `h3` (panel) | `0.95rem` | 600 | ui | Panel/section label (muted) |
| body | `1.0625rem` | 400 | ui | Default reading text |
| `--text-meta` | `0.8rem` | 400 | mono | Timestamps, counts, status detail (P3) |
| `--text-label` | `0.7rem`, `letter-spacing 0.05em`, uppercase | 600 | mono | Trace type, rail label, section eyebrows (P3) |
| `.hint` | `0.9rem` | 400 | ui (muted) | Inline guidance |

Headings never carry a number prefix (see §5, stepper rule). Uppercase + tracking is reserved for
mono labels only — never uppercase Fraunces headings.

---

## 4. Radius & elevation (P3 tokens)

Consolidate the ad-hoc `4px/6px/8px/999px` radii and inline shadows into named tokens.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `4px` | Inputs, small tints, inline notes |
| `--radius-md` | `8px` | Cards, panels, buttons |
| `--radius-pill` | `999px` | Chips, pills, status dots, markers |
| `--shadow-panel` | `0 1px 2px rgba(20,33,61,0.04)` | Resting cards/panels |
| `--shadow-float` | `0 8px 24px rgba(20,33,61,0.18)` | Toasts, floating/overlay surfaces |

Elevation is subtle by design: resting surfaces barely lift; only transient/floating elements
(toast) get `--shadow-float`.

---

## 5. Component patterns (recipes)

### Checkpoint panel
Standard surface card — no colored left accent bars (that pattern reads as vibe-coded).

- **Recipe:** `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, `box-shadow: var(--shadow-panel)`.
- **Semantic tone** comes from copy, chips, and headings — e.g. done banner `h2` in `--verified`, plan-pending text in `--attention` — not from a stripe on the card edge.
- Used for boundary review, plan approval, escalation, completion report, done banner.

### Alert / warning box (semantic variants)
Small tinted note = `padding ~0.5–0.65rem`, `border-radius: var(--radius-sm)`, `{tone}` + `{tone}-bg` + `1px solid {tone}`.

| Variant | Border / text | Background |
|---|---|---|
| Warn | `--attention` | `--attention-bg` |
| Success | `--verified` | `--verified-bg` |
| Error | `--danger` | `--danger-bg` |

Warnings appear **only pre-Accept**; clear them after acceptance (no stale warnings).

### Chip / pill
Base: `display: inline-flex; align-items: center; padding: 0.25–0.35rem 0.65–0.75rem;
border-radius: var(--radius-pill); border: 1px solid var(--border-strong); background: var(--surface); font-size: 0.8–0.85rem`.

Tone modifiers swap border/text/bg to a semantic pair:
- `.ok` / verified chip → teal pair
- attention chip → amber pair
- neutral badge → `--surface-sunk` fill, `--ink` text

### Button hierarchy

| Class | Look | When |
|---|---|---|
| `.primary` | ink fill, white text, `--ink-hover` on hover | The single forward action |
| `.secondary` | transparent fill, border, `--surface-sunk` hover | Alternative/cancel |
| default (no class) | `--surface` fill, `--border` | Tertiary/neutral |
| `.danger` | `--danger` fill, white text | Destructive/reject |
| `.option.default` | `--attention` border on surface | Pre-selected default choice in an option list (1-click accept) |

One primary per view. Escalation default option is visually pre-picked so it is one click.

### Stepper vs headings rule
Progress lives in the **`.flux-stepper`** (dots + connectors + labels), never in titles.
Checkpoint headings are plain descriptive text — **no "Step 3:" prefixes, no numbers**.
Stepper marker states: upcoming (hollow), current (amber fill + ring), completed (ink fill),
skipped (dashed, strike-through label), optional (label suffix).

---

## 6. Checkpoint visual language

Each checkpoint should *feel* like a distinct beat in a reviewed workflow.

| Checkpoint | Feel | Cue |
|---|---|---|
| Upload | Neutral, inviting | Plain panels, stepper start, contract pill |
| Boundary review | **Pause & verify** | Panel card, masked vs original side-by-side, mapping collapsed |
| Plan approval | **Editable intent** | Panel card, editable steps, contract chip |
| Running | **Live machinery** | Trace rail/panel expanded, mono events, live dot (teal) |
| Escalation | **Decision needed** | Panel card, evidence blockquote (sunk inset), default option pre-selected |
| Validate | **Contract vs delivery** | Merged completion report, PRD collapsed, warn only pre-Accept |
| Done | **Resolved** | Teal done banner, verdict chip, export action, no stale warnings |

Amber = the human must do something. Teal = the system is trustworthy/finished. Navy = neutral flow.

---

## 7. Anti-patterns ("vibe code" checklist)

Avoid these — they read as unpolished / off-brand:

- Hardcoded hex values in components instead of tokens.
- Inline shadows/radii instead of `--shadow-*` / `--radius-*`.
- Numbered step titles ("Step 2: …") — progress belongs to the stepper.
- Uppercasing Fraunces headings, or using serif for labels/trace.
- More than one `.primary` button in a view.
- Rainbow of accent colors — stay within amber / teal / navy / red semantics.
- Heavy drop shadows on resting surfaces (only `--shadow-float` floats).
- Dev noise leaking to users: Vultr JSON, session UUIDs, raw tokens, Gemma jargon.
- Stale warnings after Accept, or warnings shown when nothing is wrong.
- Mixing radii scales (random 3/5/8px) — snap to `sm/md/pill`.
- Colored **left accent bars** on cards (`border-left: 4px solid …`) — use uniform borders + semantic chips/headings instead.
- Placeholders/masked text in a proportional font — masked output is **mono**.

---

## 8. P3 scope

| Item | Phase | Status |
|---|---|---|
| Radius tokens (`--radius-sm/md/pill`) | P3a | Shipped |
| Elevation tokens (`--shadow-panel/float`) | P3a | Shipped |
| Typography tokens (`--text-meta`, `--text-label`) | P3a | Shipped |
| `--ink-muted` promoted to `:root` | P3a | Shipped |
| No left accent bars on checkpoint panels | P3a | Shipped |
| Consistent token usage across existing components | P3a | Shipped |
| Motion/transition tokens (hover, focus timing) | P3b | Deferred |
| Focus-visible ring system (a11y) | P3b | Deferred |
| Dark / high-contrast theme | P3b | Deferred |
| Density modes (compact spacing scale) | P3b | Deferred |
| Iconography set | P3b | Deferred |

P3a = tokenize + apply what already exists (no visual redesign). P3b = new capabilities layered on
the token base, done only after P3a validates.
