import { IncomingMessage, ServerResponse } from "http";

const GA_DEV_TOKEN = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "").trim();
const GA_ACCOUNT_ID = (process.env.GOOGLE_ADS_ACCOUNT_ID ?? "").replace(/-/g, "").trim();
const GA_CLIENT_ID = (process.env.GOOGLE_ADS_CLIENT_ID ?? "").trim();
const GA_CLIENT_SECRET = (process.env.GOOGLE_ADS_CLIENT_SECRET ?? "").trim();
const GA_REFRESH_TOKEN = (process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "").trim();

export default async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("Content-Type", "application/json");

  try {
    // Get access token
    const oauthRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: GA_CLIENT_ID,
        client_secret: GA_CLIENT_SECRET,
        refresh_token: GA_REFRESH_TOKEN,
      }),
    });

    const oauthJson = (await oauthRes.json()) as { access_token?: string };
    if (!oauthJson.access_token) throw new Error("No access token");

    // Call Google Ads API (use raw ID without hyphens)
    const rawId = GA_ACCOUNT_ID;
    const apiUrl = `https://googleads.googleapis.com/v19/customers/${rawId}/googleAds:search`;
    const query = `SELECT metrics.cost_micros FROM customer WHERE segments.date BETWEEN '2026-04-01' AND '2026-04-30'`;

    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauthJson.access_token}`,
        "developer-token": GA_DEV_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const apiText = await apiRes.text();
    let apiJson = null;
    try {
      apiJson = JSON.parse(apiText);
    } catch (e) {
      // Not JSON, return as text
    }

    res.writeHead(apiRes.status);
    res.end(JSON.stringify({
      status: apiRes.status,
      ok: apiRes.ok,
      customer_id_raw: rawId,
      url: apiUrl,
      content_type: apiRes.headers.get("content-type"),
      response_length: apiText.length,
      response_preview: apiText.slice(0, 300),
      response_json: apiJson,
    }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
};
