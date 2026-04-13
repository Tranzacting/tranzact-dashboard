import {
  corsHeaders,
  checkAuth,
  DASHBOARD_PASSWORD,
  FB_ADS_TOKEN,
  FB_ADS_ACCOUNT_ID,
  HSDeal,
  fetchHSDeals,
} from "./_shared.mts";

interface FBAdRow {
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  spend: string;
  impressions: string;
  reach: string;
  inline_link_clicks: string;
  frequency: string;
  actions?: Array<{ action_type: string; value: string }>;
}

interface MetricsShape {
  spend: number;
  impressions: number;
  reach: number;
  link_clicks: number;
  frequency: number;
  results: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cost_per_result: number;
  conv_rate: number;
  mqls: number;
  cp_mql: number;
  sqls: number;
  cp_sql: number;
  demos: number;
  cp_demo: number;
  paid: number;
  cp_paid: number;
}

function extractResults(
  actions: Array<{ action_type: string; value: string }> = []
): number {
  const INCLUDE = ["lead", "landing_page_view"];
  return actions.reduce((sum, a) => {
    if (
      INCLUDE.includes(a.action_type) ||
      a.action_type.startsWith("offsite_conversion")
    ) {
      return sum + parseFloat(a.value || "0");
    }
    return sum;
  }, 0);
}

function computeMetrics(
  spend: number,
  impressions: number,
  reach: number,
  link_clicks: number,
  frequency: number,
  results: number,
  mqls: number,
  sqls: number,
  demos: number,
  paid: number
): MetricsShape {
  return {
    spend,
    impressions,
    reach,
    link_clicks,
    frequency,
    results,
    ctr: impressions > 0 ? (link_clicks / impressions) * 100 : 0,
    cpc: link_clicks > 0 ? spend / link_clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cost_per_result: results > 0 ? spend / results : 0,
    conv_rate: link_clicks > 0 ? (results / link_clicks) * 100 : 0,
    mqls,
    cp_mql: mqls > 0 ? spend / mqls : 0,
    sqls,
    cp_sql: sqls > 0 ? spend / sqls : 0,
    demos,
    cp_demo: demos > 0 ? spend / demos : 0,
    paid,
    cp_paid: paid > 0 ? spend / paid : 0,
  };
}

async function fetchMetaAdInsights(
  since: string,
  until: string
): Promise<FBAdRow[]> {
  if (!FB_ADS_TOKEN || !FB_ADS_ACCOUNT_ID) return [];

  const accountId = FB_ADS_ACCOUNT_ID.replace("act_", "");
  const rows: FBAdRow[] = [];
  let url: string | null = `https://graph.facebook.com/v19.0/act_${accountId}/insights?level=ad&time_increment=all&time_range[since]=${since}&time_range[until]=${until}&fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,inline_link_clicks,frequency,actions&limit=200&access_token=${FB_ADS_TOKEN}`;

  let pageCount = 0;
  const maxPages = 50; // Cap at 10k rows (50 * 200)

  try {
    while (url && pageCount < maxPages) {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`FB API error: ${res.status}`);
        break;
      }

      const data = (await res.json()) as {
        data?: FBAdRow[];
        paging?: { next?: string };
      };

      if (data.data) rows.push(...data.data);

      url = data.paging?.next ?? null;
      pageCount++;
    }
  } catch (e) {
    console.error("Meta API fetch error:", e);
  }

  return rows;
}

