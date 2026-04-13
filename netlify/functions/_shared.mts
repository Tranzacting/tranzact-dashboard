// Environment variables
export const GA_DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
export const GA_ACCOUNT_ID = (process.env.GOOGLE_ADS_ACCOUNT_ID ?? "").replace(/-/g, "");
export const GA_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID ?? "";
export const GA_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET ?? "";
export const GA_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "";
export const GA_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID ?? "";
export const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "";
export const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? "";
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
export const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";
export const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? "";
export const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? "";
export const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? "";
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

// CORS headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Auth check
export function checkAuth(req: Request, password: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  let decoded = "";
  try {
    decoded = atob(token);
  } catch {
    /* */
  }
  return decoded === password;
}

// Types
export interface DailyAdRow {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
}

export interface HSDeal {
  [key: string]: string;
}

export interface PeriodMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  mqls: number;
  cp_mql: number;
  conv_rate: number;
  sqls: number;
  cp_sql: number;
  sql_pct: number;
  demos: number;
  cp_demo: number;
  demo_pct: number;
  paid: number;
  cp_paid: number;
  paid_pct: number;
}

// Google OAuth
export async function getGoogleAccessToken(): Promise<string> {
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
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.error) throw new Error(`OAuth error: ${data.error}`);
  return data.access_token!;
}

// Safe Google Ads API fetch
export async function safeGAFetch(
  url: string,
  body: object,
  accessToken: string
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
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
    const data = (await res.json()) as Record<string, unknown>;
    if (
      (data as { error?: { message: string } }).error?.message
    ) {
      return {
        ok: false,
        error: (data as { error: { message: string } }).error.message,
      };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Data fetching functions
export async function fetchFBDailyInsights(
  since: string,
  until: string,
  campaignId?: string
): Promise<DailyAdRow[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  let url =
    `${SUPABASE_URL}/rest/v1/meta_ads_daily` +
    `?select=date,spend,impressions,reach,clicks` +
    `&date=gte.${since}&date=lte.${until}&limit=10000`;
  if (campaignId) url += `&campaign_id=eq.${campaignId}`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      date: string;
      spend: number;
      impressions: number;
      reach: number;
      clicks: number;
    }>;
    const byDate = new Map<string, DailyAdRow>();
    for (const r of rows) {
      const existing = byDate.get(r.date) ?? {
        date: r.date,
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
      };
      existing.spend += +r.spend;
      existing.impressions += +r.impressions;
      existing.reach += +r.reach;
      existing.clicks += +r.clicks;
      byDate.set(r.date, existing);
    }
    return Array.from(byDate.values());
  } catch {
    return [];
  }
}

export async function fetchGADailyInsights(
  since: string,
  until: string,
  campaignId?: string
): Promise<{ rows: DailyAdRow[]; error?: string }> {
  if (!GA_DEV_TOKEN || !GA_ACCOUNT_ID)
    return { rows: [], error: "Google Ads credentials missing" };
  try {
    const accessToken = await getGoogleAccessToken();
    const campaignFilter = campaignId
      ? ` AND campaign.id = ${campaignId}`
      : "";
    const query = `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}'${campaignFilter} ORDER BY segments.date`;
    const result = await safeGAFetch(
      `https://googleads.googleapis.com/v19/customers/${GA_ACCOUNT_ID}/googleAds:search`,
      { query },
      accessToken
    );
    if (!result.ok) return { rows: [], error: result.error };
    const results = (result.data?.results ?? []) as Array<{
      segments: { date: string };
      metrics: { costMicros: string; impressions: string; clicks: string };
    }>;
    const byDate = new Map<string, DailyAdRow>();
    for (const r of results) {
      const d = r.segments.date;
      const existing = byDate.get(d) ?? {
        date: d,
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
      };
      existing.spend += (parseInt(r.metrics.costMicros || "0") / 1_000_000);
      existing.impressions += parseInt(r.metrics.impressions || "0");
      existing.clicks += parseInt(r.metrics.clicks || "0");
      byDate.set(d, existing);
    }
    return { rows: Array.from(byDate.values()) };
  } catch (e) {
    return { rows: [], error: String(e) };
  }
}

export async function fetchHSDeals(
  dateProperty: string,
  sinceTs: string,
  untilTs: string,
  extraFilters: Array<{
    propertyName: string;
    operator: string;
    value?: string;
    values?: string[];
  }>,
  properties: string[]
): Promise<HSDeal[]> {
  const deals: HSDeal[] = [];
  let after: string | undefined;
  while (true) {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            { propertyName: dateProperty, operator: "GTE", value: sinceTs },
            { propertyName: dateProperty, operator: "LTE", value: untilTs },
            ...extraFilters,
          ],
        },
      ],
      properties,
      limit: 100,
      ...(after ? { after } : {}),
    };
    const res = await fetch(
      "https://api.hubapi.com/crm/v3/objects/deals/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = (await res.json()) as {
      results?: Array<{ properties: HSDeal }>;
      paging?: { next?: { after: string } };
    };
    for (const r of data.results ?? []) deals.push(r.properties);
    if (!data.paging?.next?.after || deals.length >= 5000) break;
    after = data.paging.next.after;
  }
  return deals;
}

