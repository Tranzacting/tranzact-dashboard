const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const GA_DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
const GA_ACCOUNT_ID = (process.env.GOOGLE_ADS_ACCOUNT_ID ?? "").replace(/-/g, "");
const GA_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID ?? "";
const GA_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET ?? "";
const GA_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "";
const GA_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID ?? "";
const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? "";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";

interface DailyAdRow { date: string; spend: number; impressions: number; reach: number; clicks: number; }
interface HSDeal { [key: string]: string; }
interface PeriodMetrics {
  spend: number; impressions: number; reach: number; clicks: number;
  ctr: number; cpc: number; cpm: number;
  mqls: number; cp_mql: number; conv_rate: number;
  sqls: number; cp_sql: number; sql_pct: number;
  demos: number; cp_demo: number; demo_pct: number;
  paid: number; cp_paid: number; paid_pct: number;
}

async function getGoogleAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: GA_CLIENT_ID,
      client_secret: GA_CLIENT_SECRET,
      refresh_token: GA_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json() as { access_token?: string; error?: string };
  if (data.error) throw new Error(`OAuth error: ${data.error}`);
  return data.access_token!;
}

// Fetch FB daily insights from Supabase warehouse (populated by meta-sync function).
async function fetchFBDailyInsights(since: string, until: string, campaignId?: string): Promise<DailyAdRow[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  let url = `${SUPABASE_URL}/rest/v1/meta_ads_daily` +
    `?select=date,spend,impressions,reach,clicks` +
    `&date=gte.${since}&date=lte.${until}&limit=10000`;
  if (campaignId) url += `&campaign_id=eq.${campaignId}`;
  try {
    const res = await fetch(url, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return [];
    const rows = await res.json() as Array<{ date: string; spend: number; impressions: number; reach: number; clicks: number }>;
    // Sum across campaigns per date (unless filtered to a single campaign)
    const byDate = new Map<string, DailyAdRow>();
    for (const r of rows) {
      const existing = byDate.get(r.date) ?? { date: r.date, spend: 0, impressions: 0, reach: 0, clicks: 0 };
      existing.spend += +r.spend;
      existing.impressions += +r.impressions;
      existing.reach += +r.reach;
      existing.clicks += +r.clicks;
      byDate.set(r.date, existing);
    }
    return Array.from(byDate.values());
  } catch { return []; }
}

async function safeGAFetch(url: string, body: object, accessToken: string): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": GA_DEV_TOKEN,
        "Content-Type": "application/json",
        ...(GA_PROJECT_ID ? { "x-goog-user-project": GA_PROJECT_ID } : {}),
      },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("application/json")) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
    }
    const data = await res.json() as Record<string, unknown>;
    if ((data as { error?: { message: string } }).error?.message) {
      return { ok: false, error: (data as { error: { message: string } }).error.message };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function fetchGADailyInsights(since: string, until: string, campaignId?: string): Promise<{ rows: DailyAdRow[]; error?: string }> {
  if (!GA_DEV_TOKEN || !GA_ACCOUNT_ID) return { rows: [], error: "Google Ads credentials missing" };
  try {
    const accessToken = await getGoogleAccessToken();
    const campaignFilter = campaignId ? ` AND campaign.id = ${campaignId}` : "";
    const query = `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}'${campaignFilter} ORDER BY segments.date`;
    const result = await safeGAFetch(
      `https://googleads.googleapis.com/v19/customers/${GA_ACCOUNT_ID}/googleAds:search`,
      { query },
      accessToken
    );
    if (!result.ok) return { rows: [], error: result.error };
    const results = (result.data?.results ?? []) as Array<{ segments: { date: string }; metrics: { costMicros: string; impressions: string; clicks: string } }>;
    const byDate = new Map<string, DailyAdRow>();
    for (const r of results) {
      const d = r.segments.date;
      const existing = byDate.get(d) ?? { date: d, spend: 0, impressions: 0, reach: 0, clicks: 0 };
      existing.spend += parseInt(r.metrics.costMicros || "0") / 1_000_000;
      existing.impressions += parseInt(r.metrics.impressions || "0");
      existing.clicks += parseInt(r.metrics.clicks || "0");
      byDate.set(d, existing);
    }
    return { rows: Array.from(byDate.values()) };
  } catch (e) {
    return { rows: [], error: String(e) };
  }
}

async function fetchHSDeals(
  dateProperty: string,
  sinceTs: string,
  untilTs: string,
  extraFilters: Array<{ propertyName: string; operator: string; value?: string; values?: string[] }>,
  properties: string[]
): Promise<HSDeal[]> {
  const deals: HSDeal[] = [];
  let after: string | undefined;
  while (true) {
    const body: Record<string, unknown> = {
      filterGroups: [{ filters: [
        { propertyName: dateProperty, operator: "GTE", value: sinceTs },
        { propertyName: dateProperty, operator: "LTE", value: untilTs },
        ...extraFilters,
      ]}],
      properties,
      limit: 100,
      ...(after ? { after } : {}),
    };
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${HS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { results?: Array<{ properties: HSDeal }>; paging?: { next?: { after: string } } };
    for (const r of data.results ?? []) deals.push(r.properties);
    if (!data.paging?.next?.after || deals.length >= 5000) break;
    after = data.paging.next.after;
  }
  return deals;
}

function generatePeriods(since: string, until: string, cadence: string): string[] {
  const periods: string[] = [];
  const start = new Date(since + "T00:00:00Z");
  const end = new Date(until + "T00:00:00Z");
  if (cadence === "daily") {
    const cur = new Date(start);
    while (cur <= end) {
      periods.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (cadence === "weekly") {
    const cur = new Date(start);
    const day = cur.getUTCDay();
    cur.setUTCDate(cur.getUTCDate() - (day === 0 ? 6 : day - 1));
    while (cur <= end) {
      periods.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
  } else {
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cur <= end) {
      periods.push(cur.toISOString().slice(0, 7));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  }
  return periods;
}

function getPeriodKey(date: Date, cadence: string): string {
  if (cadence === "daily") return date.toISOString().slice(0, 10);
  if (cadence === "weekly") {
    const d = new Date(date);
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 7);
}

function groupDealsByPeriod(deals: HSDeal[], dateProperty: string, cadence: string, periods: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of periods) counts[p] = 0;
  for (const deal of deals) {
    const raw = deal[dateProperty];
    if (!raw) continue;
    const ts = /^\d+$/.test(raw) ? parseInt(raw) : Date.parse(raw);
    if (!ts || isNaN(ts)) continue;
    const key = getPeriodKey(new Date(ts), cadence);
    if (key in counts) counts[key]++;
  }
  return counts;
}

function aggregateAdsByPeriod(rows: DailyAdRow[], cadence: string, periods: string[]): Record<string, { spend: number; impressions: number; reach: number; clicks: number }> {
  const agg: Record<string, { spend: number; impressions: number; reach: number; clicks: number }> = {};
  for (const p of periods) agg[p] = { spend: 0, impressions: 0, reach: 0, clicks: 0 };
  for (const r of rows) {
    const key = getPeriodKey(new Date(r.date + "T00:00:00Z"), cadence);
    if (key in agg) {
      agg[key].spend += r.spend;
      agg[key].impressions += r.impressions;
      agg[key].reach += r.reach;
      agg[key].clicks += r.clicks;
    }
  }
  return agg;
}

function buildMetrics(ads: { spend: number; impressions: number; reach: number; clicks: number }, mqls: number, sqls: number, demos: number, paid: number): PeriodMetrics {
  const { spend, impressions, reach, clicks } = ads;
  return {
    spend, impressions, reach, clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    mqls,
    cp_mql: mqls > 0 ? spend / mqls : 0,
    conv_rate: clicks > 0 ? (mqls / clicks) * 100 : 0,
    sqls,
    cp_sql: sqls > 0 ? spend / sqls : 0,
    sql_pct: mqls > 0 ? (sqls / mqls) * 100 : 0,
    demos,
    cp_demo: demos > 0 ? spend / demos : 0,
    demo_pct: sqls > 0 ? (demos / sqls) * 100 : 0,
    paid,
    cp_paid: paid > 0 ? spend / paid : 0,
    paid_pct: demos > 0 ? (paid / demos) * 100 : 0,
  };
}

async function fetchFBCampaigns(): Promise<Array<{ id: string; name: string }>> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/meta_ads_daily?select=campaign_id,campaign_name&limit=1000`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return [];
    const rows = await res.json() as Array<{ campaign_id: string; campaign_name: string }>;
    const seen = new Set<string>();
    return rows
      .filter(r => !seen.has(r.campaign_id) && seen.add(r.campaign_id))
      .map(r => ({ id: r.campaign_id, name: r.campaign_name }));
  } catch { return []; }
}

async function fetchGACampaigns(): Promise<{ campaigns: Array<{ id: string; name: string }>; error?: string }> {
  if (!GA_DEV_TOKEN || !GA_ACCOUNT_ID) return { campaigns: [], error: "Missing credentials" };
  try {
    const accessToken = await getGoogleAccessToken();
    const query = "SELECT campaign.id, campaign.name FROM campaign WHERE campaign.status IN ('ENABLED', 'PAUSED') ORDER BY campaign.name LIMIT 100";
    const result = await safeGAFetch(
      `https://googleads.googleapis.com/v19/customers/${GA_ACCOUNT_ID}/googleAds:search`,
      { query },
      accessToken
    );
    if (!result.ok) return { campaigns: [], error: result.error };
    const results = (result.data?.results ?? []) as Array<{ campaign: { id: string; name: string } }>;
    return { campaigns: results.map(r => ({ id: String(r.campaign.id), name: r.campaign.name })) };
  } catch (e) {
    return { campaigns: [], error: String(e) };
  }
}

export default async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    let password = "";
    try { password = atob(token); } catch { /**/ }
    if (password !== DASHBOARD_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const cadence = url.searchParams.get("cadence") || "monthly";
    const source = url.searchParams.get("source") || "all";
    const leadType = url.searchParams.get("lead_type") || "all";
    const campaignFb = url.searchParams.get("campaign_fb") || "";
    const campaignGa = url.searchParams.get("campaign_ga") || "";

    const now = new Date();
    const defaultSince = `${now.getUTCFullYear()}-01-01`;
    const defaultUntil = now.toISOString().slice(0, 10);
    const since = url.searchParams.get("since") || defaultSince;
    const until = url.searchParams.get("until") || defaultUntil;
    const sinceTs = String(new Date(since + "T00:00:00Z").getTime());
    const untilTs = String(new Date(until + "T23:59:59Z").getTime());
    const periods = generatePeriods(since, until, cadence);

    const sourceFilters: Array<{ propertyName: string; operator: string; value?: string }> = [];
    if (source === "facebook") sourceFilters.push({ propertyName: "deal_source_25", operator: "EQ", value: "Facebook" });
    else if (source === "google") sourceFilters.push({ propertyName: "deal_source_25", operator: "EQ", value: "Google" });
    else if (source === "others") {
      sourceFilters.push({ propertyName: "deal_source_25", operator: "NEQ", value: "Facebook" });
      sourceFilters.push({ propertyName: "deal_source_25", operator: "NEQ", value: "Google" });
    }

    const leadTypeFilters: Array<{ propertyName: string; operator: string }> = [];
    if (leadType === "signup") leadTypeFilters.push({ propertyName: "first_demo_schedule_datetime", operator: "NOT_HAS_PROPERTY" });
    else if (leadType === "demo") leadTypeFilters.push({ propertyName: "first_demo_schedule_datetime", operator: "HAS_PROPERTY" });

    const allHsFilters = [...sourceFilters, ...leadTypeFilters];

    // MQL filters: form_is_manufacturing = Yes AND form_designation IN [Owner, HOD]
    const mqlFilters = [
      { propertyName: "form_is_manufacturing", operator: "EQ", value: "Yes" },
      { propertyName: "form_designation", operator: "IN", values: ["Owner", "HOD"] },
      ...sourceFilters,
      ...leadTypeFilters,
    ] as Array<{ propertyName: string; operator: string; value?: string; values?: string[] }>;

    const fetchFB = source === "all" || source === "facebook";
    const fetchGA = source === "all" || source === "google";

    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("API timeout")), ms)),
      ]);
    };

    const promises = [
      withTimeout(fetchFB ? fetchFBDailyInsights(since, until, campaignFb || undefined) : Promise.resolve([]), 3000),
      withTimeout(fetchGA ? fetchGADailyInsights(since, until, campaignGa || undefined) : Promise.resolve({ rows: [], error: undefined as string | undefined }), 3000),
      withTimeout(fetchHSDeals("last_crm_lead_datetime", sinceTs, untilTs, mqlFilters, ["last_crm_lead_datetime"]), 3000),
      withTimeout(fetchHSDeals("first_demo_schedule_datetime", sinceTs, untilTs, allHsFilters, ["first_demo_schedule_datetime"]), 3000),
      withTimeout(fetchHSDeals("first_demo_complete_datetime", sinceTs, untilTs, allHsFilters, ["first_demo_complete_datetime"]), 3000),
      withTimeout(fetchHSDeals("first_payment_date", sinceTs, untilTs, allHsFilters, ["first_payment_date"]), 3000),
      withTimeout(fetchFBCampaigns(), 2000),
      withTimeout(fetchGACampaigns(), 2000),
    ];

    const results = await Promise.allSettled(promises);
    const [fbRowsResult, gaResultResult, mqlDealsResult, sqlDealsResult, demoDealsResult, paidDealsResult, fbCampaignsResult, gaCampaignsResultResult] = results;

    const fbRows = fbRowsResult.status === "fulfilled" ? fbRowsResult.value : [];
    const gaResult = gaResultResult.status === "fulfilled" ? gaResultResult.value : { rows: [], error: "API call failed" };
    const mqlDeals = mqlDealsResult.status === "fulfilled" ? mqlDealsResult.value : [];
    const sqlDeals = sqlDealsResult.status === "fulfilled" ? sqlDealsResult.value : [];
    const demoDeals = demoDealsResult.status === "fulfilled" ? demoDealsResult.value : [];
    const paidDeals = paidDealsResult.status === "fulfilled" ? paidDealsResult.value : [];
    const fbCampaigns = fbCampaignsResult.status === "fulfilled" ? fbCampaignsResult.value : [];
    const gaCampaignsResult = gaCampaignsResultResult.status === "fulfilled" ? gaCampaignsResultResult.value : { campaigns: [], error: "API call failed" };

    const fbByPeriod = aggregateAdsByPeriod(fbRows, cadence, periods);
    const gaByPeriod = aggregateAdsByPeriod(gaResult.rows, cadence, periods);
    const mqlsByPeriod = groupDealsByPeriod(mqlDeals, "last_crm_lead_datetime", cadence, periods);
    const sqlsByPeriod = groupDealsByPeriod(sqlDeals, "first_demo_schedule_datetime", cadence, periods);
    const demosByPeriod = groupDealsByPeriod(demoDeals, "first_demo_complete_datetime", cadence, periods);
    const paidByPeriod = groupDealsByPeriod(paidDeals, "first_payment_date", cadence, periods);

    const data: Record<string, PeriodMetrics> = {};
    for (const p of periods) {
      const fb = fbByPeriod[p] ?? { spend: 0, impressions: 0, reach: 0, clicks: 0 };
      const ga = gaByPeriod[p] ?? { spend: 0, impressions: 0, reach: 0, clicks: 0 };
      data[p] = buildMetrics(
        { spend: fb.spend + ga.spend, impressions: fb.impressions + ga.impressions, reach: fb.reach + ga.reach, clicks: fb.clicks + ga.clicks },
        mqlsByPeriod[p] ?? 0, sqlsByPeriod[p] ?? 0, demosByPeriod[p] ?? 0, paidByPeriod[p] ?? 0
      );
    }

    const totalsAds = { spend: 0, impressions: 0, reach: 0, clicks: 0 };
    let totalMqls = 0, totalSqls = 0, totalDemos = 0, totalPaid = 0;
    for (const p of periods) {
      totalsAds.spend += data[p].spend; totalsAds.impressions += data[p].impressions;
      totalsAds.reach += data[p].reach; totalsAds.clicks += data[p].clicks;
      totalMqls += data[p].mqls; totalSqls += data[p].sqls;
      totalDemos += data[p].demos; totalPaid += data[p].paid;
    }

    return new Response(JSON.stringify({
      periods, data,
      totals: buildMetrics(totalsAds, totalMqls, totalSqls, totalDemos, totalPaid),
      meta: {
        campaigns_fb: fbCampaigns,
        campaigns_ga: gaCampaignsResult.campaigns,
        errors: { google_ads: gaResult.error ?? gaCampaignsResult.error ?? null },
      },
      lastUpdated: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : String(error),
      lastUpdated: new Date().toISOString(),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
