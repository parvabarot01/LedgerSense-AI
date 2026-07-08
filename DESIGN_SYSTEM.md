# Design System — "The Modern Ledger"

LedgerSense reinterprets double-entry bookkeeping (ruled ledger paper, red-and-black
accounting, matched vs. broken columns) as a clean, warm fintech instrument. It uses a warm
paper base rather than a cold dark theme: this is finance-desk software the user trusts
with their numbers, not a monitoring console. The core visual tension is **reconciled (in
balance) vs. exception (in the red)**, taken straight from the accountant's world.

## Color tokens

Defined as CSS custom properties in `src/app/globals.css`, exposed to Tailwind via
`tailwind.config.ts` (`bg-paper`, `text-ink-navy`, `bg-reconciled`, `text-exception`, etc.).

| Token | Variable | Hex | Meaning |
|---|---|---|---|
| Ledger paper | `--ledger-paper` | `#F7F4EC` | Warm off-white base, the ledger page |
| Paper raised | `--paper-raised` | `#FFFFFF` | Cards, tables, elevated surfaces |
| Ink navy | `--ink-navy` | `#141B22` | Primary text, the "black ink" of the ledger |
| Ink navy soft | `--ink-navy-soft` | `#4A5560` | Secondary text |
| Reconciled green | `--reconciled-green` | `#1F7A5C` | Matched / balanced / credit / cleared |
| Exception red | `--exception-red` | `#C0392B` | Unmatched / anomaly / "in the red" |
| Trace blue | `--trace-blue` | `#2D6CDF` | AI-explanation / grounding accent |
| Brass gold | `--brass-gold` | `#B8942F` | Approved / signed-off / maker-checker seal |
| Hairline | `--hairline` | `#E4DFD1` | 1px dividers |

**Rules that must stay consistent app-wide:**
- Reconciled-green vs. exception-red is the brand signature: it carries match status in
  tables, exception queues, and reconciliation summaries. Never repurpose these two colors
  for anything else (no green "success toast" unrelated to reconciliation, no red used for
  generic form errors, use a neutral state for those).
- Trace-blue is reserved for anything the AI explanation touches: the grounded "why this
  flagged" panel and the row-to-row links. Users learn "blue = traceable reasoning."
- Brass-gold appears ONLY on a signed-off/approved item. Never used decoratively.
- Contrast: exception-red on `--ledger-paper` and reconciled-green on `--ledger-paper` are
  both verified at AA (4.63:1 and 4.83:1 respectively at 16px+); both also pass against
  `--paper-raised`. Body text uses `--ink-navy` (14.1:1 on paper) or `--ink-navy-soft`
  (7.7:1) for secondary text, never a lighter gray that would drop below AA.

## Typography

- **Display / headings**: Fraunces (`--font-fraunces`), weights 500/600, used with restraint
  for page headers and key figures. A warm, slightly old-style serif nodding to printed
  ledgers without costuming the product as "ye olde bank."
- **Body / UI**: Inter (`--font-inter`), weights 400/500/600. Clean, neutral, dense enough
  for financial tables.
- **Data / mono / figures**: IBM Plex Mono (`--font-plex-mono`) for all amounts, balances,
  dates, and reference numbers. Always `font-variant-numeric: tabular-nums` (the `.money`
  and `.figures-tabular` utility classes in `globals.css` bake this in) so columns rule like
  a real ledger page.

## Layout system

Calm and precise, closer to a well-set financial statement than a busy dashboard. Generous
whitespace, hairline 1px dividers (`--hairline`), no heavy cards or drop shadows. Depth comes
from spacing and a single hairline, not elevation.

1. **Persistent left sidebar** (`src/components/layout/Sidebar.tsx`) — data sources,
   reconciliation sets, exceptions queue, approvals, reports. Navy-on-paper, active item
   marked by a thin brass-gold rail, not a filled block.
2. **Reconciliation split view** (`src/components/ledger/SplitView.tsx`) — the hero and the
   app's center of gravity. Left = source A, right = source B. Matched pairs align across
   the gutter on the same row with a faint green tint; a matched pair visibly links across
   the gutter on hover/focus. Unmatched rows sit in red-tinted rows or dashed "no match
   found" placeholders. Money is always right-aligned with tabular figures.
3. **Exceptions queue** (`src/components/ledger/ExceptionQueue.tsx`) — ordered by severity,
   then amount, then age, never arbitrary numbering. Each row: type, the specific rule that
   triggered it, the amount in mono, a status chip (open / in review / sealed).
4. **Exception detail** (`src/components/ledger/ExceptionDrawer.tsx`) — right-side drawer on
   desktop (split view stays visible behind it), full-screen route on mobile. Contains the
   exact flagged rows, the triggered rule, the trace-blue AI explanation grounded in those
   rows, a suggested resolution, and the maker-checker action bar.
5. **Executive view** (`/dashboard`) — calm statement-style overview: match rate, open vs.
   resolved, aging of unresolved breaks, largest/oldest exceptions.

## Signature elements

- **Reconciliation split view**: green (reconciled) and red (exception) rows reading like a
  true double-entry page, with a visible link across a matched pair.
- **Brass seal**: a signed-off exception is literally stamped closed (`BrassSeal.tsx`).

## UX principles

- Trust through calm: quiet, spacious, legible. No alarm-red everywhere; red appears only
  where something is genuinely unmatched.
- Traceability is visible: every AI explanation points at the exact rows and the stated rule.
  "Blue = you can trace it."
- Maker-checker is first-class, not a toggle: a maker proposes, a checker seals. Brass only
  on sealed items so the pending-vs-sealed state is obvious at a glance.
- Progressive depth: queue (glance) -> row (summary) -> detail drawer (full evidence + AI
  trace + approval). Never dump everything on one screen.
- Money reads like money: tabular figures, right-aligned, consistent decimals, thousands
  separators.
- Copy is plain and active ("Approve and seal," "Escalate to maker," "Dismiss exception,"
  "Unmatched, no counterpart in 3-day window"), sentence case.

## Motion & timing

Defined once in `tailwind.config.ts` (`transitionDuration`, `transitionTimingFunction`,
keyframes) and reused everywhere rather than hand-picked per component. Always honors
`prefers-reduced-motion` (see the reduced-motion block in `globals.css`, which collapses all
animation/transition durations to near-zero).

| Token | Value |
|---|---|
| `--dur-fast` | 150ms |
| `--dur-base` | 280ms |
| `--dur-slow` | 450ms |
| `--ease-out` | `cubic-bezier(.2,.7,.2,1)` |
| `--ease-inout` | `cubic-bezier(.4,0,.2,1)` |

- **Row settle** (`animate-settle`): opacity 0->1, translateY 6px->0, ~300ms ease-out,
  staggered slightly down a list so the ledger appears to "set." No bounce.
- **Match / clear**: red-tint to green-tint row transition on resolution, ~450ms ease-out.
  The product's emotional payoff; understated, not flashy.
- **Brass seal on approval** (`animate-stamp`): scale 1.15->1.0 with a short settle, ~350ms,
  a one-time stamp, never a loop.
- **Drawer open/close**: slides in from the right, ~280ms ease-out, split view behind dims
  very slightly (not a heavy scrim).
- **Trace reveal** (`animate-trace-pulse`): referenced source rows pulse trace-blue once,
  ~600ms, when an AI explanation renders.

## Quality floor

Responsive to mobile (split view stacks source A above source B), visible keyboard focus
(brass focus ring), WCAG-AA contrast verified above, reduced-motion honored throughout.
