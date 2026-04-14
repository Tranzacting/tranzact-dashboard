const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? "";
const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? "";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function checkAuth(req, password) {
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

async function fetchMetaInsights(since, until) {
  if (!FB_ADS_TOKEN || !FB_ADS_ACCOUNT_ID) return [];

  const accountId = FB_ADS_ACCOUNT_ID.replace("act_", "");
  const baseUrl =
    `https://graph.facebook.com/v19.0/act_${accountId}/insights` +
    `?fields=campaign_id,campaign_name,spend,impressions,reach,clicks` +
    `&level=campaign&time_increment=1` +
    `&time_range[since]=${since}&time_range[until]=${until}` +
    `&limit=200&access_token=${FB_ADS_TOKEN}`;

  const rows = [];
  let nextUrl = baseUrl;

  while (nextUrl && rows.length < 20000) {
    try {
      const res = await fetch(nextUrl);
      if (!res.ok) break;

      const data = await res.json();

      if (data.error) {
        console.error("Meta API error:", data.error.message);
        break;
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

function groupByCampaign(rows) {
  const byCampaign = new Map();

  for (const r of rows) {
    if (!byCampaign.has(r.campaign_id)) {
      byCampaign.set(r.campaign_id, {
        id: r.campaign_id,
        name: r.campaign_name,
        rows: [],
      });
    }
    byCampaign.get(r.campaign_id).rows.push(r);
  }

  return Array.from(byCampaign.values());
}

function generatePeriods(since, until, cadence) {
  const periods = [];
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

function getPeriodKey(date, cadence) {
  if (cadence === "daily") return date.toISOString().slice(0, 10);
  if (cadence === "weekly") {
    const d = new Date(date);
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 7);
}

function aggregateByPeriod(rows, cadence, periods) {
  const agg = {};

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

function computeMetrics(data) {
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

module.exports = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const cadence = url.searchParams.get("cadence") || "monthly";
    const since = url.searchParams.get("since") || new Date().getFullYear() + "-01-01";
    const until = url.searchParams.get("until") || new Date().toISOString().slice(0, 10);

    const rows = await fetchMetaInsights(since, until);
    const campaigns = groupByCampaign(rows);
    const periods = generatePeriods(since, until, cadence);

    const by_campaign = {};
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

      const periodMetrics = {};

      for (const period of periods) {
        const data = byPeriod[period] || { spend: 0, impressions: 0, reach: 0, clicks: 0 };
        periodMetrics[period] = computeMetrics(data);

        totals.spend += data.spend;
        totals.impressions += data.impressions;
        totals.reach += data.reach;
        totals.clicks += data.clicks;
      }

      totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
      totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

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
      totalMetrics.impressions > 0 ? (totalMetrics.spend / totalMetrics.impressions) * 1000 : 0;

    return new Response(
      JSON.stringify({
        periods,
        campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
        by_campaign,
        totals: totalMetrics,
        data_through: until,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
