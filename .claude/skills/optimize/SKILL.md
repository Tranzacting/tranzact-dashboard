# /optimize — Campaign Optimization Agent

A self-learning campaign optimization skill for TranZact. Analyzes Facebook Ads and HubSpot funnel data, generates actionable recommendations, tracks outcomes, and evolves its knowledge over time.

## Data Sources

- **Facebook Ads**: Graph API direct (campaign-level spend, impressions, reach, clicks)
- **HubSpot CRM**: Deal search API for funnel stages (MQL → SQL → Demo → Paid)
- **Knowledge Base**: Supabase tables `optimization_learnings`, `optimization_recommendations`, `optimization_outcomes`

## Funnel Definitions (from lead_definitions.md)

- **MQL**: `form_is_manufacturing = 'Yes'` AND `form_designation IN ('Owner', 'HOD')`
- **SQL**: `first_demo_schedule_datetime` HAS_PROPERTY
- **Demo Done**: `first_demo_complete_datetime` HAS_PROPERTY
- **Paid**: `first_payment_date` HAS_PROPERTY

## Subcommands

### `/optimize review`

Run a deep weekly analysis. This is the core workflow.

**Steps:**

1. **Pull live data** by running:
   ```
   npx tsx scripts/optimization/pull-metrics.ts --days 7 --baseline-weeks 4
   ```
   This outputs JSON to stdout with: `fb_campaigns`, `hubspot_funnel` (with weekly history), and `anomalies`.

2. **Load existing knowledge** by running:
   ```
   npx tsx -e "
   import { getLearnings, getRecommendations } from './scripts/optimization/supabase-helpers.ts';
   const learnings = await getLearnings({ status: 'active' });
   const pending = await getRecommendations({ status: 'pending' });
   console.log(JSON.stringify({ learnings, pending_recommendations: pending }));
   "
   ```

3. **Analyze the data**. Look for:
   - Anomalies flagged in the pull-metrics output (any KPI >1.5 std dev from 4-week rolling average)
   - Campaigns with SQL% below 3% AND meaningful spend (>₹10,000/week)
   - Campaigns with SQL% above 8% that could be scaled
   - Funnel bottlenecks (where are leads dropping off?)
   - Compare current data against existing learnings — does the data confirm or contradict them?

4. **Generate 3-8 specific recommendations**. Each recommendation must have:
   - `action_type`: one of `pause_campaign`, `scale_campaign`, `shift_budget`, `change_audience`, `process_change`
   - `description`: clear, actionable instruction (e.g., "Pause campaign X — SQL% is 1.2% with ₹45K weekly spend")
   - `specifics`: JSON with `campaign_id`, `campaign_name`, `current_value`, `target_value`, `expected_impact`
   - `priority`: `critical` (losing money now), `high` (significant impact), `medium` (optimization), `low` (nice to have)
   - `learning_id`: reference the learning that supports this recommendation (if applicable)

5. **Write recommendations to Supabase** by running a script that uses `insertRecommendation()` from `supabase-helpers.ts`.

6. **Update existing learnings**:
   - If the data confirms a learning, increase `times_validated` by 1 and `confidence` by 0.05 (cap at 0.95)
   - If the data contradicts a learning, decrease `confidence` by 0.1. If confidence drops below 0.2, set `status = 'invalidated'`
   - If you discover a genuinely new pattern, insert a new learning with `confidence: 0.4` and `source: 'review'`

7. **Save a markdown report** to `reports/weekly-reviews/review-YYYY-MM-DD.md` with:
   - Date and period covered
   - Key metrics summary (spend, MQLs, SQLs, Demos, SQL%, CP Demo)
   - Anomalies detected
   - Recommendations generated (with priority)
   - Learnings updated/added
   - Comparison to previous review if one exists

8. **Print a formatted summary** to the terminal showing the key findings and recommendations.

### `/optimize track`

Measure outcomes of implemented recommendations and feed results back into the knowledge base.

**Steps:**

1. **Find implemented recommendations** by running:
   ```
   npx tsx -e "
   import { getRecommendations } from './scripts/optimization/supabase-helpers.ts';
   const recs = await getRecommendations({ status: 'implemented' });
   console.log(JSON.stringify(recs));
   "
   ```

2. **For each implemented recommendation**, re-pull the relevant metrics:
   - If it was a campaign action (pause/scale), pull that campaign's current metrics via `pull-metrics.ts`
   - Compare the `specifics.current_value` (baseline at recommendation time) to the new value

3. **Record outcomes** using `insertOutcome()`:
   - `baseline_metrics`: from the recommendation's `specifics`
   - `outcome_metrics`: the newly pulled metrics
   - `impact`: calculate `{ metric, before, after, delta_pct }`
   - `verdict`: `positive` if the target metric improved, `negative` if it worsened, `neutral` if no change, `inconclusive` if not enough data

4. **Feed back into learnings**:
   - Positive outcome → find the linked `learning_id`, increase confidence by 0.08, increment `times_validated`
   - Negative outcome → decrease confidence by 0.12
   - If a new pattern emerges from the outcome, insert a new learning

5. **Print results** showing each recommendation, what happened, and how learnings were updated.

### `/optimize status`

Quick overview of the current state.

**Steps:**

1. **Query active recommendations** grouped by status:
   ```
   npx tsx -e "
   import { getRecommendations, getLearnings } from './scripts/optimization/supabase-helpers.ts';
   const recs = await getRecommendations();
   const learnings = await getLearnings({ status: 'active' });
   console.log(JSON.stringify({ recommendations: recs, learnings }));
   "
   ```

2. **Print a formatted overview**:
   - **Pending recommendations** (awaiting action) — grouped by priority
   - **Implemented recommendations** (awaiting outcome measurement)
   - **Top 10 learnings** by confidence — show category, insight, confidence, times validated
   - **Stats**: total learnings, total recommendations, implementation rate

### `/optimize accept <id>`

Mark a recommendation as accepted. Use the recommendation ID from `/optimize status`.

### `/optimize implement <id>`

Mark a recommendation as implemented. This makes it eligible for outcome tracking on the next `/optimize track`.

### `/optimize reject <id> <reason>`

Mark a recommendation as rejected with a reason.

## Key Properties to Monitor

From `lead_definitions.md`, these HubSpot properties are most relevant for optimization:

- **Source**: `deal_source_25` (Facebook/Others)
- **Campaign**: `ads_campaign_name`, `adset_name`, `ads_name`
- **SDR**: `sdr_call_attempts`, `sdr_call_connects`
- **IS**: `is_meetings_scheduled`, `is_meetings_completed`, `is_icp_industry`
- **Sentiment**: `sd_sentiment` (1 = positive, correlated with higher SQL%)
- **Product/Painpoint**: `sd_product`, `sd_painpoint`

## Environment

Scripts load env vars from `dashboard/.env` and `.env.vercel`. Required vars:
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (in `.env.vercel`)
- `HUBSPOT_PRIVATE_APP_TOKEN` (in `dashboard/.env`)
- `FB_ADS_TOKEN`, `FB_ADS_ACCOUNT_ID` (in `dashboard/.env`)