function buildHSMap(deals: HSDeal[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const deal of deals) {
    const name = (deal.ads_name ?? "").toLowerCase().trim();
    if (!name) continue;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return map;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  if (!checkAuth(req, DASHBOARD_PASSWORD))
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const url = new URL(req.url);
  const since = url.searchParams.get("since") ?? `${new Date().getFullYear()}-01-01`;
  const until = url.searchParams.get("until") ?? new Date().toISOString().slice(0, 10);

  try {
    // Fetch Facebook ad-level insights
    const fbRows = await fetchMetaAdInsights(since, until);

    // Fetch HubSpot deals (4 parallel queries)
    const sinceTs = String(new Date(since + "T00:00:00Z").getTime());
    const untilTs = String(new Date(until + "T23:59:59Z").getTime());

    const fbFilter = {
      propertyName: "deal_source_25",
      operator: "EQ" as const,
      value: "Facebook",
    };

    const [mqlDeals, sqlDeals, demoDeals, paidDeals] = await Promise.all([
      fetchHSDeals(
        "last_crm_lead_datetime",
        sinceTs,
        untilTs,
        [
          fbFilter,
          {
            propertyName: "form_is_manufacturing",
            operator: "EQ" as const,
            value: "Yes",
          },
          {
            propertyName: "form_designation",
            operator: "IN" as const,
            values: ["Owner", "HOD"],
          },
        ],
        ["ads_name"]
      ),
      fetchHSDeals(
        "first_demo_schedule_datetime",
        sinceTs,
        untilTs,
        [
          fbFilter,
          {
            propertyName: "first_demo_schedule_datetime",
            operator: "HAS_PROPERTY" as const,
          },
        ],
        ["ads_name"]
      ),
      fetchHSDeals(
        "first_demo_complete_datetime",
        sinceTs,
        untilTs,
        [
          fbFilter,
          {
            propertyName: "first_demo_complete_datetime",
            operator: "HAS_PROPERTY" as const,
          },
        ],
        ["ads_name"]
      ),
      fetchHSDeals(
        "first_payment_date",
        sinceTs,
        untilTs,
        [
          fbFilter,
          {
            propertyName: "first_payment_date",
            operator: "HAS_PROPERTY" as const,
          },
        ],
        ["ads_name"]
      ),
    ]);

    // Build HS maps
    const mqlMap = buildHSMap(mqlDeals);
    const sqlMap = buildHSMap(sqlDeals);
    const demoMap = buildHSMap(demoDeals);
    const paidMap = buildHSMap(paidDeals);

    // Build hierarchy
    type AdMetrics = MetricsShape & { ad_id: string; ad_name: string };
    type AdSetNode = {
      adset_id: string;
      adset_name: string;
      ads: AdMetrics[];
      totals: MetricsShape;
    };
    type CampaignNode = {
      campaign_id: string;
      campaign_name: string;
      adsets: AdSetNode[];
      totals: MetricsShape;
    };

    const campaignMap = new Map<string, CampaignNode>();
    let grandSpend = 0,
      grandImpressions = 0,
      grandReach = 0,
      grandClicks = 0,
      grandResults = 0,
      grandMqls = 0,
      grandSqls = 0,
      grandDemos = 0,
      grandPaid = 0;

    for (const fbRow of fbRows) {
      const spend = parseFloat(fbRow.spend || "0");
      const impressions = parseFloat(fbRow.impressions || "0");
      const reach = parseFloat(fbRow.reach || "0");
      const link_clicks = parseFloat(fbRow.inline_link_clicks || "0");
      const freq = parseFloat(fbRow.frequency || "0");
      const results = extractResults(fbRow.actions);

      const adNameNorm = fbRow.ad_name.toLowerCase().trim();
      const mqls = mqlMap.get(adNameNorm) ?? 0;
      const sqls = sqlMap.get(adNameNorm) ?? 0;
      const demos = demoMap.get(adNameNorm) ?? 0;
      const paid = paidMap.get(adNameNorm) ?? 0;

      const adMetrics = computeMetrics(
        spend,
        impressions,
        reach,
        link_clicks,
        freq,
        results,
        mqls,
        sqls,
        demos,
        paid
      ) as AdMetrics;
      adMetrics.ad_id = fbRow.ad_id;
      adMetrics.ad_name = fbRow.ad_name;

      // Accumulate grand totals
      grandSpend += spend;
      grandImpressions += impressions;
      grandReach += reach;
      grandClicks += link_clicks;
      grandResults += results;
      grandMqls += mqls;
      grandSqls += sqls;
      grandDemos += demos;
      grandPaid += paid;

      // Get or create campaign
      let campaign = campaignMap.get(fbRow.campaign_id);
      if (!campaign) {
        campaign = {
          campaign_id: fbRow.campaign_id,
          campaign_name: fbRow.campaign_name,
          adsets: [],
          totals: computeMetrics(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        };
        campaignMap.set(fbRow.campaign_id, campaign);
      }

      // Get or create adset
      let adset = campaign.adsets.find((a) => a.adset_id === fbRow.adset_id);
      if (!adset) {
        adset = {
          adset_id: fbRow.adset_id,
          adset_name: fbRow.adset_name,
          ads: [],
          totals: computeMetrics(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        };
        campaign.adsets.push(adset);
      }

      adset.ads.push(adMetrics);
    }

    // Compute rollup totals
    for (const campaign of campaignMap.values()) {
      let campSpend = 0,
        campImp = 0,
        campReach = 0,
        campClicks = 0,
        campFreq = 0,
        campResults = 0,
        campMqls = 0,
        campSqls = 0,
        campDemos = 0,
        campPaid = 0;

      for (const adset of campaign.adsets) {
        let asSpend = 0,
          asImp = 0,
          asReach = 0,
          asClicks = 0,
          asFreq = 0,
          asResults = 0,
          asMqls = 0,
          asSqls = 0,
          asDemos = 0,
          asPaid = 0;

        for (const ad of adset.ads) {
          asSpend += ad.spend;
          asImp += ad.impressions;
          asReach += ad.reach;
          asClicks += ad.link_clicks;
          asFreq += ad.frequency;
          asResults += ad.results;
          asMqls += ad.mqls;
          asSqls += ad.sqls;
          asDemos += ad.demos;
          asPaid += ad.paid;
        }

        // Frequency rollup: total_impressions / total_reach
        if (asReach > 0) asFreq = asImp / asReach;

        adset.totals = computeMetrics(
          asSpend,
          asImp,
          asReach,
          asClicks,
          asFreq,
          asResults,
          asMqls,
          asSqls,
          asDemos,
          asPaid
        );

        campSpend += asSpend;
        campImp += asImp;
        campReach += asReach;
        campClicks += asClicks;
        campResults += asResults;
        campMqls += asMqls;
        campSqls += asSqls;
        campDemos += asDemos;
        campPaid += asPaid;
      }

      if (campReach > 0) campFreq = campImp / campReach;

      campaign.totals = computeMetrics(
        campSpend,
        campImp,
        campReach,
        campClicks,
        campFreq,
        campResults,
        campMqls,
        campSqls,
        campDemos,
        campPaid
      );
    }

    // Grand totals
    const grandFreq =
      grandReach > 0 ? grandImpressions / grandReach : 0;
    const grandTotals = computeMetrics(
      grandSpend,
      grandImpressions,
      grandReach,
      grandClicks,
      grandFreq,
      grandResults,
      grandMqls,
      grandSqls,
      grandDemos,
      grandPaid
    );

    const response = {
      campaigns: Array.from(campaignMap.values()),
      grand_totals: grandTotals,
      meta: {
        since,
        until,
        fb_ad_rows: fbRows.length,
        hs_totals: {
          mqls: mqlDeals.length,
          sqls: sqlDeals.length,
          demos: demoDeals.length,
          paid: paidDeals.length,
        },
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Meta ads table error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/meta-ads-table" };
