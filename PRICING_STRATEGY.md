# LedgerSense: Pricing Strategy

**Owner:** Parva Barot
**Last updated:** 2026-07-07

## 1. Starting Point: The Zero-Dollar Constraint

LedgerSense runs entirely on free-tier infrastructure today: Vercel, Supabase (Postgres/Auth/Storage), Upstash (Redis/QStash), and Groq. That's not a temporary launch hack, it's a deliberate architecture decision that lets the product exist and be used by real teams before a single dollar of revenue or infrastructure cost is required.

But free tiers have real ceilings: request limits, storage caps, database row/connection limits, and rate limits on background job processing. Those ceilings are not a pricing gimmick, they're the actual point at which running a tenant's workload starts to cost something real to operate. That's the honest, defensible basis for a pricing model: **the free tier stays free because it's genuinely free to run; a paid tier exists because, past a certain usage point, it genuinely isn't.**

This is the core principle behind everything below: pricing tiers gate on usage dimensions that map directly to real infrastructure cost drivers (transaction volume, number of active reconciliation sets, seats, detection run frequency), not arbitrary feature paywalls designed purely to create upgrade pressure.

## 2. Tier Table

| | **Free** | **Team** | **Enterprise** |
|---|---|---|---|
| **Target user** | Solo analyst, small startup finance team, design partners, anyone evaluating LedgerSense | Growing startup/fintech finance or FinOps team with real recurring reconciliation volume | Larger finance orgs needing multi-entity, higher volume, and dedicated support |
| **Price** | $0 | Usage-based monthly (e.g. starting around $99-$299/mo depending on volume band) | Custom / annual contract |
| **Transaction volume** | Up to a defined free-tier ceiling per month (e.g. ~10,000 rows/month across all reconciliation sets, aligned to what Supabase/Upstash free tiers can absorb) | Higher monthly volume bands, scaling with usage | Custom volume, no hard ceiling |
| **Active reconciliation sets** | Limited (e.g. up to 2 concurrent sets) | Unlimited | Unlimited |
| **Seats (makers + checkers)** | Up to 3 users | Up to 15 users (expandable) | Unlimited, with SSO |
| **Detection run frequency** | Manual trigger only | Manual + scheduled/recurring runs | Manual + scheduled + priority queue processing |
| **AI explanation calls** | Included, subject to fair-use rate limiting | Included, higher rate limit ceiling | Included, dedicated capacity |
| **Audit trail export** | Included (this never gets paywalled, see below) | Included | Included, plus bulk/API export |
| **Integrations** | CSV upload only | CSV + direct bank/processor API connectors (once shipped, see ROADMAP.md) | CSV + connectors + ERP integrations |
| **Support** | Community/self-serve | Email support, reasonable response time | Dedicated support, onboarding assistance |
| **Data retention** | Standard retention window | Extended retention | Custom/compliance-driven retention |

Exact price points and volume bands are placeholders to be refined once real usage data exists (see Section 4). The structure, not the specific numbers, is the important part at this stage.

## 3. What Never Gets Gated

Two things stay free at every tier, on principle, not just as a growth tactic: **the audit trail and maker-checker governance itself.** Charging extra for the ability to prove who approved what would directly undermine the product's core promise to auditors and controllers, that this is a defensible system of record, not a feature they have to pay more to unlock. Governance is the product's differentiator; it can't also be the upsell.

What gets gated instead is capacity: how much volume, how many concurrent reconciliation sets, how many seats, how often detection runs automatically. That's an honest reflection of what actually costs more to run as usage grows.

## 4. Reasoning Tied to the Zero-Dollar Constraint

**Why freemium, not free trial.** A time-limited free trial creates pressure to convert before a team has had a real reconciliation cycle (weekly or monthly cadence) to evaluate the product against. Since LedgerSense's real value only shows up once a team has run detection and gone through a full maker-checker resolution, a trial that expires before that natural cycle completes would undercut adoption. A usage-capped free tier, with no time limit, lets a team use LedgerSense for as long as they want at their natural pace, and only pushes them toward payment when their own usage has genuinely grown past what free infrastructure can support.

