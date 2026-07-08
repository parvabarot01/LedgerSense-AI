# LedgerSense: North Star Metric

**Last updated:** 2026-07-07

## The Metric

**Reconciliation exceptions resolved per week with a complete, audited maker-checker trail.**

Defined precisely: the count of exceptions, across all active tenants, that reach full resolution (maker proposed, checker approved, distinct from the maker) in a given week, where "resolved" requires an intact audit chain from detection through explanation through approval.

## Why This Metric, and Not Something Else

LedgerSense is not a detection tool that happens to have governance bolted on. It is a governance and explainability product built on top of a detection engine. The distinction matters for choosing a north star, because it's easy to default to a metric that only measures the detection half of the product (exceptions found, transactions processed) and miss the half that's actually the differentiator (exceptions resolved correctly, with a defensible trail).

Three things this metric captures that a simpler metric wouldn't:

1. **It requires the full loop to have run, not just a piece of it.** An exception isn't counted until it's been flagged, explained, proposed by a maker, and approved by a distinct checker. A tenant that runs detection constantly but never resolves anything scores zero on this metric, correctly, because that tenant isn't getting the product's actual value. Detection without resolution is just a more sophisticated way of generating a to-do list nobody does.

2. **It bakes in the governance requirement structurally.** Because "resolved" is defined to require a complete maker-checker chain, this metric cannot go up by cutting corners on governance. A tenant that lets one person both propose and approve (which the system doesn't allow) or that has no real checker participation cannot produce a high number here even if they're technically clearing exceptions some other way. The metric and the product's core promise move together by construction.

3. **It's a weekly rate, not a cumulative count.** Reconciliation is inherently periodic; finance teams think in weekly and monthly cycles. A weekly rate reflects ongoing, healthy usage rather than a one-time burst (e.g., a tenant that resolves 500 exceptions once during onboarding and then goes quiet would show a declining trend on this metric, correctly flagging a retention risk that a cumulative counter would hide).

## What Ladders Up Into It

This is a north star, not the only metric that matters (see KPI_FRAMEWORK.md for the full set), but these are the direct inputs that move it:

- **Active reconciliation sets** (more sets running detection → more raw material for exceptions).
- **Detection run frequency and quality** (an exception has to be found before it can be resolved; poor detection thresholds either miss real issues or flood the queue with noise that never gets resolved).
- **Explanation quality/trust** (measured by % of AI explanations accepted without material edit; a maker won't propose a resolution quickly if they don't trust the explanation, which slows the whole chain).
- **Checker responsiveness** (time-in-checker-queue; if checkers are a bottleneck, exceptions pile up proposed-but-not-approved and never convert into the north star number).
- **Multi-user tenant activation** (a tenant needs a genuine, distinct maker and checker for this metric to move at all; a single-user tenant structurally cannot produce a fully governed resolution).

Improving any of these moves the north star. That's intentional: it means the metric functions as a genuine aggregator of product health across ingestion, detection, explanation, and governance, rather than optimizing one pillar at the expense of the others.

## Alternatives Considered and Rejected

**Total signups / active tenants.** Rejected as a north star because it measures top-of-funnel interest, not product value delivered. A tenant can sign up and never touch the core loop. Useful as a GTM metric, wrong as a north star.

**Total transactions ingested.** Rejected because it's a volume metric with no connection to whether anything useful happened with that volume. A tenant could ingest a huge CSV once and never run detection. It also perversely rewards larger, messier uploads rather than better outcomes.

**Total exceptions detected (raw count).** Rejected because raw detection count conflates a well-tuned engine with a noisy one. A detection engine that flags everything as an exception would score extremely well on this metric while being actively harmful (alert fatigue, wasted reviewer time). This metric needs a "resolved" and "audited" qualifier to mean anything, which is exactly what the chosen north star adds.

**Match rate.** Rejected as a north star (though it remains an important dashboard metric) because it's a snapshot health indicator, not a measure of the product doing active work. A tenant with a naturally high match rate (few real discrepancies) would look "successful" on this metric while barely using LedgerSense's differentiated capability. It's a good input to the executive dashboard, a poor choice for what the whole company should be optimizing toward.

**Time-to-resolution (median).** Rejected as the single north star because speed alone, without a volume/completion component, could be gamed by only resolving the easiest exceptions quickly while letting harder ones sit. It's an important supporting metric (and a component of overall health) but not sufficient on its own to represent whether the product is delivering its full value.

**Revenue / paid conversions.** Rejected for this stage specifically. LedgerSense is pre-monetization (see PRICING_STRATEGY.md); a revenue north star would be premature and would pull focus away from proving the core loop works before there's a business model attached to it. Revenue becomes a relevant lagging indicator once the product-market fit signal (this north star, trending up and to the right, with healthy underlying inputs) is established.

## How to Read It Going Forward

A healthy trend looks like: the metric rising week over week as more tenants activate, driven by broad-based improvement in the underlying inputs (more sets, faster checker response, higher explanation trust) rather than a spike from one large tenant. A red flag looks like: raw exceptions detected rising while this metric stays flat or falls, which would indicate the detection engine is working but the governance loop is stalling, exactly the failure mode this metric is designed to surface early.
