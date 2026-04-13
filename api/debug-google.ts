import { IncomingMessage, ServerResponse } from "http";

const GA_DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
const GA_ACCOUNT_ID = (process.env.GOOGLE_ADS_ACCOUNT_ID ?? "").replace(/-/g, "");
const GA_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID ?? "";
const GA_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET ?? "";
const GA_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "";
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

export default async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("Content-Type", "application/json");

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    const formattedId = GA_ACCOUNT_ID.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    const since = "2026-04-01";
    const until = "2026-04-30";

    const accessToken = await getGoogleAccessToken();

    const body = {
      query: `SELECT metrics.cost_micros FROM customer WHERE segments.date BETWEEN '${since}' AND '${until}'`,
    };

    const apiUrl = `https://googleads.googleapis.com/v19/customers/${formattedId}/googleAds:search`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": GA_DEV_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    res.writeHead(response.status);
    res.end(JSON.stringify({
      status: response.status,
      ok: response.ok,
      url: apiUrl,
      customer_id: GA_ACCOUNT_ID,
      formatted_id: formattedId,
      query: body.query,
      response: responseText ? JSON.parse(responseText) : responseText,
    }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
};
