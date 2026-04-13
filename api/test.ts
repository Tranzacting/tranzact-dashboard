import { IncomingMessage, ServerResponse } from "http";

export default async (req: IncomingMessage, res: ServerResponse) => {
  const auth = (req.headers.authorization as string) ?? "";
  const token = auth.replace("Bearer ", "");

  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64").toString("utf-8");
  } catch (e) {
    decoded = "error decoding";
  }

  const password = process.env.DASHBOARD_PASSWORD ?? "";

  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({
    auth_header: auth,
    token: token,
    decoded: decoded,
    expected_password: password,
    match: decoded === password,
    all_headers: Object.keys(req.headers),
  }));
};
