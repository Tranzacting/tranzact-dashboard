import {
  corsHeaders,
  checkAuth,
  DASHBOARD_PASSWORD,
  GA_DEV_TOKEN,
  GA_ACCOUNT_ID,
  GA_PROJECT_ID,
  getGoogleAccessToken,
  safeGAFetch,
  generatePeriods,
  getPeriodKey,
  DailyAdRow,
} from "./_shared.mts";

interface CampaignMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversion_rate: number;
}

async function fetchGACampaignData(
  since: string,
  until: string
): Promise<
  Array<{
    campaign_id: string;
    campaign_name: string;
    rows: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>;
  }>
> {
  if (!GA_DEV_TOKEN || !GA_ACCOUNT_ID)
    return [];

  try {
    const accessToken = await getGoogleAccessToken();
    const query = `SELECT campaign.id, campaign.name, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}' ORDER BY segments.date`;

    const result = await safeGAFetch(
      `https://googleads.googleapis.com/v19/customers/${GA_ACCOUNT_ID}/googleAds:search`,
      { query },
      accessToken
    );

    if (!result.ok) return [];

    const rows = (result.data?.results ?? []) as Array<{
      campaign: { id: string; name: string };
      segments: { date: string };
      metrics: {
        costMicros: string;
        impressions: string;
        clicks: string;
        conversions: string;
      };
    }>;

    // Group by campaign
    const byCampaign = new Map<
      string,
      {
        campaign_name: string;
        rows: Array<{
          date: string;
          spend: number;
          impressions: number;
          clicks: number;
          conversions: number;
        }>;
      }
    >();

    for (const r of rows) {
      const key = String(r.campaign.id);
      if (!byCampaign.has(key)) {
        byCampaign.set(key, { campaign_name: r.campaign.name, rows: [] });
      }
      byCampaign.get(key)!.rows.push({
        date: r.segments.date,
        spend: parseInt(r.metrics.costMicros || "0") / 1_000_000,
        impressions: parseInt(r.metrics.impressions || "0"),
        clicks: parseInt(r.metrics.clicks || "0"),
        conversions: parseFloat(r.metrics.conversions || "0"),
      });
    }

    return Array.from(byCampaign.entries()).map(
      ([id, { campaign_name, rows }]) => ({
        campaign_id: id,
        campaign_name,
        rows,
      })
    );
  } catch {
    return [];
  }
}

function aggregateCampaignByPeriod(
  rows: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>,
  cadence: string,
  periods: string[]
): Record<string, CampaignMetrics> {
  const agg: Record<string, CampaignMetrics> = {};
  for (const p of periods) {
    agg[p] = {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      conversions: 0,
      conversion_rate: 0,
    };
  }

  for (const r of rows) {
    const key = getPeriodKey(new Date(r.date + "T00:00:00Z"), cadence);
    if (key in agg) {
      agg[key].spend += r.spend;
      agg[key].impressions += r.impressions;
      agg[key].clicks += r.clicks;
      agg[key].conversions += r.conversions;
    }
  }

  // Calculate derived metrics
  for (const key in agg) {
    const m = agg[key];
    m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
    m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
    m.conversion_rate = m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0;
  }

  return agg;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const cadence = url.searchParams.get("cadence") || "monthly";

  const now = new Date();
  const defaultSince = `${now.getUTCFullYear()}-01-01`;
  const defaultUntil = now.toISOString().slice(0, 10);
  const since = url.searchParams.get("since") || defaultSince;
  const until = url.searchParams.get("until") || defaultUntil;
  const periods = generatePeriods(since, until, cadence);

  const campaignData = await fetchGACampaignData(since, until);

  // Build response
  const byCampaign: Record<
    string,
    {
      name: string;
      by_period: Record<string, CampaignMetrics>;
      totals: CampaignMetrics;
    }
  > = {};

  for (const camp of campaignData) {
    const byPeriod = aggregateCampaignByPeriod(camp.rows, cadence, periods);
    const totals: CampaignMetrics = {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      conversions: 0,
      conversion_rate: 0,
    };

    for (const p of periods) {
      const m = byPeriod[p];
      totals.spend += m.spend;
      totals.impressions += m.impressions;
      totals.clicks += m.clicks;
      totals.conversions += m.conversions;
    }

    // Recalculate derived metrics for totals
    totals.ctr =
      totals.impressions > 0
        ? (totals.clicks / totals.impressions) * 100
        : 0;
    totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    totals.conversion_rate =
      totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

    byCampaign[camp.campaign_id] = {
      name: camp.campaign_name,
      by_period: byPeriod,
      totals,
    };
  }

  // Calculate overall totals
  const overallTotals: CampaignMetrics = {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    conversions: 0,
    conversion_rate: 0,
  };

  for (const camp in byCampaign) {
    const t = byCampaign[camp].totals;
    overallTotals.spend += t.spend;
    overallTotals.impressions += t.impressions;
    overallTotals.clicks += t.clicks;
    overallTotals.conversions += t.conversions;
  }

  overallTotals.ctr =
    overallTotals.impressions > 0
      ? (overallTotals.clicks / overallTotals.impressions) * 100
      : 0;
  overallTotals.cpc =
    overallTotals.clicks > 0
      ? overallTotals.spend / overallTotals.clicks
      : 0;
  overallTotals.conversion_rate =
    overallTotals.clicks > 0
      ? (overallTotals.conversions / overallTotals.clicks) * 100
      : 0;

  return new Response(
    JSON.stringify({
      periods,
      campaigns: campaignData.map((c) => ({
        id: c.campaign_id,
        name: c.campaign_name,
      })),
      by_campaign: byCampaign,
      totals: overallTotals,
      data_through: campaignData.length > 0 ? until : null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
};

export const config = { path: "/api/google-ads" };
