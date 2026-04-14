const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? "";
const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? "";
const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? "";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function checkAuth(req, password) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  let decoded = "";
  try {
    decoded = atob(token);
  } catch {
    /* */
  }
  return decoded === password.trim();
}

function extractResults(actions = []) {
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

function computeMetrics(spend, impressions, reach, link_clicks, frequency, results, mqls, sqls, demos, paid) {
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

async function fetchMetaAdInsights(since, until) {
  if (!FB_ADS_TOKEN || !FB_ADS_ACCOUNT_ID) return [];

  const accountId = FB_ADS_ACCOUNT_ID.replace("act_", "");
  const rows = [];
  let url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?level=ad&time_increment=all&time_range[since]=${since}&time_range[until]=${until}&fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,inline_link_clicks,frequency,actions&limit=200&access_token=${FB_ADS_TOKEN}`;

  let pageCount = 0;
  const maxPages = 50;

  try {
    while (url && pageCount < maxPages) {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`FB API error: ${res.status}`);
        break;
      }

      const data = await res.json();

      if (data.data) rows.push(...data.data);

      url = data.paging?.next ?? null;
      pageCount++;
    }
  } catch (e) {
    console.error("Meta API fetch error:", e);
  }

  return rows;
}

async function fetchHSDeals(dateProperty, sinceTs, untilTs, extraFilters, properties) {
  const deals = [];
  let after = undefined;
  while (true) {
    const body = {
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
    const data = await res.json();
    for (const r of data.results ?? []) deals.push(r.properties);
    if (!data.paging?.next?.after || deals.length >= 5000) break;
    after = data.paging.next.after;
  }
  return deals;
}

function buildHSMap(deals) {
  const map = new Map();
  for (const deal of deals) {
    const name = (deal.ads_name ?? "").toLowerCase().trim();
    if (!name) continue;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return map;
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const since = url.searchParams.get("since") ?? `${new Date().getFullYear()}-01-01`;
  const until = url.searchParams.get("until") ?? new Date().toISOString().slice(0, 10);

  try {
    const fbRows = await fetchMetaAdInsights(since, until);

    const sinceTs = String(new Date(since + "T00:00:00Z").getTime());
    const untilTs = String(new Date(until + "T23:59:59Z").getTime());

    const fbFilter = {
      propertyName: "deal_source_25",
      operator: "EQ",
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
            operator: "EQ",
            value: "Yes",
          },
          {
            propertyName: "form_designation",
            operator: "IN",
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
            operator: "HAS_PROPERTY",
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
            operator: "HAS_PROPERTY",
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
            operator: "HAS_PROPERTY",
          },
        ],
        ["ads_name"]
      ),
    ]);

    const mqlMap = buildHSMap(mqlDeals);
    const sqlMap = buildHSMap(sqlDeals);
    const demoMap = buildHSMap(demoDeals);
    const paidMap = buildHSMap(paidDeals);

    const campaignMap = new Map();
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
      );
      adMetrics.ad_id = fbRow.ad_id;
      adMetrics.ad_name = fbRow.ad_name;

      grandSpend += spend;
      grandImpressions += impressions;
      grandReach += reach;
      grandClicks += link_clicks;
      grandResults += results;
      grandMqls += mqls;
      grandSqls += sqls;
      grandDemos += demos;
      grandPaid += paid;

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

    const grandFreq = grandReach > 0 ? grandImpressions / grandReach : 0;
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

    res.status(200).json(response);
  } catch (err) {
    console.error("Meta ads table error:", err);
    res.status(500).json({ error: String(err) });
  }
};
