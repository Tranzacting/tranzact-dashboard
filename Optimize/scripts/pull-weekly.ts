/**
 * Monday weekly pull — reviews the just-completed Mon–Sun week.
 *
 * Usage:
 *   npm run weekly:pull                          # assumes today is Monday, reviews W-1
 *   npm run weekly:pull -- --review-mon 2026-04-20  # explicit review date
 *
 * Outputs structured JSON to stdout for downstream analysis + Notion sync.
 *
 * For each paid-ads campaign, produces three periods — W-1 (focal), W-2 (last
 * complete week), and a 4-week baseline (W-2 through W-5) — each with:
 *   - spend, impressions, inline_link_clicks (real link clicks, not generic clicks)
 *   - CTR = inline_link_clicks / impressions
 *   - mqls, sqls, sql_pct from HubSpot cohort
 *   - conv_rate_pct = mqls / inline_link_clicks
 */
import './_env';

const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? '';
const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? '';
const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? '';

type Deal = Record<string, string | null>;

// --- Date helpers ---

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function istTs(date: string, endOfDay = false): string {
  return String(new Date(`${date}T${endOfDay ? '23:59:59' : '00:00:00'}+05:30`).getTime());
}

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return dateStr(d);
}

function isoWeekNumber(date: string): number {
  const d = new Date(date + 'T00:00:00Z');
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

// --- HubSpot ---

async function fetchDeals(
  filters: Array<Record<string, unknown>>,
  props: string[],
): Promise<Deal[]> {
  if (!HS_TOKEN) return [];
  const deals: Deal[] = [];
  let after: string | undefined;
  while (true) {
    const body = {
      filterGroups: [{ filters }],
      properties: props,
      limit: 100,
      ...(after ? { after } : {}),
    };
    let attempt = 0;
    let res: Response | null = null;
    while (attempt < 5) {
      res = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status !== 429) break;
      attempt += 1;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
    if (!res || !res.ok) {
      console.error('HS error after retries', res?.status, res ? await res.text() : '');
      break;
    }
    const data = (await res.json()) as {
      results?: Array<{ properties: Deal }>;
      paging?: { next?: { after: string } };
    };
    for (const r of data.results ?? []) deals.push(r.properties);
    if (!data.paging?.next?.after || deals.length >= 10000) break;
    after = data.paging.next.after;
    await new Promise((r) => setTimeout(r, 120));
  }
  return deals;
}

const MQL_FILTERS = [
  { propertyName: 'form_is_manufacturing', operator: 'EQ', value: 'Yes' },
  { propertyName: 'form_designation', operator: 'IN', values: ['Owner', 'HOD'] },
];

const COHORT_PROPS = [
  'ads_campaign_name',
  'first_demo_schedule_datetime',
  'first_demo_complete_datetime',
  'first_payment_date',
  'sdr_call_attempts',
  'sdr_call_connects',
  'sd_sentiment',
  'last_crm_lead_datetime',
];

interface CampaignRow {
  campaign: string;
  mqls: number;
  sqls: number;
  demos: number;
  paid: number;
  sql_pct: number;
  avg_call_attempts: number;
  avg_call_connects: number;
  connect_rate_pct: number;
  sd_positive_pct: number;
}

function rowFor(name: string, list: Deal[]): CampaignRow {
  const mqls = list.length;
  const sqls = list.filter((d) => d.first_demo_schedule_datetime).length;
  const demos = list.filter((d) => d.first_demo_complete_datetime).length;
  const paid = list.filter((d) => d.first_payment_date).length;
  const attempts = list.map((d) => Number(d.sdr_call_attempts) || 0);
  const connects = list.map((d) => Number(d.sdr_call_connects) || 0);
  const sdPos = list.filter((d) => d.sd_sentiment === '1' || d.sd_sentiment === 'positive').length;
  const avgA = attempts.length ? attempts.reduce((a, b) => a + b, 0) / attempts.length : 0;
  const avgC = connects.length ? connects.reduce((a, b) => a + b, 0) / connects.length : 0;
  return {
    campaign: name,
    mqls,
    sqls,
    demos,
    paid,
    sql_pct: mqls > 0 ? (sqls / mqls) * 100 : 0,
    avg_call_attempts: Math.round(avgA * 100) / 100,
    avg_call_connects: Math.round(avgC * 100) / 100,
    connect_rate_pct: avgA > 0 ? Math.round((avgC / avgA) * 1000) / 10 : 0,
    sd_positive_pct: mqls > 0 ? Math.round((sdPos / mqls) * 1000) / 10 : 0,
  };
}

async function pullCohort(start: string, end: string): Promise<{ overall: CampaignRow; byCampaign: CampaignRow[]; noCampaign: CampaignRow }> {
  const deals = await fetchDeals(
    [
      { propertyName: 'last_crm_lead_datetime', operator: 'GTE', value: istTs(start) },
      { propertyName: 'last_crm_lead_datetime', operator: 'LTE', value: istTs(end, true) },
      ...MQL_FILTERS,
    ],
    COHORT_PROPS,
  );

  const withCampaign = deals.filter((d) => d.ads_campaign_name);
  const noCampaign = deals.filter((d) => !d.ads_campaign_name);

  const groups = new Map<string, Deal[]>();
  for (const d of withCampaign) {
    const k = (d.ads_campaign_name || '').toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(d);
  }

  const overall = rowFor('(all)', deals);
  const byCampaign = [...groups.entries()]
    .map(([k, list]) => rowFor(k, list))
    .filter((r) => r.mqls >= 3)
    .sort((a, b) => b.mqls - a.mqls);

  return { overall, byCampaign, noCampaign: rowFor('(no campaign)', noCampaign) };
}

// --- Facebook ---

interface FBRow {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;          // generic clicks (all click types)
  link_clicks: number;     // inline_link_clicks (landing-page-bound clicks)
}

async function fetchFB(since: string, until: string): Promise<FBRow[]> {
  if (!FB_ADS_TOKEN || !FB_ADS_ACCOUNT_ID) return [];
  const acc = FB_ADS_ACCOUNT_ID.replace('act_', '');
  const url =
    `https://graph.facebook.com/v19.0/act_${acc}/insights` +
    `?fields=campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks` +
    `&level=campaign&time_range[since]=${since}&time_range[until]=${until}` +
    `&limit=500&access_token=${FB_ADS_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('FB error', res.status, await res.text());
    return [];
  }
  const data = (await res.json()) as {
    data?: Array<{ campaign_id: string; campaign_name: string; spend: string; impressions: string; clicks: string; inline_link_clicks?: string }>;
  };
  return (data.data ?? []).map((r) => ({
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    spend: parseFloat(r.spend || '0'),
    impressions: parseInt(r.impressions || '0'),
    clicks: parseInt(r.clicks || '0'),
    link_clicks: parseInt(r.inline_link_clicks || '0'),
  }));
}

// --- Helpers for per-campaign merging ---

function matchFunnelByName(byCampaign: CampaignRow[], fbName: string): CampaignRow | null {
  const lower = fbName.toLowerCase();
  return (
    byCampaign.find(
      (c) => c.campaign === lower || lower.includes(c.campaign) || c.campaign.includes(lower),
    ) ?? null
  );
}

interface PeriodMetrics {
  spend: number;
  impressions: number;
  link_clicks: number;
  ctr_pct: number;              // link_clicks / impressions
  mqls: number;
  sqls: number;
  sql_pct: number;
  conv_rate_pct: number;        // mqls / link_clicks
  connect_rate_pct: number;
  sd_positive_pct: number;
}

function periodMetrics(fb: FBRow | undefined, funnel: CampaignRow | null): PeriodMetrics {
  const imp = fb?.impressions ?? 0;
  const lc = fb?.link_clicks ?? 0;
  const mqls = funnel?.mqls ?? 0;
  return {
    spend: fb?.spend ?? 0,
    impressions: imp,
    link_clicks: lc,
    ctr_pct: imp > 0 ? Math.round((lc / imp) * 10000) / 100 : 0,
    mqls,
    sqls: funnel?.sqls ?? 0,
    sql_pct: funnel?.sql_pct ?? 0,
    conv_rate_pct: lc > 0 ? Math.round((mqls / lc) * 10000) / 100 : 0,
    connect_rate_pct: funnel?.connect_rate_pct ?? 0,
    sd_positive_pct: funnel?.sd_positive_pct ?? 0,
  };
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const reviewMonFlag = args.indexOf('--review-mon');
  const reviewDate = reviewMonFlag >= 0 ? args[reviewMonFlag + 1] : dateStr(new Date());

  const w1End = addDays(reviewDate, -1);
  const w1Start = addDays(reviewDate, -7);
  const isoWeek = isoWeekNumber(w1Start);

  // Baseline = 4 weeks immediately before W-1 (i.e., W-2 start through W-5 end)
  const baselineStart = addDays(w1Start, -28);
  const baselineEnd = addDays(w1End, -7);

  const w0Start = reviewDate;
  const w0End = dateStr(new Date());

  const windows = [
    { label: 'W-0', start: w0Start, end: w0End, status: 'in_progress' },
    { label: 'W-1', start: w1Start, end: w1End, status: 'focal' },
    { label: 'W-2', start: addDays(w1Start, -7), end: addDays(w1End, -7), status: 'mature' },
    { label: 'W-3', start: addDays(w1Start, -14), end: addDays(w1End, -14), status: 'historical' },
    { label: 'W-4', start: addDays(w1Start, -21), end: addDays(w1End, -21), status: 'historical' },
  ];

  console.error(`Monday review ${reviewDate} → focal W${isoWeek} (${w1Start} → ${w1End}), baseline ${baselineStart} → ${baselineEnd}`);

  // Cohort pulls (sequential for HS rate limits)
  const cohortResults: Array<(typeof windows)[number] & Awaited<ReturnType<typeof pullCohort>>> = [];
  for (const w of windows) {
    const data = await pullCohort(w.start, w.end);
    console.error(`  ${w.label} ${w.start}→${w.end}: ${data.overall.mqls} MQLs`);
    cohortResults.push({ ...w, ...data });
  }
  // Baseline cohort (single 4-week pull)
  const baselineCohort = await pullCohort(baselineStart, baselineEnd);
  console.error(`  baseline ${baselineStart}→${baselineEnd}: ${baselineCohort.overall.mqls} MQLs`);

  // FB pulls for W-1, W-2, and baseline (4-week aggregate)
  const fbFocal = await fetchFB(w1Start, w1End);
  const w2 = cohortResults.find((c) => c.label === 'W-2')!;
  const fbW2 = await fetchFB(w2.start, w2.end);
  const fbBaseline = await fetchFB(baselineStart, baselineEnd);
  console.error(`  FB W-1: ${fbFocal.length} campaigns · W-2: ${fbW2.length} · 4W: ${fbBaseline.length}`);

  const fbTotal = fbFocal.reduce(
    (a, c) => ({
      spend: a.spend + c.spend,
      impressions: a.impressions + c.impressions,
      clicks: a.clicks + c.clicks,
      link_clicks: a.link_clicks + c.link_clicks,
    }),
    { spend: 0, impressions: 0, clicks: 0, link_clicks: 0 },
  );

  const focal = cohortResults.find((c) => c.label === 'W-1')!;

  // Index baseline & W-2 FB by campaign_id for O(1) lookup
  const fbW2ById = new Map(fbW2.map((r) => [r.campaign_id, r] as const));
  const fbBaselineById = new Map(fbBaseline.map((r) => [r.campaign_id, r] as const));

  // Build per-campaign view using focal as the driver (campaigns that ran W-1)
  const campaigns = fbFocal.map((fb) => {
    const focalFunnel = matchFunnelByName(focal.byCampaign, fb.campaign_name);
    const w2Funnel = matchFunnelByName(w2.byCampaign, fb.campaign_name);
    const baselineFunnel = matchFunnelByName(baselineCohort.byCampaign, fb.campaign_name);

    const focalMetrics = periodMetrics(fb, focalFunnel);
    const w2Metrics = periodMetrics(fbW2ById.get(fb.campaign_id), w2Funnel);
    const baselineMetrics = periodMetrics(fbBaselineById.get(fb.campaign_id), baselineFunnel);

    // Verdict uses W-2 as the mature-cohort verdict metric
    let verdict = '—';
    if (w2Funnel && w2Funnel.mqls >= 20) {
      if (w2Funnel.sql_pct >= 10) verdict = '✅ Above benchmark';
      else if (w2Funnel.sql_pct < 2 && w2Funnel.mqls >= 50) verdict = '🛑 Pause candidate (Rule 1)';
      else verdict = '⚠️ Below benchmark (investigate)';
    } else if (!w2Funnel || w2Funnel.mqls < 20) {
      verdict = '⏸ Too small to judge';
    }

    return {
      campaign_id: fb.campaign_id,
      campaign_name: fb.campaign_name,
      focal: focalMetrics,
      w2: w2Metrics,
      baseline_4w: baselineMetrics,
      verdict,
    };
  });

  const output = {
    review_date: reviewDate,
    week_label: `W${isoWeek}`,
    week_title: `W${isoWeek} (${w1Start.slice(8, 10)} - ${w1End.slice(8, 10)})`,
    focal_week: { start: w1Start, end: w1End },
    w2_week: { start: w2.start, end: w2.end },
    baseline_4w: { start: baselineStart, end: baselineEnd },
    fb_totals: fbTotal,
    campaigns,
    cohorts: {
      'W-0': cohortResults.find((c) => c.label === 'W-0'),
      'W-1': cohortResults.find((c) => c.label === 'W-1'),
      'W-2': cohortResults.find((c) => c.label === 'W-2'),
      'W-3': cohortResults.find((c) => c.label === 'W-3'),
      'W-4': cohortResults.find((c) => c.label === 'W-4'),
      baseline_4w: baselineCohort,
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
