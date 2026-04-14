module.exports = async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  let decoded = "";
  try {
    decoded = atob(token);
  } catch (e) {
    decoded = "decode_error: " + e.message;
  }

  const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "NOT_SET";

  res.json({
    auth_header: auth,
    token: token,
    decoded: decoded,
    password: DASHBOARD_PASSWORD,
    match: decoded === DASHBOARD_PASSWORD
  });
};
