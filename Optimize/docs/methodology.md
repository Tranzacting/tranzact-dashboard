# Campaign Optimization Methodology

> **Audience:** Senior management, marketing, SDR leadership, IS/SD team, rev ops.
> **Purpose:** Single source of truth on how TranZact evaluates paid campaigns, decides what to pause/scale, and learns over time. Every decision rule here is reasoned — stakeholders can challenge the logic, not just the outcomes.
> **Owner:** Growth / marketing analytics.
> **Status:** Living document. Last updated 2026-04-20.

---

## 1. Why this exists

Paid campaigns at TranZact feed a funnel that takes weeks — not days — to resolve. A single week of MQL or CTR data is noise; acting on it has killed good campaigns in the past and kept bad ones alive.

This document codifies:
1. How we define every funnel stage (so "SQL" means the same thing in every conversation).
2. Which cohort we look at when we judge a campaign (so we compare mature data to mature data).
3. What benchmarks constitute "performing" vs "failing."
4. When we pause, when we scale, when we wait.
5. How the system learns over time and avoids repeating past mistakes.

Every recommendation that comes out of `/optimize review` is expected to cite the rules in this doc. If a rule produces a wrong call, we update the rule — not quietly work around it.

---

## 2. Lead funnel — definitions

All definitions come from HubSpot deal properties. Source: `lead_definitions.md` in the repo.

| Stage | HubSpot condition | Plain-language meaning |
|---|---|---|
| **MQL** — Marketing Qualified Lead | `form_is_manufacturing = 'Yes'` AND `form_designation IN ('Owner', 'HOD')` | A form submission from a manufacturing business where the person is an Owner or Head of Department. Minimum bar for "fits our ICP." |
| **SQL** — Sales Qualified Lead | `first_demo_schedule_datetime HAS_PROPERTY` | A demo has been booked on the calendar. Sales has the lead. |
| **Demo Done** | `first_demo_complete_datetime HAS_PROPERTY` | The demo actually happened. |
| **Paid** | `first_payment_date HAS_PROPERTY` | Customer paid. Revenue recognized. |

**Why MQL is form-level, not lead-level:** we cannot control what shows up in the ad form. The MQL definition is the first filter we *can* apply — manufacturing + decision-maker — so that SQL% is measured against a pool of leads that at least resemble our ICP.

---

## 3. The full funnel we actually measure

A lead doesn't jump from MQL to SQL — it travels through layers. Understanding which layer leaks tells us whether a gap is a **campaign** problem or a **process** problem. We walk all of these before any pause/scale call.

```
Paid ad impression
   │
   ▼
Form fill  ──►  MQL (manufacturing + Owner/HOD)
   │
   ▼
SD AI qualification call  (within 5 min of form fill)
   │        • Metrics: sd_sentiment, sd_product, sd_painpoint
   ▼
SDR outreach
   │        • Metrics: sdr_call_attempts, sdr_call_connects
   ▼
Call connect  (human-to-human)
   │        • Connect rate = connects ÷ attempts
   ▼
SDR qualification + demo booking
   │        • Metrics: is_meetings_scheduled, is_icp_industry
   ▼
SQL  (first_demo_schedule_datetime set)
   │
   ▼
Demo Done
   │
   ▼
Paid
```

**What each layer tells us:**

| Layer | Question it answers |
|---|---|
| MQL volume & quality | Are we getting enough of the right shape of lead from the ad? |
| SD AI sentiment | Does the first AI call flag this lead as worth pursuing? |
| SDR call attempts | Is SDR actually working the lead? (Target: 5+ attempts) |
| Call connect rate | Can SDR reach the human at all? |
| SD → SQL conversion | Does a "positive" SD signal translate into a booked demo? |
| SQL → Demo | Do booked demos actually happen? |
| Demo → Paid | Does the demo convert to revenue? |

When SQL% is low, the first question is always: **which layer is leaking?** If connect rate is the bottleneck, no amount of audience change fixes it.

---

## 4. Why we use W-2 cohort SQL%, not same-week SQL%

**Same-week SQL%** answers: *"of MQLs this week, how many SQL'd this week?"* — but SQLs happen 1-3 weeks after MQL arrival. The two populations don't overlap, so the ratio is nonsense.

**W-2 cohort SQL%** answers: *"of MQLs that came in two weeks ago, how many are SQLs today?"* — by the time we look at it, the cohort has had enough time for most conversions to occur. This is the apples-to-apples number.

### Cohort naming convention

| Label | Window (relative to today) | Use |
|---|---|---|
| **W-0** | This week (in-progress) | Directional only. Cohort hasn't matured. |
| **W-1** | Last complete week | Late indicator. Partially mature. |
| **W-2** | Two weeks ago | **The verdict.** Mature enough to trust SQL%. |
| **W-3, W-4** | Further back | Trend context. Supersedes W-2 if the situation is changing fast. |

