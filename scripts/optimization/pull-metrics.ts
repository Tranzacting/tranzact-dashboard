import dotenv from "dotenv";

// Load env vars: dashboard/.env has all API keys, .env.vercel has Supabase
dotenv.config({ path: "dashboard/.env" });
dotenv.config({ path: ".env.vercel" });

// --- Environment ---
const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? "";
const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? "";
const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? "";

// --- Helpers ---

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

function weekStart(d: Date): string {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() - (day === 0 ? 6 : day - 1));
  return dateStr(copy);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
}

// --- Facebook: campaign-level data from Graph API (reused from api/meta-ads.js:22-80) ---

interface FBCampaignRow {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
}

async function fetchFBCampaignMetrics(since: string, until: string): Promise<FBCampaignRow[]> {
  if (!FB_ADS_TOKEN || !FB_ADS_ACCOUNT_ID) return [];
  const accountId = FB_ADS_ACCOUNT_ID.replace("act_", "");
  const baseUrl =
    `https://graph.facebook.com/v19.0/act_${accountId}/insights` +
    `?fields=campaign_id,campaign_name,spend,impressions,reach,clicks` +
    `&level=campaign&time_increment=1` +
    `&time_range[since]=${since}&time_range[until]=${until}` +
    `&limit=500&access_token=${FB_ADS_TOKEN}`;

  const rows: Array<{ date: string; campaign_id: string; campaign_name: string; spend: number; impressions: number; reach: number; clicks: number }> = [];
  let nextUrl: string | null = baseUrl;

  while (nextUrl && rows.length < 20000) {
    try {
      const res = await fetch(nextUrl);
      if (!res.ok) { console.error("FB API error:", res.status); break; }
      const data = await res.json() as {
        data?: Array<{ date_start: string; campaign_id: string; campaign_name: string; spend: string; impressions: string; reach: string; clicks: string }>;
        paging?: { next?: string };
        error?: { message: string };
      };
      if (data.error) { console.error("FB API error:", data.error.message); break; }
      for (const r of data.data ?? []) {
        rows.push({
          date: r.date_start, campaign_id: r.campaign_id, campaign_name: r.campaign_name,
          spend: parseFloat(r.spend || "0"), impressions: parseInt(r.impressions || "0"),
          reach: parseInt(r.reach || "0"), clicks: parseInt(r.clicks || "0"),
        });
      }
      nextUrl = data.paging?.next ?? null;
    } catch (e) { console.error("FB fetch error:", e); break; }
  }

  // Aggregate daily rows by campaign
  const byCampaign = new Map<string, FBCampaignRow>();
  for (const r of rows) {
    const existing = byCampaign.get(r.campaign_id) ?? {
      campaign_id: r.campaign_id, campaign_name: r.campaign_name,
      spend: 0, impressions: 0, reach: 0, clicks: 0,
    };
    existing.spend += r.spend;
    existing.impressions += r.impressions;
    existing.reach += r.reach;
    existing.clicks += r.clicks;
    byCampaign.set(r.campaign_id, existing);
  }
  return Array.from(byCampaign.values());
}

// --- HubSpot (reused from api/funnel.js:125-156) ---

interface HSDeal {
  [key: string]: string;
}

async function fetchHSDeals(
  dateProperty: string,
  sinceTs: string,
  untilTs: string,
  extraFilters: Array<{ propertyName: string; operator: string; value?: string; values?: string[] }>,
  properties: string[]
): Promise<HSDeal[]> {
  if (!HS_TOKEN) return [];
  const deals: HSDeal[] = [];
  let after: string | undefined;
  while (true) {
    const body: Record<string, unknown> = {
      filterGroups: [{
        filters: [
          { propertyName: dateProperty, operator: "GTE", value: sinceTs },
          { propertyName: dateProperty, operator: "LTE", value: untilTs },
          ...extraFilters,
        ],
      }],
      properties,
      limit: 100,
      ...(after ? { after } : {}),
    };
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${HS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) break;
    const data = await res.json() as {
      results?: Array<{ properties: HSDeal }>;
      paging?: { next?: { after: string } };
    };
    for (const r of data.results ?? []) deals.push(r.properties);
    if (!data.paging?.next?.after || deals.length >= 5000) break;
    after = data.paging.next.after;
  }
  return deals;
}

