import { corsHeaders, checkAuth, getWeekRange, DASHBOARD_PASSWORD, SLACK_WEBHOOK_URL } from "./_shared.mts";

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow trigger from Netlify scheduled functions or manual API call
  const isScheduled = req.headers.get("x-scheduled-trigger") === "true";
  const isAuthed = checkAuth(req, DASHBOARD_PASSWORD);

  if (!isScheduled && !isAuthed) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch insights
    const insightsRes = await fetch((process.env.URL ?? "") + "/.netlify/functions/insights", {
      headers: { Authorization: `Bearer ${btoa(DASHBOARD_PASSWORD)}` },
    });

    if (!insightsRes.ok) {
      throw new Error("Failed to fetch insights");
    }

    const insights = await insightsRes.json();

    // Build Slack Block Kit message
    const blocks = buildSlackMessage(insights);

    // Post to Slack
    if (SLACK_WEBHOOK_URL) {
      const slackRes = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });

      if (!slackRes.ok) {
        throw new Error(`Slack post failed: ${slackRes.statusText}`);
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Digest sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

function buildSlackMessage(insights: any) {
  const week = insights.week;
  const metrics = insights.metrics;

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📊 Weekly Marketing Digest • ${week.since} to ${week.until}`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Spend*\n₹${(metrics.spend_total.current / 1000).toFixed(0)}K\n${metrics.spend_total.delta_pct > 0 ? "📈" : "📉"} ${metrics.spend_total.delta_pct > 0 ? "+" : ""}${metrics.spend_total.delta_pct.toFixed(1)}%`,
        },
        {
          type: "mrkdwn",
          text: `*MQLs*\n${metrics.mqls.current}\n${metrics.mqls.delta_pct > 0 ? "📈" : "📉"} ${metrics.mqls.delta_pct > 0 ? "+" : ""}${metrics.mqls.delta_pct.toFixed(1)}%`,
        },
        {
          type: "mrkdwn",
          text: `*Demos*\n${metrics.demos.current}\n${metrics.demos.delta_pct > 0 ? "📈" : "📉"} ${metrics.demos.delta_pct > 0 ? "+" : ""}${metrics.demos.delta_pct.toFixed(1)}%`,
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*✨ Highlights*\n${insights.highlights?.map((h: string) => `• ${h}`).join("\n") || "No highlights this week"}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚠️  Watch Out For*\n${insights.concerns?.map((c: string) => `• ${c}`).join("\n") || "All systems healthy"}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💡 Questions to Ask*\n${insights.recommended_questions?.map((q: string) => `• ${q}`).join("\n") || "No questions yet"}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Full Dashboard",
          },
          url: (process.env.URL ?? "") + "/",
        },
      ],
    },
  ];
}

export const config = { path: "/api/weekly-digest" };
