import { IncomingMessage, ServerResponse } from "http";

const FB_ADS_TOKEN = process.env.FB_ADS_TOKEN ?? "";
const FB_ADS_ACCOUNT_ID = process.env.FB_ADS_ACCOUNT_ID ?? "";
const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const REFRESH_TOKEN = (process.env.REFRESH_TOKEN ?? "").trim();

type HSDeal = Record<string, string>;

async function fetchHSDeals(
  dateProperty: string,
  sinceTs: string,
  untilTs: string,
  extraFilters: Array<{ propertyName: string; operator: string; value?: string; values?: string[] }>,
  properties: string[]
): Promise<HSDeal[]> {
  const deals: HSDeal[] = [];
  let after: string | undefined;
  while (true) {
    const body: Record<string, unknown> = {
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
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      results?: Array<{ properties: HSDeal }>;
      paging?: { next?: { after: string } };
    };
    for (const r of data.results ?? []) deals.push(r.properties);
    if (!data.paging?.next?.after || deals.length >= 5000) break;
    after = data.paging.next.after;
  }
  return deals;
}

async function saveToDatabase(
  since: string,
  until: string,
  data: Record<string, any>
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/meta_ads_cache`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        date_range: `${since}_${until}`,
        since,
        until,
        data,
        cached_at: new Date().toISOString(),
      }),
    });

    return res.ok;
  } catch (e) {
    console.error("Database save error:", e);
    return false;
  }
}

export default async (req: IncomingMessage & { query?: Record<string, any> }, res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Check if this is a scheduled cron request or manual trigger
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  // Verify the refresh token for security
  if (!REFRESH_TOKEN || token !== REFRESH_TOKEN) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    // Refresh last 30 days of data
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const until = today.toISOString().slice(0, 10);
    const since = thirtyDaysAgo.toISOString().slice(0, 10);

    console.log(`Refreshing Meta Ads data from ${since} to ${until}`);

    // Call the main endpoint to fetch and store data
    const mainRes = await fetch(
      `https://tranzact-dashboard.vercel.app/api/meta-ads-table?since=${since}&until=${until}&force=true`,
      {
        headers: { Authorization: `Bearer ${REFRESH_TOKEN}` },
      }
    );

    if (!mainRes.ok) {
      throw new Error(`Main endpoint failed: ${mainRes.status}`);
    }

    const data = await mainRes.json();

    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: true,
        message: "Meta Ads data refreshed successfully",
        date_range: `${since} to ${until}`,
        records_updated: data.meta?.fb_ad_rows || 0,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.error("Refresh error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err), success: false }));
  }
};

export const config = {
  path: "/api/refresh-meta-ads",
};
