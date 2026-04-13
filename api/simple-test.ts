import { IncomingMessage, ServerResponse } from "http";

export default async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ test: "works", env_vars_present: {
    ga_dev_token: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    ga_client_id: !!process.env.GOOGLE_ADS_CLIENT_ID,
    ga_client_secret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
    ga_refresh_token: !!process.env.GOOGLE_ADS_REFRESH_TOKEN,
    ga_account_id: !!process.env.GOOGLE_ADS_ACCOUNT_ID,
  }}));
};
