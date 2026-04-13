import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace("Bearer ", "");

  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64").toString("utf-8");
  } catch (e) {
    decoded = "error decoding";
  }

  const password = process.env.DASHBOARD_PASSWORD ?? "";

  res.json({
    auth_header: auth,
    token: token,
    decoded: decoded,
    expected_password: password,
    match: decoded === password,
    all_headers: Object.keys(req.headers),
  });
};
