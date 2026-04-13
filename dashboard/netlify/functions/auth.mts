export default async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";

  try {
    const { token } = (await req.json()) as { token: string };
    const password = atob(token);
    if (password === DASHBOARD_PASSWORD) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: corsHeaders,
    });
  }
};

export const config = { path: "/api/auth" };
