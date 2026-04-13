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

  const steps: any = {
    env_vars_ok: false,
    oauth_ok: false,
    api_called: false,
  };

  try {
    // Step 1: Check env vars
    const envVarsOk = GA_DEV_TOKEN && GA_ACCOUNT_ID && GA_CLIENT_ID && GA_CLIENT_SECRET && GA_REFRESH_TOKEN;
    steps.env_vars_ok = envVarsOk;
    steps.env_details = {
      dev_token_len: GA_DEV_TOKEN.length,
      account_id: GA_ACCOUNT_ID,
      client_id_len: GA_CLIENT_ID.length,
      client_secret_len: GA_CLIENT_SECRET.length,
      refresh_token_len: GA_REFRESH_TOKEN.length,
    };

    if (!envVarsOk) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing env vars", steps }));
      return;
    }

    // Step 2: Get OAuth token
    steps.oauth_attempt = true;
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

    steps.oauth_status = oauthRes.status;
    const oauthData = await oauthRes.text();
    steps.oauth_response_len = oauthData.length;

    if (!oauthRes.ok) {
      res.writeHead(400);
      res.end(JSON.stringify({
        error: "OAuth failed",
        steps,
        oauth_body: oauthData.slice(0, 500),
      }));
      return;
    }

    steps.oauth_ok = true;
    const tokenData = JSON.parse(oauthData) as { access_token?: string };

    if (!tokenData.access_token) {
      res.writeHead(400);
      res.end(JSON.stringify({
        error: "No access token",
        steps,
      }));
      return;
    }

    steps.access_token_len = tokenData.access_token.length;

    // Step 3: Test Google Ads API
    const formattedId = GA_ACCOUNT_ID.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    const since = "2026-04-01";
    const until = "2026-04-30";

    steps.api_attempt = true;
    steps.formatted_id = formattedId;
    steps.query = `SELECT metrics.cost_micros FROM customer WHERE segments.date BETWEEN '${since}' AND '${until}'`;

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
          query: steps.query,
        }),
      }
    );

    steps.api_status = apiRes.status;
    const apiData = await apiRes.text();
    steps.api_response_len = apiData.length;

    res.writeHead(200);
    res.end(JSON.stringify({
      success: apiRes.ok,
      steps,
      api_response: apiData.length > 0 ? JSON.parse(apiData) : null,
    }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err), steps }));
  }
};