**Rule:** Pause/scale decisions use W-2 as the primary evidence. W-0 / W-1 numbers are watched but not acted on unless the signal is extreme (e.g., campaign has spent ₹50K+ with zero MQLs).

---

## 5. Benchmarks

Three numbers define "performing." These are derived from historical best-weeks, not aspirational targets.

| Benchmark | Target | Why this number |
|---|---|---|
| **Weekly MQLs** | **≥ 700** | Volume floor — below this, SDR team is under-fed and SQL math can't hit target regardless of quality |
| **Weekly SQLs** | **≥ 40** | Sales capacity and revenue plan both built around this throughput |
| **W-2 cohort SQL%** | **≥ 10%** | Conversion efficiency floor — ensures we aren't paying for unqualified volume |

A campaign or a week that misses all three is a clear underperformance. Missing one is a flag; missing two is an investigation; missing all three is a "we have a problem."

### What "fairly best" looks like at the weekly level

- ≥700 MQLs, ≥40 SQLs, ≥10% W-2 SQL%, + call connect rate ≥35%, + paid deals tracking to ≥8/week at the week's quality level.

---

## 6. Decision rules

Each rule below has its **reason** attached — if the reason ceases to hold, the rule should be retired.

### Rule 1 — When to **pause** a campaign
**Trigger:** W-2 cohort SQL% < 2% on ≥50 MQLs AND W-1 cohort confirms the pattern (SQL% < 3%).
**Reason:** Two mature cohorts confirming zero-to-near-zero conversion is as strong a signal as we can get from historical data. Acting on one week risks killing a campaign mid-ramp.
**Exception:** If full-funnel layers (connect rate, SD+, SDR attempts) are clearly broken at the campaign level, the issue might be process — investigate first, don't pause.

### Rule 2 — When to **scale** a campaign
**Trigger:** W-2 SQL% ≥ 10% AND campaign has produced ≥100 MQLs over W-2 + W-1 (enough sample) AND funnel layers are healthy.
**Reason:** 10% is the benchmark; we don't scale what doesn't meet it. Below-benchmark scaling amplifies loss.
**Exception:** Never scale into a situation where attribution is broken — we need to know what we're scaling.

### Rule 3 — When to **hold** (do nothing yet)
**Trigger:** Campaign has <20 MQLs in W-2 (too new) OR campaign is within ±2pp of benchmarks (not clearly good or bad).
**Reason:** Premature calls cost more than waiting a week. Small samples produce noise.

### Rule 4 — When to **investigate** instead of acting
**Trigger:** Full-funnel layers across multiple campaigns are uniform but SQL% is below benchmark.
**Reason:** That pattern means the gap is **systemic** (SDR throughput, MQL quality, SD calibration), not campaign-specific. Pausing individual campaigns won't move the needle.

### Rule 5 — When to shift budget
**Trigger:** Campaign A meets Rule 2 (scale) AND Campaign B meets Rule 1 (pause) AND budget is bounded.
**Reason:** Redirects spend from a proven loser to a proven winner. Never shift into an unproven or untagged source.

---

## 7. Channel groups & where the weekly numbers live

We split MQLs into two groups for analysis:

1. **Paid ads (Facebook)** — leads with `ads_campaign_name` populated. This is what the optimization loop acts on (pause / scale campaigns).
2. **Warm / Direct / Partner / Inbound** — leads without `ads_campaign_name`, spanning channel-partner, direct outreach, references, inbound email/phone, organic, and sales-initiated. Not scaled through ad spend; tracked separately so paid SQL% isn't confused with blended SQL%.

### Weekly numbers are in sub-pages

Each Monday's `/optimize review` creates a **sub-page** under this methodology doc, titled like **`W16 (13 - 19)`** (ISO week number + date range of the week being reviewed). That sub-page contains:

- The benchmark scorecard for the completed week.
- W-2 cohort table by campaign with full-funnel layers.
- Warm / Direct / Partner / Inbound snapshot.
- Recommendations generated that week.
- Weekly W-0 → W-4 comparison history (inside a collapsed toggle block so the page stays tidy).

This methodology doc stays stable; weekly state lives in its child sub-pages. Reason: separates durable rules from ephemeral snapshots so neither clutters the other.

---

## 8. Knowledge base & self-learning loop

The optimization agent keeps three Supabase tables that together form a memory of what the business has learned.

| Table | What it holds |
|---|---|
| `optimization_learnings` | Persistent insights (e.g., "cluster audiences outperform broad LA") with a confidence score 0.0-1.0 |
| `optimization_recommendations` | Specific actions proposed in a review, with status (pending / accepted / implemented / rejected) |
| `optimization_outcomes` | Measured results of implemented recommendations, fed back into learning confidence |

