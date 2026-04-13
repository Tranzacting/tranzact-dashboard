import { IncomingMessage, ServerResponse } from "http";

const GA_CLIENT_ID = (process.env.GOOGLE_ADS_CLIENT_ID ?? "").trim();
const GA_CLIENT_SECRET = (process.env.GOOGLE_ADS_CLIENT_SECRET ?? "").trim();
const GA_REFRESH_TOKEN = (process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "").trim();

export default async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("Content-Type", "application/json");

  try {
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

    const oauthText = await oauthRes.text();
    const oauthJson = oauthText ? JSON.parse(oauthText) : null;

    res.writeHead(oauthRes.status);
    res.end(JSON.stringify({
      status: oauthRes.status,
      ok: oauthRes.ok,
      has_access_token: !!oauthJson?.access_token,
      response: oauthJson,
    }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
};
