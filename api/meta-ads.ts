import { VercelRequest, VercelResponse } from "@vercel/node";

interface MetricRow {
  date: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
}

// Environment variables
const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? "";
const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? "";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";

function checkAuth(req: VercelRequest, password: string): boolean {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace("Bearer ", "");
  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64").toString("utf-8");
  } catch {
    /* */
  }
  return decoded === password;
}

async function fetchMetaInsights(since: string, until: string): Promise<MetricRow[]> {
  if (!FB_ADS_TOKEN || !FB_ADS_ACCOUNT_ID) return [];

  const accountId = FB_ADS_ACCOUNT_ID.replace("act_", "");
  const baseUrl =
    `https://graph.facebook.com/v19.0/act_${accountId}/insights` +
    `?fields=campaign_id,campaign_name,spend,impressions,reach,clicks` +
    `&level=campaign&time_increment=1` +
    `&time_range[since]=${since}&time_range[until]=${until}` +
    `&limit=200&access_token=${FB_ADS_TOKEN}`;

  const rows: MetricRow[] = [];
  let nextUrl: string | null = baseUrl;

  while (nextUrl && rows.length < 20000) {
    try {
      const res = await fetch(nextUrl);
      if (!res.ok) break;

      const data = (await res.json()) as {
        data?: Array<{
          date_start: string;
          campaign_id: string;
          campaign_name: string;
          spend: string;
          impressions: string;
          reach: string;
          clicks: string;
        }>;
        paging?: { next?: string };
        error?: { message: string; code?: number; error_user_title?: string };
      };

      if (data.error) {
        const isAuthError = data.error.code === 190;
        throw new Error(
          isAuthError
            ? `Facebook token expired or invalid (code ${data.error.code}). Regenerate System User token in Meta Business Manager.`
            : `Meta API error: ${data.error.message}`
        );
      }

      for (const r of data.data ?? []) {
        rows.push({
          date: r.date_start,
          campaign_id: r.campaign_id,
          campaign_name: r.campaign_name,
          spend: parseFloat(r.spend || "0"),
          impressions: parseInt(r.impressions || "0"),
          reach: parseInt(r.reach || "0"),
          clicks: parseInt(r.clicks || "0"),
        });
      }

      nextUrl = data.paging?.next ?? null;
    } catch (e) {
      console.error("Error fetching Meta insights:", e);
      break;
    }
  }

  return rows;
}

function groupByCampaign(
  rows: MetricRow[]
): Array<{ id: string; name: string; rows: MetricRow[] }> {
  const byCampaign = new Map<
    string,
    { id: string; name: string; rows: MetricRow[] }
  >();

  for (const r of rows) {
    if (!byCampaign.has(r.campaign_id)) {
      byCampaign.set(r.campaign_id, {
        id: r.campaign_id,
        name: r.campaign_name,
        rows: [],
      });
    }
    byCampaign.get(r.campaign_id)!.rows.push(r);
  }

  return Array.from(byCampaign.values());
}

function generatePeriods(since: string, until: string, cadence: string): string[] {
  const periods: string[] = [];
  const start = new Date(since + "T00:00:00Z");
  const end = new Date(until + "T23:59:59Z");

  let current = new Date(start);
  while (current <= end) {
    if (cadence === "monthly") {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, "0");
      const period = `${year}-${month}`;
      if (!periods.includes(period)) periods.push(period);
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else {
      const period = current.toISOString().slice(0, 10);
      periods.push(period);
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return periods;
}

function getPeriodKey(date: Date, cadence: string): string {
  if (cadence === "monthly") {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
  return date.toISOString().slice(0, 10);
}

function aggregateByPeriod(
  rows: MetricRow[],
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

  for (const p of periods) {
    agg[p] = { spend: 0, impressions: 0, reach: 0, clicks: 0 };
  }

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

function computeMetrics(data: {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
}) {
  return {
    spend: data.spend,
    impressions: data.impressions,
    reach: data.reach,
    clicks: data.clicks,
    ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
    cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
    cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
  };
}

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const cadence = (req.query.cadence as string) || "monthly";
    const since = (req.query.since as string) || new Date().getFullYear() + "-01-01";
    const until = (req.query.until as string) || new Date().toISOString().slice(0, 10);

    const rows = await fetchMetaInsights(since, until);
    const campaigns = groupByCampaign(rows);
    const periods = generatePeriods(since, until, cadence);

    const by_campaign: Record<
      string,
      {
        name: string;
        by_period: Record<
          string,
          {
            spend: number;
            impressions: number;
            reach: number;
            clicks: number;
            ctr: number;
            cpc: number;
            cpm: number;
          }
        >;
        totals: {
          spend: number;
          impressions: number;
          reach: number;
          clicks: number;
          ctr: number;
          cpc: number;
          cpm: number;
        };
      }
    > = {};

    let totalMetrics = {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
    };

    for (const campaign of campaigns) {
      const byPeriod = aggregateByPeriod(campaign.rows, cadence, periods);
      const totals = { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0 };

      const periodMetrics: Record<
        string,
        {
          spend: number;
          impressions: number;
          reach: number;
          clicks: number;
          ctr: number;
          cpc: number;
          cpm: number;
        }
      > = {};

      for (const period of periods) {
        const data = byPeriod[period] || { spend: 0, impressions: 0, reach: 0, clicks: 0 };
        periodMetrics[period] = computeMetrics(data);

        totals.spend += data.spend;
        totals.impressions += data.impressions;
        totals.reach += data.reach;
        totals.clicks += data.clicks;
      }

      totals.ctr =
        totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
      totals.cpm =
        totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

      by_campaign[campaign.id] = {
        name: campaign.name,
        by_period: periodMetrics,
        totals,
      };

      totalMetrics.spend += totals.spend;
      totalMetrics.impressions += totals.impressions;
      totalMetrics.reach += totals.reach;
      totalMetrics.clicks += totals.clicks;
    }

    totalMetrics.ctr =
      totalMetrics.impressions > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0;
    totalMetrics.cpc = totalMetrics.clicks > 0 ? totalMetrics.spend / totalMetrics.clicks : 0;
    totalMetrics.cpm =
      totalMetrics.impressions > 0
        ? (totalMetrics.spend / totalMetrics.impressions) * 1000
        : 0;

    return res.status(200).json({
      periods,
      campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
      by_campaign,
      totals: totalMetrics,
      data_through: until,
    });
  } catch (err) {
    const errMsg = String(err);
    console.error("Meta Ads error:", errMsg);

    const isTokenError = errMsg.includes("Facebook token") || errMsg.includes("code 190");
    const status = isTokenError ? 401 : 500;

    return res.status(status).json({
      error: errMsg,
      hint: isTokenError ? "Update FB_ADS_TOKEN in Vercel env with a never-expiring System User token from Meta Business Manager" : undefined
    });
  }
};