### How confidence evolves
- A learning starts at confidence 0.4-0.6 (seed or new observation).
- Every time new data confirms it: +0.05 confidence, +1 times_validated.
- Every time new data contradicts it: −0.10 confidence.
- Positive outcome from an implemented recommendation linked to the learning: +0.08.
- Negative outcome: −0.12.
- If confidence drops below 0.2, the learning is marked `invalidated`.

This means the system cannot stay wrong for long — consistent contradiction removes weak learnings, and consistent validation hardens strong ones.

### Example active learnings (excerpt)

| Insight | Confidence | Validations |
|---|---|---|
| Cluster/custom audiences outperform broad lookalikes on SQL% (LA-CBO repeatedly validates) | 0.75 | 3 |
| ICP-qualified leads convert ~2× better to SQL | 0.70 | 0 (seed) |
| SDR follow-up volume (call attempts) is a primary SQL lever | 0.60 | 0 (seed) |
| W-2 SQL% 3-8% is systemic across campaigns — connect rate + MQL quality drive the gap, not campaign selection | 0.50 | 0 (new 2026-04-17) |
| Campaigns with <20 MQLs in W-2 cannot be judged on SQL% | 0.60 | 0 (methodology guardrail) |

---

## 9. The `/optimize` workflow

A single CLI skill drives the entire loop. Each subcommand corresponds to one stage.

| Command | What it does | When to run |
|---|---|---|
| `/optimize review` | Pulls live FB + HubSpot data, compares to W-2 cohort + benchmarks + existing learnings, generates 3-8 recommendations, writes a Notion weekly sub-page titled `Wxx (dd - dd)`, updates learnings | **Mondays** — covers the just-completed Mon–Sun week |
| `/optimize status` | Shows pending recommendations, top learnings by confidence, implementation rate | Anytime |
| `/optimize accept <id>` | Human approves a recommendation | **Monday** after review |
| `/optimize implement <id>` | Human confirms the action was taken | **Monday** after review (same day as accept) |
| `/optimize reject <id> <reason>` | Dismiss a recommendation with a recorded reason | When the rec doesn't apply; reasons feed into learnings |
| `/optimize track` | Re-pulls metrics for each implemented recommendation, scores the outcome, updates learning confidence | **Following Monday** — one full week after implementation |

**Why Mondays:** reason — by Monday morning, the previous Mon–Sun week is complete and the data is stable. Running mid-week means comparing against a half-baked cohort.

**Governance:** `/optimize review` cannot change campaigns on its own — it produces *recommendations*. Humans accept / reject / implement. The system learns from those decisions.

---

## 10. Known issues & open questions

Each item below needs a named owner and a date.

| Issue | Why it matters | Owner (TBD) |
|---|---|---|
| Connect rate stuck at 30% across every paid campaign | 65-70% of MQLs never reach a human — biggest single lever to W-2 SQL% | SDR team |
| SD+ sentiment at 23% vs SQL% at 3.68% | Either SDR doesn't act on SD flags, or SD AI is miscalibrated | SD AI + SDR leads |
| `is_icp_industry` property is empty across all W-0–W-4 cohorts | Cannot validate the ICP learning; audit needed | IS team |
| Paid = 0 in recent 2 weeks | Probably attribution lag (deals close after several weeks) but needs a sales pulse check | Sales team |

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **MQL** | Marketing Qualified Lead — see §2 |
| **SQL** | Sales Qualified Lead — demo booked |
| **W-N cohort** | Leads that became MQLs N weeks ago, measured *today* |
| **Connect rate** | SDR call connects ÷ SDR call attempts |
| **SD** | Sales Development AI — automated first qualification call within 5 min of form submit |
| **SDR** | Sales Development Representative (human) |
| **CBO** | Campaign Budget Optimization (Meta) |
| **LA** | Lookalike audience (Meta) |
| **ICP** | Ideal Customer Profile |

---

## 12. Changelog

| Date | Change | Reason |
|---|---|---|
| 2026-04-17 | Initial version | Consolidate methodology after `/optimize review v2` rewrote evaluation rules to use W-2 cohort + full-funnel walk |
| 2026-04-17 | Renamed "(no campaign)" segment to **Warm / Direct / Partner / Inbound** and removed the "attribution leak" framing | Source split showed zero Facebook leads in this pool — it's a distinct non-paid channel group, not a tracking gap |
| 2026-04-20 | Cadence fixed to **Mondays** (ISO weeks). Weekly numeric state moved out of §7 into dedicated Notion sub-pages titled `Wxx (dd - dd)` | Prior §7 snapshot re-wrote every review and polluted the stable methodology doc; Monday cadence ensures Mon–Sun cohort is complete before review |
