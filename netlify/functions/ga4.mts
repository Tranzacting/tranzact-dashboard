import {
  corsHeaders,
  checkAuth,
  DASHBOARD_PASSWORD,
  GA4_PROPERTY_ID,
  getGoogleAccessToken,
} from "./_shared.mts";

interface GA4Metrics {
  sessions: number;
  users: number;
  bounce_rate: number;
}

async function fetchGA4Data(
  propertyId: string,
  since: string,
  until: string
): Promise<Array<{ date: string; sessions: number; users: number; bounce_rate: number }>> {
  try {
    const accessToken = await getGoogleAccessToken();

    const body = {
      dateRanges: [
        {
          startDate: since,
          endDate: until,
        },
      ],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "bounceRate" },
      ],
    };

    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`GA4 API error (${res.status}):`, text.slice(0, 300));
      return [];
    }

    const data = (await res.json()) as {
      rows?: Array<{
        dimensions: string[];
        metricValues: Array<{ value: string }>;
      }>;
    };

    const rows = data.rows || [];
    return rows.map((r) => ({
      date: r.dimensions[0],
      sessions: parseInt(r.metricValues[0]?.value || "0"),
      users: parseInt(r.metricValues[1]?.value || "0"),
      bounce_rate: parseFloat(r.metricValues[2]?.value || "0"),
    }));
  } catch (e) {
    console.error("GA4 fetch error:", e);
    return [];
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!checkAuth(req, DASHBOARD_PASSWORD)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!GA4_PROPERTY_ID) {
    return new Response(
      JSON.stringify({ error: "GA4_PROPERTY_ID not configured" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const url = new URL(req.url);
  const now = new Date();
  const defaultSince = `${now.getUTCFullYear()}-01-01`;
  const defaultUntil = now.toISOString().slice(0, 10);
  const since = url.searchParams.get("since") || defaultSince;
  const until = url.searchParams.get("until") || defaultUntil;

  const rows = await fetchGA4Data(GA4_PROPERTY_ID, since, until);

  // Calculate totals
  const totals: GA4Metrics = {
    sessions: 0,
    users: 0,
    bounce_rate: 0,
  };

  for (const r of rows) {
    totals.sessions += r.sessions;
    totals.users += r.users;
    totals.bounce_rate += r.bounce_rate;
  }

  // Average bounce rate across days
  if (rows.length > 0) {
    totals.bounce_rate = totals.bounce_rate / rows.length;
  }

  return new Response(
    JSON.stringify({
      since,
      until,
      rows,
      totals,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
};

export const config = { path: "/api/ga4" };