// Date/period utilities
export function getWeekRange(offsetWeeks: number = 0): { since: string; until: string } {
  const now = new Date();
  const days = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - (days === 0 ? 6 : days - 1) + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  return {
    since: monday.toISOString().slice(0, 10),
    until: sunday.toISOString().slice(0, 10),
  };
}

export function generatePeriods(
  since: string,
  until: string,
  cadence: string
): string[] {
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

export function getPeriodKey(date: Date, cadence: string): string {
  if (cadence === "daily") return date.toISOString().slice(0, 10);
  if (cadence === "weekly") {
    const d = new Date(date);
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 7);
}

export function groupDealsByPeriod(
  deals: HSDeal[],
  dateProperty: string,
  cadence: string,
  periods: string[]
): Record<string, number> {
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

export function aggregateAdsByPeriod(
  rows: DailyAdRow[],
  cadence: string,
  periods: string[]
): Record<
  string,
  { spend: number; impressions: number; reach: number; clicks: number }
> {
  const agg: Record<
    string,
    { spend: number; impressions: number; reach: number; clicks: number }
  > = {};
  for (const p of periods)
    agg[p] = { spend: 0, impressions: 0, reach: 0, clicks: 0 };
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

export function buildMetrics(
  ads: {
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
  },
  mqls: number,
  sqls: number,
  demos: number,
  paid: number
): PeriodMetrics {
  const { spend, impressions, reach, clicks } = ads;
  return {
    spend,
    impressions,
    reach,
    clicks,
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

export async function fetchFBCampaigns(): Promise<
  Array<{ id: string; name: string }>
> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/meta_ads_daily?select=campaign_id,campaign_name&limit=1000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      campaign_id: string;
      campaign_name: string;
    }>;
    const seen = new Set<string>();
    return rows
      .filter((r) => !seen.has(r.campaign_id) && seen.add(r.campaign_id))
      .map((r) => ({ id: r.campaign_id, name: r.campaign_name }));
  } catch {
    return [];
  }
}

export async function fetchGACampaigns(): Promise<{
  campaigns: Array<{ id: string; name: string }>;
  error?: string;
}> {
  if (!GA_DEV_TOKEN || !GA_ACCOUNT_ID)
    return { campaigns: [], error: "Missing credentials" };
  try {
    const accessToken = await getGoogleAccessToken();
    const query =
      "SELECT campaign.id, campaign.name FROM campaign WHERE campaign.status IN ('ENABLED', 'PAUSED') ORDER BY campaign.name LIMIT 100";
    const result = await safeGAFetch(
      `https://googleads.googleapis.com/v19/customers/${GA_ACCOUNT_ID}/googleAds:search`,
      { query },
      accessToken
    );
    if (!result.ok) return { campaigns: [], error: result.error };
    const results = (result.data?.results ?? []) as Array<{
      campaign: { id: string; name: string };
    }>;
    return {
      campaigns: results.map((r) => ({
        id: String(r.campaign.id),
        name: r.campaign.name,
      })),
    };
  } catch (e) {
    return { campaigns: [], error: String(e) };
  }
}

// Insights generation with Claude
export interface InsightsPayload {
  week: { since: string; until: string };
  prev_week: { since: string; until: string };
  metrics: Record<
    string,
    { current: number; previous: number; delta_pct: number }
  >;
  insights: {
    highlights: string[];
    concerns: string[];
    recommended_questions: string[];
  };
  generated_at: string;
}

export async function generateInsights(
  metrics: Record<string, { current: number; previous: number; delta_pct: number }>
): Promise<{
  highlights: string[];
  concerns: string[];
  recommended_questions: string[];
} | null> {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const metricsStr = Object.entries(metrics)
      .map(
        ([key, val]) =>
          `${key}: current=${val.current.toFixed(0)}, previous=${val.previous.toFixed(0)}, delta=${val.delta_pct.toFixed(1)}%`
      )
      .join("\n");

    const prompt = `You are a marketing analytics expert. Analyze this week's performance vs last week and return ONLY valid JSON (no markdown, no extra text):

${metricsStr}

Return a JSON object with exactly these three fields:
- "highlights": array of 3-5 bullet strings (positive insights, specific numbers/percentages)
- "concerns": array of 2-3 bullet strings (areas needing attention, specific numbers/percentages)
- "recommended_questions": array of 4-6 question strings (what a marketer would want to ask)

Be specific, mention actual metrics and percentages, keep each item under 100 characters.`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") return null;

    const parsed = JSON.parse(content.text) as {
      highlights?: string[];
      concerns?: string[];
      recommended_questions?: string[];
    };

    return {
      highlights: parsed.highlights || [],
      concerns: parsed.concerns || [],
      recommended_questions: parsed.recommended_questions || [],
    };
  } catch (e) {
    console.error("Insights generation failed:", e);
    return null;
  }
}
