import { IncomingMessage, ServerResponse } from "http";

const GA_DEV_TOKEN = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "").trim();
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

    // List accessible customers
    const listRes = await fetch(
      `https://googleads.googleapis.com/v19/customers:listAccessibleCustomers`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${oauthJson.access_token}`,
          "developer-token": GA_DEV_TOKEN,
        },
      }
    );

    const listText = await listRes.text();
    let listJson = null;
    try {
      listJson = JSON.parse(listText);
    } catch (e) {
      // Not JSON
    }

    res.writeHead(listRes.status);
    res.end(JSON.stringify({
      status: listRes.status,
      ok: listRes.ok,
      response_preview: listText.slice(0, 300),
      response_json: listJson,
    }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
};
