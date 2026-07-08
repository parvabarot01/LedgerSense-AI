# Detection Methodology

This document describes the statistical rules and matching logic in
`src/lib/detection/`, and how AI explanations are grounded against them. The
engine is deliberately transparent and auditable: every rule is a plain
statistical threshold, not a black-box model, so a finance team can defend
every flag to an auditor.

## Matching engine (`matching.ts`)

Given two sides of a reconciliation set (source A, source B), the engine
produces matched, disputed, and unmatched buckets:

1. **Candidate generation.** For every pair `(a, b)` where the date delta is
   within the set's `match_window_days` and the amount delta is within
   `amount_tolerance` (a fraction of the larger absolute amount, floored at a
   $0.005 epsilon for rounding), the pair becomes a candidate.
2. **Exact vs. fuzzy.** A candidate is **exact** if the amount delta is at or
   below the rounding epsilon AND either the dates are identical or both
   records share the same reference number. Everything else that clears the
   window/tolerance is **fuzzy**.
3. **Greedy assignment.** Candidates are sorted (exact before fuzzy, then by
   smallest date delta, then smallest amount delta) and assigned greedily,
   one-to-one; a record can only appear in one pair. This is a deliberate
   choice over an optimal bipartite match (e.g. the Hungarian algorithm):
   reconciliation data is sparse enough that greedy-by-best-score produces
   the same practical result while staying trivial to explain to a user
   ("this pair matched because it was the closest exact/near match
   available").
4. **Exact matches** become `matched` pairs. **Fuzzy matches** become
   `disputed` pairs and also generate a `mismatch` exception (see below).
5. Everything left over is `unmatchedA` / `unmatchedB`.

## Statistical outliers (`outliers.ts`)

Run independently per side, using `simple-statistics` for z-score and
interquartile range (IQR):

- Requires at least 5 records; below that, "outlier" isn't a meaningful
  statistical claim, so the rule is skipped rather than guessed at.
- A record is flagged if it clears **either** a z-score of 2.5 (medium) / 3.0
  (high) standard deviations from the mean absolute amount, **or** falls
  outside the IQR fence (`Q1 - 1.5*IQR`, `Q3 + 1.5*IQR`).
- **Edge case handled:** when the middle 50% of values has zero spread (IQR =
  0), the fence collapses to a single point and would flag any trivial
  deviation as an outlier. The IQR rule is skipped whenever IQR is exactly 0,
  falling back to the z-score check alone.
- Severity is `high` when both checks agree (or the z-score clears 3.0),
  `medium` otherwise.

## Duplicates (`duplicates.ts`)

Groups records by exact `(amount, counterparty)`, then splits each group into
clusters by date proximity (a 3-day window). A cluster of 2+ records
becomes a `duplicate` exception; severity escalates to `high` at 3+ records
in one cluster. Grouping first by amount+counterparty (cheap, exact) before
clustering by date keeps two genuinely unrelated same-amount charges to the
same counterparty months apart from being flagged.

## Reconciliation mismatches

Not a separate detector: every `disputed` (fuzzy-matched) pair from the
matching engine becomes a `mismatch` exception, describing whichever
differs (amount delta or date delta) in plain language. Severity is `high`
when the amount delta is at least $100 or the date delta exceeds 1 day,
`medium` otherwise.

## Timing gaps vs. true unmatched (`timingGaps.ts`)

Records left over after matching are split by age, scaled to the
reconciliation set's own `match_window_days` (so a 3-day-window set and a
14-day-window set each get a threshold proportional to their own definition
of "normal" timing):

- **`timing_gap`** (severity `low`): age is at most `2x` the match window.
  Reads as "probably still in transit," not a real break.
- **`unmatched`** (severity `high`, or `critical` past `4x` the match
  window): old enough that a genuine reconciliation break is the more
  likely explanation than settlement lag.

## Detection run orchestration

`runDetection()` (pure function, no I/O) composes all of the above into one
pass and returns matches, exceptions, and a summary (`match_rate`,
per-bucket counts). `executeDetectionRun()` in `executeRun.ts` is the I/O
shell around it: it loads the two sides' records from Supabase, calls
`runDetection`, persists `matches` and `exceptions` rows against a
`detection_runs` row, and writes an audit log entry. It's shared by two
callers:

- **Synchronous (dev fallback).** The `triggerDetectionRun` server action
  calls it directly, inline, using the user's own session client, when
  QStash isn't configured. RLS still applies.
- **Async (QStash).** The action instead publishes a job to QStash pointing
  at `/api/detection/callback`, which verifies the request signature and
  calls the same function with a service-role client (there's no user
  session in a webhook request).

The same detection logic runs identically either way; only the I/O
transport around it changes.

## AI explanation grounding (`src/lib/ai/explain.ts`)

The explanation prompt is handed **only** the exception's rule
code/description/severity/amount and its exact flagged rows (date, amount,
counterparty, reference, description). The system prompt explicitly forbids
inventing anything outside that data and instructs the model to say so
plainly if the data is insufficient, rather than guess. The response is
constrained to strict JSON (`summary`, `groundedRule`, `suggestedResolution`)
so the UI can render it predictably. This is what the design system's
"blue = you can trace it" convention refers to: nothing in the explanation
panel should be traceable to anything other than the rows shown right next
to it.

## Natural-language query grounding (`src/lib/ai/query.ts`)

Scoped to one reconciliation set at a time. The full set of source records
and exceptions (capped at 300 rows per side as a context-size ceiling) is
handed to the model alongside the question, with the same "answer only from
what's given, say so if you can't" system prompt. At demo/free-tier scale
(hundreds of rows per set) this fits comfortably in a single prompt; past
that ceiling, this would need a real NL-to-filter layer against the database
instead of a context dump (noted as a scaling limit, not implemented here,
since the zero-dollar constraint doesn't currently need it).

## Rule reference

| Rule code | Type | Severity range |
|---|---|---|
| `STAT_OUTLIER_ZSCORE_IQR` | outlier | medium / high |
| `DUPLICATE_AMOUNT_COUNTERPARTY_WINDOW` | duplicate | medium / high |
| `RECONCILIATION_MISMATCH_AMOUNT_OR_DATE` | mismatch | medium / high |
| `TIMING_GAP_WITHIN_THRESHOLD` | timing_gap | low |
| `UNMATCHED_NO_COUNTERPART` | unmatched | high / critical |

All five are implemented and unit-tested in `tests/detection/`.
