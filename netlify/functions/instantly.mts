const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY ?? "";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";

const STATUS_MAP: Record<number, string> = { 1: "Active", 2: "Paused", 3: "Completed", 4: "Draft" };

interface CampaignAnalytics {
  campaign_name: string;
  campaign_id: string;
  campaign_status: number;
  leads_count: number;
  contacted_count: number;
  emails_sent_count: number;
  open_count_unique: number;
  reply_count_unique: number;
  bounced_count: number;
  unsubscribed_count: number;
  total_opportunities: number;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  sent: number;
  open_rate: number;
  reply_rate: number;
  bounce_rate: number;
  opportunities: number;
  leads: number;
}

export default async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  let password = "";
  try { password = atob(token); } catch { /**/ }
  if (password !== DASHBOARD_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const now = new Date();
  const since = url.searchParams.get("since") || `${now.getFullYear()}-01-01`;
  const until = url.searchParams.get("until") || now.toISOString().slice(0, 10);
  const statusFilter = url.searchParams.get("status") || "all";

  try {
    const params = new URLSearchParams({ start_date: since, end_date: until });
    const res = await fetch(`https://api.instantly.ai/api/v2/campaigns/analytics?${params}`, {
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}`, "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Instantly API error ${res.status}: ${err}`);
    }

    const raw = await res.json() as CampaignAnalytics[];

    let campaigns: CampaignRow[] = raw.map(c => ({
      id: c.campaign_id,
      name: c.campaign_name,
      status: STATUS_MAP[c.campaign_status] ?? "Unknown",
      sent: c.emails_sent_count,
      open_rate: c.emails_sent_count > 0 ? (c.open_count_unique / c.emails_sent_count) * 100 : 0,
      reply_rate: c.emails_sent_count > 0 ? (c.reply_count_unique / c.emails_sent_count) * 100 : 0,
      bounce_rate: c.emails_sent_count > 0 ? (c.bounced_count / c.emails_sent_count) * 100 : 0,
      opportunities: c.total_opportunities,
      leads: c.leads_count,
    }));

    if (statusFilter !== "all") {
      campaigns = campaigns.filter(c => c.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Sort by sent descending
    campaigns.sort((a, b) => b.sent - a.sent);

    // Totals
    const totals = campaigns.reduce((acc, c) => ({
      sent: acc.sent + c.sent,
      opportunities: acc.opportunities + c.opportunities,
      leads: acc.leads + c.leads,
    }), { sent: 0, opportunities: 0, leads: 0 });

    return new Response(JSON.stringify({ campaigns, totals, since, until }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/instantly" };