// --- Build funnel counts ---

const MQL_FILTERS = [
  { propertyName: "form_is_manufacturing", operator: "EQ", value: "Yes" },
  { propertyName: "form_designation", operator: "IN", values: ["Owner", "HOD"] },
] as Array<{ propertyName: string; operator: string; value?: string; values?: string[] }>;

const FUNNEL_PROPS = ["deal_source_25", "ads_campaign_name"];

interface FunnelCounts {
  mqls: number;
  sqls: number;
  demos: number;
  paid: number;
}

interface FunnelDeals {
  mqlDeals: HSDeal[];
  sqlDeals: HSDeal[];
  demoDeals: HSDeal[];
  paidDeals: HSDeal[];
}

async function fetchFunnelDeals(since: string, until: string): Promise<FunnelDeals> {
  const sinceTs = String(new Date(since + "T00:00:00+05:30").getTime());
  const untilTs = String(new Date(until + "T23:59:59+05:30").getTime());

  const [mqlDeals, sqlDeals, demoDeals, paidDeals] = await Promise.all([
    fetchHSDeals("last_crm_lead_datetime", sinceTs, untilTs, MQL_FILTERS, FUNNEL_PROPS),
    fetchHSDeals("first_demo_schedule_datetime", sinceTs, untilTs, [], FUNNEL_PROPS),
    fetchHSDeals("first_demo_complete_datetime", sinceTs, untilTs, [], FUNNEL_PROPS),
    fetchHSDeals("first_payment_date", sinceTs, untilTs, [], FUNNEL_PROPS),
  ]);

  return { mqlDeals, sqlDeals, demoDeals, paidDeals };
}

function countDeals(deals: FunnelDeals): FunnelCounts {
  return {
    mqls: deals.mqlDeals.length,
    sqls: deals.sqlDeals.length,
    demos: deals.demoDeals.length,
    paid: deals.paidDeals.length,
  };
}

// --- Campaign-level funnel attribution ---

interface CampaignFunnel {
  campaign_name: string;
  mqls: number;
  sqls: number;
  demos: number;
  paid: number;
  sql_pct: number;
  demo_pct: number;
}

function groupDealsByCampaign(deals: FunnelDeals): CampaignFunnel[] {
  // Count deals per ads_campaign_name for each stage
  const countBy = (dealList: HSDeal[]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const d of dealList) {
      const name = d.ads_campaign_name || "(no campaign)";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  };

  const mqlBy = countBy(deals.mqlDeals);
  const sqlBy = countBy(deals.sqlDeals);
  const demoBy = countBy(deals.demoDeals);
  const paidBy = countBy(deals.paidDeals);

  // Collect all campaign names across all stages
  const allNames = new Set([...mqlBy.keys(), ...sqlBy.keys(), ...demoBy.keys(), ...paidBy.keys()]);

  const results: CampaignFunnel[] = [];
  for (const name of allNames) {
    const mqls = mqlBy.get(name) ?? 0;
    const sqls = sqlBy.get(name) ?? 0;
    const demos = demoBy.get(name) ?? 0;
    const paid = paidBy.get(name) ?? 0;
    results.push({
      campaign_name: name,
      mqls, sqls, demos, paid,
      sql_pct: mqls > 0 ? (sqls / mqls) * 100 : 0,
      demo_pct: sqls > 0 ? (demos / sqls) * 100 : 0,
    });
  }

  // Sort by MQLs descending
  return results.sort((a, b) => b.mqls - a.mqls);
}

// Simple wrapper for weekly history (doesn't need deal-level data)
async function fetchFunnelCounts(since: string, until: string): Promise<FunnelCounts> {
  const deals = await fetchFunnelDeals(since, until);
  return countDeals(deals);
}

// --- Compute metrics with comparison ---

interface CampaignMetrics {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  current: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number };
  baseline: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number };
  delta_spend_pct: number;
  delta_ctr_pct: number;
}

