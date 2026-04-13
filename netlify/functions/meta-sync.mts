const FB_TOKEN = process.env.FB_ADS_TOKEN ?? "";
const FB_ACCOUNT_ID = (process.env.FB_ADS_ACCOUNT_ID ?? "").replace("act_", "");
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

interface CampaignDay {
  date: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  synced_at: string;
}

async function fetchMetaInsights(since: string, until: string): Promise<CampaignDay[]> {
  const baseUrl =
    `https://graph.facebook.com/v19.0/act_${FB_ACCOUNT_ID}/insights` +
    `?fields=campaign_id,campaign_name,spend,impressions,reach,clicks` +
    `&level=campaign&time_increment=1` +
    `&time_range[since]=${since}&time_range[until]=${until}` +
    `&limit=200&access_token=${FB_TOKEN}`;

  const rows: CampaignDay[] = [];
  let nextUrl: string | null = baseUrl;
  const now = new Date().toISOString();

  while (nextUrl && rows.length < 20000) {
    const res = await fetch(nextUrl);
    if (!res.ok) break;
    const data = await res.json() as {
      data?: Array<{
        date_start: string; campaign_id: string; campaign_name: string;
        spend: string; impressions: string; reach: string; clicks: string;
      }>;
      paging?: { next?: string };
      error?: { message: string };
    };
    if (data.error) { console.error("Meta API error:", data.error.message); break; }
    for (const r of data.data ?? []) {
      rows.push({
        date: r.date_start,
        campaign_id: r.campaign_id,
        campaign_name: r.campaign_name,
        spend: parseFloat(r.spend || "0"),
        impressions: parseInt(r.impressions || "0"),
        reach: parseInt(r.reach || "0"),
        clicks: parseInt(r.clicks || "0"),
        synced_at: now,
      });
    }
    nextUrl = data.paging?.next ?? null;
  }
  return rows;
}

async function upsertRows(rows: CampaignDay[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/meta_ads_daily`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Supabase upsert failed: ${await res.text()}`);
  }
}

async function hasAnyData(): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/meta_ads_daily?select=date&limit=1`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return false;
  const rows = await res.json() as unknown[];
  return rows.length > 0;
}

export default async (): Promise<Response> => {
  if (!FB_TOKEN || !FB_ACCOUNT_ID || !SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Missing credentials" }), { status: 500 });
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // On first run (empty table), backfill 90 days. Otherwise sync last 2 days.
  let since: string;
  if (!(await hasAnyData())) {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    since = d.toISOString().slice(0, 10);
  } else {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    since = d.toISOString().slice(0, 10);
  }

  const rows = await fetchMetaInsights(since, todayStr);
  if (rows.length > 0) await upsertRows(rows);

  return new Response(JSON.stringify({ synced: rows.length, since, until: todayStr }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  schedule: "0 2 * * *", // 2am UTC daily
  path: "/api/meta-sync",
};
