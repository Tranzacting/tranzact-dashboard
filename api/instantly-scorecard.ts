import { IncomingMessage, ServerResponse } from "http";

const INSTANTLY_API_KEY = (process.env.INSTANTLY_API_KEY ?? "").trim();
const DASHBOARD_PASSWORD = (process.env.DASHBOARD_PASSWORD ?? "").trim();

interface InstantlyCampaign {
  id: string;
  name: string;
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
  created_at?: string;
}

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

async function fetchInstantlyCampaigns(): Promise<InstantlyCampaign[]> {
  if (!INSTANTLY_API_KEY) return [];

  try {
    // Instantly API endpoint - using the API key for authentication
    const res = await fetch("https://api.instantly.ai/api/v1/campaign/list", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${INSTANTLY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error(`Instantly API error: ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { data?: InstantlyCampaign[] };
    return data.data ?? [];
  } catch (e) {
    console.error("Error fetching Instantly campaigns:", e);
    return [];
  }
}

function filterByDateRange(
  campaigns: InstantlyCampaign[],
  since: Date,
  until: Date
): InstantlyCampaign[] {
  return campaigns.filter((campaign) => {
    if (!campaign.created_at) return false;
    const createdDate = new Date(campaign.created_at);
    return createdDate >= since && createdDate <= until;
  });
}

export default async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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
    // Get current and previous month boundaries
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Fetch all campaigns
    const allCampaigns = await fetchInstantlyCampaigns();

    // Filter by month
    const currentMonthCampaigns = filterByDateRange(allCampaigns, currentMonthStart, currentMonthEnd);
    const previousMonthCampaigns = filterByDateRange(allCampaigns, previousMonthStart, previousMonthEnd);

    // Aggregate metrics
    const aggregateMetrics = (campaigns: InstantlyCampaign[]) => ({
      sent: campaigns.reduce((sum, c) => sum + (c.sent || 0), 0),
      opened: campaigns.reduce((sum, c) => sum + (c.opened || 0), 0),
      replied: campaigns.reduce((sum, c) => sum + (c.replied || 0), 0),
      bounced: campaigns.reduce((sum, c) => sum + (c.bounced || 0), 0),
    });

    const current = aggregateMetrics(currentMonthCampaigns);
    const previous = aggregateMetrics(previousMonthCampaigns);

    // Calculate rates
    const calculateRates = (metrics: typeof current) => ({
      ...metrics,
      open_rate: metrics.sent > 0 ? (metrics.opened / metrics.sent) * 100 : 0,
      reply_rate: metrics.sent > 0 ? (metrics.replied / metrics.sent) * 100 : 0,
      bounce_rate: metrics.sent > 0 ? (metrics.bounced / metrics.sent) * 100 : 0,
    });

    const currentMetrics = calculateRates(current);
    const previousMetrics = calculateRates(previous);

    // Calculate deltas
    const calculateDelta = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : 0;

    const scorecard = {
      month: currentMonthStart.toISOString().slice(0, 7),
      current: currentMetrics,
      previous: previousMetrics,
      delta: {
        sent_pct: calculateDelta(current.sent, previous.sent),
        opened_pct: calculateDelta(current.opened, previous.opened),
        replied_pct: calculateDelta(current.replied, previous.replied),
        open_rate_delta: currentMetrics.open_rate - previousMetrics.open_rate,
        reply_rate_delta: currentMetrics.reply_rate - previousMetrics.reply_rate,
      },
      campaigns_count: currentMonthCampaigns.length,
    };

    res.writeHead(200);
    res.end(JSON.stringify(scorecard));
  } catch (err) {
    console.error("Instantly scorecard error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
};
