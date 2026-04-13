import { VercelRequest, VercelResponse } from "@vercel/node";

// Environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";
const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? "";
const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? "";
const GA_DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
const GA_ACCOUNT_ID = (process.env.GOOGLE_ADS_ACCOUNT_ID ?? "").replace(/-/g, "");
const GA_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID ?? "";
const GA_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET ?? "";
const GA_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "";
const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? "";

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

function getWeekRange(offsetWeeks: number = 0): { since: string; until: string } {
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

function calculateDeltaPct(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
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

async function generateInsights(
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

export default async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    const currentWeek = getWeekRange(0);
    const previousWeek = getWeekRange(-1);

    const currentWeekStart = new Date(currentWeek.since + "T00:00:00Z").getTime();
    const currentWeekEnd = new Date(currentWeek.until + "T23:59:59Z").getTime();
    const previousWeekStart = new Date(previousWeek.since + "T00:00:00Z").getTime();
    const previousWeekEnd = new Date(previousWeek.until + "T23:59:59Z").getTime();

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

    const claudeInsights = await generateInsights(metrics);

    const response = {
      week: { from: currentWeek.since, to: currentWeek.until },
      highlights: claudeInsights?.highlights ?? [],
      concerns: claudeInsights?.concerns ?? [],
      recommended_questions: claudeInsights?.recommended_questions ?? [],
      metrics,
      generated_at: new Date().toISOString(),
    };

    res.writeHead(200);
    res.end(JSON.stringify(response));
  } catch (err) {
    console.error("Insights error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
};