function computeCampaignMetrics(
  current: { campaign_id: string; campaign_name: string; spend: number; impressions: number; clicks: number }[],
  baseline: { campaign_id: string; spend: number; impressions: number; clicks: number }[],
  channel: string,
  baselineWeeks: number
): CampaignMetrics[] {
  const baseMap = new Map(baseline.map(b => [b.campaign_id, b]));
  return current.map(c => {
    const b = baseMap.get(c.campaign_id);
    const weeklyBaseline = b
      ? { spend: b.spend / baselineWeeks, impressions: b.impressions / baselineWeeks, clicks: b.clicks / baselineWeeks }
      : { spend: 0, impressions: 0, clicks: 0 };

    const cCtr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
    const cCpc = c.clicks > 0 ? c.spend / c.clicks : 0;
    const bCtr = weeklyBaseline.impressions > 0 ? (weeklyBaseline.clicks / weeklyBaseline.impressions) * 100 : 0;
    const bCpc = weeklyBaseline.clicks > 0 ? weeklyBaseline.spend / weeklyBaseline.clicks : 0;

    return {
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      channel,
      current: { spend: c.spend, impressions: c.impressions, clicks: c.clicks, ctr: cCtr, cpc: cCpc },
      baseline: { spend: weeklyBaseline.spend, impressions: weeklyBaseline.impressions, clicks: weeklyBaseline.clicks, ctr: bCtr, cpc: bCpc },
      delta_spend_pct: weeklyBaseline.spend > 0 ? ((c.spend - weeklyBaseline.spend) / weeklyBaseline.spend) * 100 : 0,
      delta_ctr_pct: bCtr > 0 ? ((cCtr - bCtr) / bCtr) * 100 : 0,
    };
  });
}

// --- Anomaly detection ---

interface Anomaly {
  metric: string;
  channel: string;
  current_value: number;
  baseline_avg: number;
  baseline_stddev: number;
  deviation: number;
  direction: "up" | "down";
  severity: "warning" | "critical";
}

