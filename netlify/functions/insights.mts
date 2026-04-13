import {
  corsHeaders,
  checkAuth,
  DASHBOARD_PASSWORD,
  FB_ADS_TOKEN,
  FB_ADS_ACCOUNT_ID,
  GA_DEV_TOKEN,
  GA_ACCOUNT_ID,
  GA_CLIENT_ID,
  GA_CLIENT_SECRET,
  GA_REFRESH_TOKEN,
  HS_TOKEN,
  getWeekRange,
  generateInsights,
} from "./_shared.mts";

// Get Google OAuth access token
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
  if (!res.ok) throw new Error(`OAuth failed: ${res.statusText}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access token");
  return data.access_token;
}

// Fetch MQL count for a date range
async function fetchMQLs(sinceTs: number, untilTs: number): Promise<number> {
  if (!HS_TOKEN) return 0;

  const body = {
    filterGroups: [
      {
        filters: [
          { propertyName: "last_crm_lead_datetime", operator: "GTE", value: sinceTs.toString() },
          { propertyName: "last_crm_lead_datetime", operator: "LTE", value: untilTs.toString() },
          { propertyName: "form_is_manufacturing", operator: "EQ", value: "Yes" },
          { propertyName: "form_designation", operator: "IN", values: ["Owner", "HOD"] },
        ],
      },
    ],
    limit: 1,
  };

  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return 0;
    const data = (await res.json()) as { total?: number };
    return data.total ?? 0;
  } catch {
    return 0;
  }
}

// Fetch Demo count for a date range
async function fetchDemos(sinceTs: number, untilTs: number): Promise<number> {
  if (!HS_TOKEN) return 0;

  const body = {
    filterGroups: [
      {
        filters: [
          { propertyName: "first_demo_complete_datetime", operator: "GTE", value: sinceTs.toString() },
          { propertyName: "first_demo_complete_datetime", operator: "LTE", value: untilTs.toString() },
        ],
      },
    ],
    limit: 1,
  };

  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return 0;
    const data = (await res.json()) as { total?: number };
    return data.total ?? 0;
  } catch {
    return 0;
  }
}

// Fetch spend for a date range from Facebook
async function fetchFBSpend(since: string, until: string): Promise<number> {
  if (!FB_ADS_TOKEN || !FB_ADS_ACCOUNT_ID) return 0;

  const accountId = FB_ADS_ACCOUNT_ID.replace("act_", "");

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=spend&level=account&time_range[since]=${since}&time_range[until]=${until}&access_token=${FB_ADS_TOKEN}`
    );

    if (!res.ok) return 0;
    const data = (await res.json()) as { data?: Array<{ spend: string }> };

    let totalSpend = 0;
    for (const row of data.data ?? []) {
      totalSpend += parseFloat(row.spend || "0");
    }
    return totalSpend;
  } catch {
    return 0;
  }
}

// Fetch spend for a date range from Google Ads
async function fetchGASpend(since: string, until: string): Promise<number> {
  if (!GA_DEV_TOKEN || !GA_ACCOUNT_ID) return 0;

  try {
    const accessToken = await getGoogleAccessToken();

    const body = {
      query: `SELECT metrics.cost_micros FROM customer WHERE segments.date BETWEEN '${since}' AND '${until}'`,
    };

    const res = await fetch(
      `https://googleads.googleapis.com/v19/customers/${GA_ACCOUNT_ID}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": GA_DEV_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) return 0;

    const data = (await res.json()) as {
      results?: Array<{ metrics?: { costMicros?: string } }>;
    };

    let totalCost = 0;
    for (const row of data.results ?? []) {
      const costMicros = row.metrics?.costMicros ?? "0";
      totalCost += parseInt(costMicros) / 1_000_000;
    }
    return totalCost;
  } catch {
    return 0;
  }
}

function calculateDeltaPct(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export default async (req: Request): Promise<Response> => {
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
    // Get week ranges
    const currentWeek = getWeekRange(0);
    const previousWeek = getWeekRange(-1);

    // Convert to timestamp ranges for HubSpot
    const currentWeekStart = new Date(currentWeek.since + "T00:00:00Z").getTime();
    const currentWeekEnd = new Date(currentWeek.until + "T23:59:59Z").getTime();
    const previousWeekStart = new Date(previousWeek.since + "T00:00:00Z").getTime();
    const previousWeekEnd = new Date(previousWeek.until + "T23:59:59Z").getTime();

    // Fetch all metrics in parallel
    const [
      currentMQLs,
      currentDemos,
      previousMQLs,
      previousDemos,
      currentFBSpend,
      currentGASpend,
      previousFBSpend,
      previousGASpend,
    ] = await Promise.all([
      fetchMQLs(currentWeekStart, currentWeekEnd),
      fetchDemos(currentWeekStart, currentWeekEnd),
      fetchMQLs(previousWeekStart, previousWeekEnd),
      fetchDemos(previousWeekStart, previousWeekEnd),
      fetchFBSpend(currentWeek.since, currentWeek.until),
      fetchGASpend(currentWeek.since, currentWeek.until),
      fetchFBSpend(previousWeek.since, previousWeek.until),
      fetchGASpend(previousWeek.since, previousWeek.until),
    ]);

    const currentSpend = currentFBSpend + currentGASpend;
    const previousSpend = previousFBSpend + previousGASpend;

    // Build metrics for Claude
    const metrics = {
      spend_total: {
        current: Math.round(currentSpend),
        previous: Math.round(previousSpend),
        delta_pct: calculateDeltaPct(currentSpend, previousSpend),
      },
      mqls: {
        current: currentMQLs,
        previous: previousMQLs,
        delta_pct: calculateDeltaPct(currentMQLs, previousMQLs),
      },
      demos: {
        current: currentDemos,
        previous: previousDemos,
        delta_pct: calculateDeltaPct(currentDemos, previousDemos),
      },
    };

    // Generate insights with Claude
    const claudeInsights = await generateInsights(metrics);

    // Build response
    const response = {
      week: { from: currentWeek.since, to: currentWeek.until },
      highlights: claudeInsights?.highlights ?? [],
      concerns: claudeInsights?.concerns ?? [],
      recommended_questions: claudeInsights?.recommended_questions ?? [],
      metrics,
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Insights error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/insights" };