**Why volume-based gates specifically.** Transaction volume and reconciliation set count are the two things that most directly drive real infrastructure cost (database rows, background job invocations, LLM calls). Gating on these means the free tier can stay genuinely free to operate as long as it's used by teams within that footprint, and the paid tier's price can be reasoned about honestly: it needs to cover the marginal cost of the infrastructure a heavier tenant actually consumes, plus margin, rather than being priced purely on perceived value.

**Why seat-based gating in addition to volume.** Maker-checker requires at least two distinct users to function at all, so seats can't be priced punitively low (a 1-seat tier would defeat the product's core workflow). The free tier's 3-seat allowance is set to comfortably support a small team practicing real maker-checker governance without hitting a wall immediately, while still creating a natural upgrade path once a team's finance org grows past a handful of people.

**Why no enterprise-style per-feature paywalls in the MVP-adjacent tiers.** Enterprise close-management tools often price by unlocking specific features (a matching rule type, a report format) behind higher tiers. LedgerSense deliberately avoids this in the Free/Team tiers because it fragments the actual value proposition (detection + explanation + governance as one coherent loop) into a confusing menu. Feature-level differentiation is reserved for the Enterprise tier, where genuinely different needs (SSO, dedicated support, custom retention, ERP integrations) justify a fundamentally different offering rather than a feature toggle.

**Why pricing isn't finalized yet.** LedgerSense is pre-monetization by design (see EXECUTIVE_SUMMARY.md): the priority right now is validating the core product loop with design partners, not extracting revenue from an unproven product. The tier structure above is the intended shape of pricing once monetization starts, but specific price points will be set based on actual observed usage patterns from early tenants (how close real teams get to free-tier ceilings, what volume bands look like in practice), not guessed in advance of that data.

## 5. When to Introduce Paid Tiers

Pricing shouldn't launch on a calendar date, it should launch when the data says it's time. Three signals, together, are the trigger:

1. **Design partners are consistently bumping into free-tier ceilings.** If tenants are naturally reaching the volume, seat, or reconciliation-set limits described above through organic usage (not because the limits were set artificially low), that's direct evidence the value delivered justifies payment, not a guess.
2. **The north star metric is trending up in a healthy, broad-based way** (see NORTH_STAR_METRIC.md): resolved exceptions with a full audit trail growing week over week, driven by multiple tenants rather than one large account, meaning the core loop is proven across more than one company's specific circumstances.
3. **At least one design partner has said, unprompted, that they'd pay for this.** Not "would you pay for this if we charged," but an organic signal that the product has crossed from "nice to have while it's free" to "worth budget."

Until those three signals show up, every tenant stays on the Free tier regardless of volume. Introducing paid tiers before there's real evidence of willingness to pay would risk optimizing for revenue capture over product validation, exactly backwards for a pre-launch product.

## 6. Risks to Watch

**Free tier becomes a permanent home for tenants who should upgrade.** If free-tier ceilings are set too generously, tenants may never feel the volume pressure that would otherwise justify moving to Team. The ceilings need periodic review against actual infrastructure cost data, not set once and forgotten.

**Paid tier priced against feature envy instead of cost.** The temptation, once revenue is on the table, is to price based on what competitors charge (BlackLine, Ledge, Numeric all charge far more) rather than what LedgerSense's own infrastructure costs justify. Pricing anchored to competitor rates rather than actual cost-plus-margin would undermine the entire "honest about the zero-dollar constraint" positioning that differentiates LedgerSense from those competitors in the first place.

**Governance features perceived as at risk of future paywalling.** Even though the plan explicitly keeps audit trail and maker-checker free at every tier, that commitment needs to be stated clearly and consistently in any pricing page copy, so design partners and early customers never have reason to worry that the thing they trust LedgerSense most for could later be gated.