function detectAnomalies(weeklyValues: { label: string; channel: string; values: number[]; current: number }[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (const { label, channel, values, current } of weeklyValues) {
    if (values.length < 2) continue;
    const m = mean(values);
    const sd = stdDev(values);
    if (sd === 0) continue;
    const deviation = (current - m) / sd;
    if (Math.abs(deviation) >= 1.5) {
      anomalies.push({
        metric: label,
        channel,
        current_value: current,
        baseline_avg: m,
        baseline_stddev: sd,
        deviation,
        direction: deviation > 0 ? "up" : "down",
        severity: Math.abs(deviation) >= 2.5 ? "critical" : "warning",
      });
    }
  }
  return anomalies;
}

// --- Weekly funnel for anomaly baseline ---

async function fetchWeeklyFunnelHistory(numWeeks: number): Promise<Array<FunnelCounts & { week_start: string }>> {
  const weeks: Array<FunnelCounts & { week_start: string }> = [];
  const now = new Date();
  for (let i = 0; i < numWeeks; i++) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const counts = await fetchFunnelCounts(dateStr(start), dateStr(end));
    weeks.push({ ...counts, week_start: weekStart(start) });
  }
  return weeks.reverse();
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const daysFlag = parseInt(args.find((_, i) => args[i - 1] === "--days") ?? "7");
  const baselineWeeksFlag = parseInt(args.find((_, i) => args[i - 1] === "--baseline-weeks") ?? "4");

  const today = dateStr(new Date());
  const currentSince = daysAgo(daysFlag);
  const baselineSince = daysAgo(daysFlag + baselineWeeksFlag * 7);
  const baselineUntil = daysAgo(daysFlag + 1);

  console.error(`Pulling metrics: current ${currentSince} to ${today}, baseline ${baselineSince} to ${baselineUntil}`);

  // Pull all data in parallel
  const [
    fbCurrent, fbBaseline,
    funnelDeals,
    weeklyHistory,
  ] = await Promise.all([
    fetchFBCampaignMetrics(currentSince, today),
    fetchFBCampaignMetrics(baselineSince, baselineUntil),
    fetchFunnelDeals(currentSince, today),
    fetchWeeklyFunnelHistory(baselineWeeksFlag + 1), // +1 to include current week
  ]);

  const funnelCurrent = countDeals(funnelDeals);

  // Campaign-level funnel attribution from HubSpot ads_campaign_name
  const campaignFunnel = groupDealsByCampaign(funnelDeals);

  // Compute FB campaign-level ad metrics with baselines
  const fbCampaigns = computeCampaignMetrics(
    fbCurrent.map(c => ({ ...c, clicks: c.clicks })),
    fbBaseline.map(c => ({ ...c, clicks: c.clicks })),
    "facebook",
    baselineWeeksFlag
  );

  // Merge FB ad metrics with HubSpot funnel attribution by matching campaign names (case-insensitive)
  const mergedCampaigns = fbCampaigns.map(fb => {
    const fbNameLower = fb.campaign_name.toLowerCase();
    const hsFunnel = campaignFunnel.find(cf => {
      const hsNameLower = cf.campaign_name.toLowerCase();
      return hsNameLower === fbNameLower ||
        fbNameLower.includes(hsNameLower) ||
        hsNameLower.includes(fbNameLower);
    });
    return {
      ...fb,
      funnel: hsFunnel ?? { campaign_name: fb.campaign_name, mqls: 0, sqls: 0, demos: 0, paid: 0, sql_pct: 0, demo_pct: 0 },
    };
  });

  // Compute channel totals
  const fbTotalCurrent = fbCurrent.reduce((a, c) => ({ spend: a.spend + c.spend, clicks: a.clicks + c.clicks, impressions: a.impressions + c.impressions }), { spend: 0, clicks: 0, impressions: 0 });

  // Build anomaly detection from weekly history — only use complete weeks (exclude current incomplete week)
  const completeWeeks = weeklyHistory.slice(0, -1);
  // Use the most recent complete week as "current" for comparison, skip if fewer than 3 complete weeks
  const recentCompleteWeek = completeWeeks[completeWeeks.length - 1];
  const olderWeeks = completeWeeks.slice(0, -1);
  const anomalies = olderWeeks.length >= 2 && recentCompleteWeek ? detectAnomalies([
    { label: "mqls", channel: "all", values: olderWeeks.map(w => w.mqls), current: recentCompleteWeek.mqls },
    { label: "sqls", channel: "all", values: olderWeeks.map(w => w.sqls), current: recentCompleteWeek.sqls },
    { label: "demos", channel: "all", values: olderWeeks.map(w => w.demos), current: recentCompleteWeek.demos },
    { label: "sql_pct", channel: "all", values: olderWeeks.map(w => w.mqls > 0 ? (w.sqls / w.mqls) * 100 : 0), current: recentCompleteWeek.mqls > 0 ? (recentCompleteWeek.sqls / recentCompleteWeek.mqls) * 100 : 0 },
  ]) : [];

  // Compute derived metrics
  const sqlPct = funnelCurrent.mqls > 0 ? (funnelCurrent.sqls / funnelCurrent.mqls) * 100 : 0;
  const demoPct = funnelCurrent.sqls > 0 ? (funnelCurrent.demos / funnelCurrent.sqls) * 100 : 0;
  const cpMql = funnelCurrent.mqls > 0 ? fbTotalCurrent.spend / funnelCurrent.mqls : 0;
  const cpSql = funnelCurrent.sqls > 0 ? fbTotalCurrent.spend / funnelCurrent.sqls : 0;
  const cpDemo = funnelCurrent.demos > 0 ? fbTotalCurrent.spend / funnelCurrent.demos : 0;

  const output = {
    period: { since: currentSince, until: today, days: daysFlag, baseline_weeks: baselineWeeksFlag },
    hubspot_funnel: {
      current: funnelCurrent,
      derived: { sql_pct: sqlPct, demo_pct: demoPct, cp_mql: cpMql, cp_sql: cpSql, cp_demo: cpDemo, total_spend: fbTotalCurrent.spend },
      by_campaign: campaignFunnel,
      weekly_history: weeklyHistory,
    },
    fb_campaigns: mergedCampaigns,
    fb_totals: fbTotalCurrent,
    anomalies,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
