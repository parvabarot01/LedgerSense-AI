# LedgerSense: KPI Framework

**Last updated:** 2026-07-07

LedgerSense is differentiated on two things that are easy to under-measure: explainability (does the AI reasoning actually help, or is it decorative) and governance (does the approval trail hold up, or is it just a checkbox). This framework is organized by funnel stage, but is built specifically to keep those two things visible alongside the more obvious detection/volume metrics. Raw activity metrics (signups, transactions ingested) are included only as inputs, never as headline success measures, because they don't capture whether the product is actually resolving anything.

## 1. Activation

Getting a new tenant from signup to a completed, real reconciliation run.

| Metric | Definition | Why it matters |
|---|---|---|
| Time to first reconciliation set created | Signup → first reconciliation set defined (sources mapped, date range set) | Measures onboarding friction before any value is possible |
| Time to first detection run completed | Signup → first detection run finishes with results | The real "aha moment" is seeing exceptions surface, not just uploading a file |
| Time to first resolved exception | Signup → first exception fully resolved via maker-checker | This is the actual value delivery moment: not just detection, but a governed resolution |
| Column mapping completion rate | % of upload attempts that reach a successfully mapped, normalized ledger | A proxy for onboarding friction in the ingestion step specifically |

**Target framing:** activation isn't "signed up," it's "got to a resolved exception." A tenant that uploads data and sees a detection run but never resolves anything hasn't activated, they've sampled.

## 2. Engagement

Whether tenants keep using LedgerSense as an ongoing part of their reconciliation cadence, not a one-time trial.

| Metric | Definition | Why it matters |
|---|---|---|
| Weekly active reconciliation sets | Reconciliation sets with at least one detection run or exception action in the past 7 days | The core recurring-usage signal; reconciliation is inherently periodic (weekly/monthly), so this should track that cadence |
| Detection runs per active tenant per week | Count of detection runs triggered | Distinguishes tenants using LedgerSense as a real workflow tool vs a one-off experiment |
| Exceptions actioned per week (proposed or approved) | Count of maker or checker actions taken | Engagement isn't just running detection, it's working the queue it produces |
| Multi-user tenant activation | % of tenants with both a maker and a distinct checker actively participating | Directly measures whether the governance model is actually being used as intended, not bypassed |

## 3. Core Value Metrics

The metrics that most directly reflect whether LedgerSense is doing its job: finding real problems and helping resolve them correctly.

| Metric | Definition | Why it matters |
|---|---|---|
| Match rate | % of transactions across a reconciliation set's sources that match cleanly with no exception | The baseline health signal finance teams already think in; also feeds the executive dashboard |
| Exceptions found per reconciliation run | Count of exceptions surfaced, broken down by rule type (duplicate/outlier/mismatch/timing gap) | Tracks detection engine output; a sudden drop or spike by rule type is itself a signal worth investigating |
| Time-to-resolution | Median and p90 time from exception flagged to fully resolved (both maker and checker signed) | The metric that most directly reflects whether the workflow is actually reducing manual reconciliation burden |
| % of AI explanations accepted without material edit | % of exceptions where the maker's proposed resolution matches the AI's suggested resolution as-is | Direct proxy for whether the grounded explanation is trustworthy enough to act on, not just present |
| False positive rate by rule type | % of exceptions ultimately rejected/dismissed as not a real issue, by rule type | Keeps the detection engine honest; high false positive rates on a specific rule type indicate threshold tuning is needed |
| Exception aging | Count/percent of open exceptions older than a defined threshold (e.g. 14 days) | Leading indicator of a team falling behind, useful both to the team and to the executive dashboard |

## 4. Trust & Governance Metrics

These exist because LedgerSense's differentiation is explicitly governance and defensibility, not just detection. If these numbers aren't good, the product isn't delivering on its core promise regardless of how good detection is.

| Metric | Definition | Why it matters |
|---|---|---|
| Approval trail completeness | % of resolved exceptions with a fully intact maker → checker → resolution chain (no gaps, no same-person maker/checker) | This is the metric an auditor would actually check; it needs to be effectively 100% at all times, since the system structurally enforces it |
| Audit export usage | Count of audit trail exports per tenant per period | A leading indicator of who's actually relying on LedgerSense as their system of record for audit purposes, not just their working tool |
| Rejection rate on proposed resolutions | % of maker-proposed resolutions rejected by a checker | Not inherently good or bad, but a very low rate over time may indicate checkers are rubber-stamping rather than genuinely reviewing |
| Time-in-checker-queue | Median time an exception sits waiting for checker action after being proposed | A bottleneck here undermines the whole governance premise: if approval takes weeks, the workflow becomes a liability, not a feature |
| Explanation grounding accuracy (manual QA sample) | % of a periodically sampled set of AI explanations that correctly reference only actual flagged-row data, checked manually | Since ungrounded or fabricated explanations would be a serious trust failure, this needs an active QA process, not just an assumption |

## 5. Retention & Expansion Signals

Metrics that indicate whether a tenant is becoming a durable, growing customer rather than a churn risk.

| Metric | Definition | Why it matters |
|---|---|---|
| Reconciliation set count growth | Change in number of active reconciliation sets per tenant over time | Natural expansion signal: a tenant reconciling one processor today, three next quarter, is expanding usage organically |
| Seat growth (makers + checkers active) | Change in distinct active users per tenant over time | Governance requires at least two active users per tenant; growth beyond that reflects real organizational adoption |
| Month-over-month reconciliation cadence consistency | Whether a tenant's detection run cadence stays consistent or lapses | A lapsed cadence (was weekly, now silent for a month) is an early churn signal, often ahead of an explicit cancellation |
| Volume growth per reconciliation set | Change in transaction row count processed per set over time | As a tenant's own business grows, so should their usage, which is also the signal that eventually triggers a pricing tier upgrade (see PRICING_STRATEGY.md) |

## Explicitly Rejected as Headline Metrics

- **Total signups.** Says nothing about whether anyone got value; easy to inflate, easy to misread as traction.
- **Total transactions ingested.** A volume vanity metric. A tenant could ingest millions of rows and never resolve a single exception. Ingestion is a means, not the value delivered.
- **Total exceptions detected (raw count).** More detected exceptions isn't inherently good; it could reflect a noisy detection engine as easily as real problems. Needs to be paired with resolution and false-positive metrics to mean anything.
