import { IncomingMessage, ServerResponse } from "http";

const GA_DEV_TOKEN = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "").trim();
const GA_ACCOUNT_ID = (process.env.GOOGLE_ADS_ACCOUNT_ID ?? "").replace(/-/g, "").trim();
const GA_CLIENT_ID = (process.env.GOOGLE_ADS_CLIENT_ID ?? "").trim();
const GA_CLIENT_SECRET = (process.env.GOOGLE_ADS_CLIENT_SECRET ?? "").trim();
const GA_REFRESH_TOKEN = (process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "").trim();
const DASHBOARD_PASSWORD = (process.env.DASHBOARD_PASSWORD ?? "").trim();

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

export default async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("Content-Type", "application/json");

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    // Step 1: Check env vars
    const envVarsOk = GA_DEV_TOKEN && GA_ACCOUNT_ID && GA_CLIENT_ID && GA_CLIENT_SECRET && GA_REFRESH_TOKEN;

    if (!envVarsOk) {
      res.writeHead(400);
      res.end(JSON.stringify({
        error: "Missing env vars",
        has_dev_token: !!GA_DEV_TOKEN,
        has_account_id: !!GA_ACCOUNT_ID,
        has_client_id: !!GA_CLIENT_ID,
        has_client_secret: !!GA_CLIENT_SECRET,
        has_refresh_token: !!GA_REFRESH_TOKEN,
      }));
      return;
    }

    // Step 2: Get OAuth token
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

    const oauthData = (await oauthRes.text());

    if (!oauthRes.ok) {
      res.writeHead(400);
      res.end(JSON.stringify({
        error: "OAuth failed",
        oauth_status: oauthRes.status,
        oauth_response: oauthData,
      }));
      return;
    }

    const tokenData = JSON.parse(oauthData) as { access_token?: string };

    if (!tokenData.access_token) {
      res.writeHead(400);
      res.end(JSON.stringify({
        error: "No access token in response",
        oauth_response: oauthData,
      }));
      return;
    }

    // Step 3: Test Google Ads API
    const formattedId = GA_ACCOUNT_ID.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    const since = "2026-04-01";
    const until = "2026-04-30";

    const apiRes = await fetch(
      `https://googleads.googleapis.com/v19/customers/${formattedId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "developer-token": GA_DEV_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `SELECT metrics.cost_micros FROM customer WHERE segments.date BETWEEN '${since}' AND '${until}'`,
        }),
      }
    );

    const apiData = await apiRes.text();

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      oauth_ok: true,
      api_status: apiRes.status,
      api_response: apiData ? JSON.parse(apiData) : null,
    }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
};
