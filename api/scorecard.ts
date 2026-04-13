import { IncomingMessage, ServerResponse } from "http";

// Environment variables
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";
const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? "";
const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? "";
const GA_DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
const GA_ACCOUNT_ID = (process.env.GOOGLE_ADS_ACCOUNT_ID ?? "").replace(/-/g, "");
const GA_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID ?? "";
const GA_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET ?? "";
const GA_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "";
const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function checkAuth(req: IncomingMessage, password: string): boolean {
  const auth = (req.headers.authorization as string) ?? "";
  const token = auth.replace("Bearer ", "");
  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64").toString("utf-8");
  } catch {
    /* */
  }
  return decoded === password;
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
  if (!res.ok) throw new Error(`OAuth failed: ${res.statusText}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access token");
  return data.access_token;
}

async function fetchMonthMQLs(monthStart: Date, monthEnd: Date): Promise<number> {
  if (!HS_TOKEN) return 0;

  const sinceTs = monthStart.getTime();
  const untilTs = monthEnd.getTime();

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

async function fetchMonthDemos(monthStart: Date, monthEnd: Date): Promise<number> {
  if (!HS_TOKEN) return 0;

  const sinceTs = monthStart.getTime();
  const untilTs = monthEnd.getTime();

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

async function fetchFacebookSpend(since: string, until: string): Promise<number> {
  if (!FB_ADS_TOKEN || !FB_ADS_ACCOUNT_ID) return 0;

  const accountId = FB_ADS_ACCOUNT_ID.replace("act_", "");

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=spend&level=account&time_range[since]=${since}&time_range[until]=${until}&access_token=${FB_ADS_TOKEN}`
    );

    if (!res.ok) return 0;

    const data = (await res.json()) as {
      data?: Array<{ spend: string }>;
    };

    let totalSpend = 0;
    for (const row of data.data ?? []) {
      totalSpend += parseFloat(row.spend || "0");
    }
    return totalSpend;
  } catch {
    return 0;
  }
}

async function fetchGoogleAdSpend(since: string, until: string): Promise<number> {
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

export default async (req: IncomingMessage, res: ServerResponse) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Format dates for APIs
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    const monthEndStr = monthEnd.toISOString().slice(0, 10);
    const monthKey = monthStart.toISOString().slice(0, 7);

    // Fetch all data in parallel
    const [mqls, demos, fbSpend, gaSpend] = await Promise.all([
      fetchMonthMQLs(monthStart, monthEnd),
      fetchMonthDemos(monthStart, monthEnd),
      fetchFacebookSpend(monthStartStr, monthEndStr),
      fetchGoogleAdSpend(monthStartStr, monthEndStr),
    ]);

    const totalSpend = fbSpend + gaSpend;
    const cpMql = mqls > 0 ? Math.round(totalSpend / mqls) : 0;
    const cpDemo = demos > 0 ? Math.round(totalSpend / demos) : 0;

    const scorecard = {
      spend: {
        facebook: Math.round(fbSpend),
        google: Math.round(gaSpend),
        total: Math.round(totalSpend),
      },
      mqls,
      cp_mql: cpMql,
      demos,
      cp_demo: cpDemo,
      month: monthKey,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(scorecard));
  } catch (err) {
    console.error("Scorecard error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
};
