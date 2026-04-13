import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const GA_DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
const GA_ACCOUNT_ID = process.env.GOOGLE_ADS_ACCOUNT_ID ?? "";
const GA_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID ?? "";
const GA_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET ?? "";
const GA_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "";
const GA_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID ?? "";
const HS_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? "";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";

const tools: Anthropic.Tool[] = [
  {
    name: "get_facebook_campaigns",
    description: "Get Facebook Ads campaigns (from warehouse)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_facebook_insights",
    description: "Get Facebook Ads performance insights (spend, clicks, impressions, etc.) from warehouse",
    input_schema: {
      type: "object" as const,
      properties: {
        date_preset: {
          type: "string",
          enum: ["today", "yesterday", "last_7d", "last_14d", "last_30d", "this_month", "last_month"],
        },
      },
      required: ["date_preset"],
    },
  },
  {
    name: "get_google_campaigns",
    description: "Get Google Ads campaigns",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["ENABLED", "PAUSED", "ALL"] },
      },
      required: [],
    },
  },
  {
    name: "get_google_ads_insights",
    description: "Get Google Ads performance data (clicks, impressions, cost, conversions)",
    input_schema: {
      type: "object" as const,
      properties: {
        date_range: {
          type: "string",
          enum: ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH"],
        },
        level: { type: "string", enum: ["campaign", "ad_group"] },
      },
      required: ["date_range", "level"],
    },
  },
  {
    name: "get_hubspot_funnel",
    description: "Get HubSpot funnel metrics: Total Leads, MQLs, SQLs, Demo Done, Paid. Use this for any funnel/pipeline/conversion questions. Optionally filter by date range.",
    input_schema: {
      type: "object" as const,
      properties: {
        date_from: { type: "string", description: "Start date in YYYY-MM-DD format (filters by last_crm_lead_datetime). Leave empty for all time." },
        date_to: { type: "string", description: "End date in YYYY-MM-DD format. Leave empty for all time." },
      },
      required: [],
    },
  },
  {
    name: "get_hubspot_leads_by_source",
    description: "Get lead counts broken down by deal_source_25 (Facebook, Google, Others). Only use when the user explicitly asks for source breakdown.",
    input_schema: {
      type: "object" as const,
      properties: {
        stage: {
          type: "string",
          enum: ["leads", "mql", "sql", "demo_done", "paid"],
          description: "Which funnel stage to break down by source",
        },
        date_from: { type: "string", description: "Start date YYYY-MM-DD (filters by last_crm_lead_datetime)" },
        date_to: { type: "string", description: "End date YYYY-MM-DD" },
      },
      required: ["stage"],
    },
  },
  {
    name: "get_hubspot_contacts",
    description: "Get recent HubSpot contacts sorted by last_crm_lead_datetime",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of contacts (default 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_hubspot_deals",
    description: "Get HubSpot CRM deals with amounts and stages",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of deals (default 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_hubspot_companies",
    description: "Get HubSpot CRM companies",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of companies (default 10)" },
      },
      required: [],
    },
  },
];

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
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// HubSpot search helper — queries Deals (funnel data lives on deals)
async function hsSearch(filterGroups: object[], properties: string[] = ["hs_object_id"], limit = 1): Promise<{ total: number; results: object[] }> {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${HS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filterGroups, properties, limit, sorts: [{ propertyName: "last_crm_lead_datetime", direction: "DESCENDING" }] }),
  });
  return res.json() as Promise<{ total: number; results: object[] }>;
}

// Build date filters for last_crm_lead_datetime
function dateFilters(dateFrom?: string, dateTo?: string): object[] {
  const filters: object[] = [];
  if (dateFrom) filters.push({ propertyName: "last_crm_lead_datetime", operator: "GTE", value: String(new Date(dateFrom).getTime()) });
  if (dateTo) filters.push({ propertyName: "last_crm_lead_datetime", operator: "LTE", value: String(new Date(dateTo + "T23:59:59").getTime()) });
  return filters;
}

// Base filters for each funnel stage
function stageFilters(stage: string): object[] {
  switch (stage) {
    case "leads":
      return [{ propertyName: "last_crm_lead_datetime", operator: "HAS_PROPERTY" }];
    case "mql":
      return [
        { propertyName: "form_is_manufacturing", operator: "EQ", value: "Yes" },
        { propertyName: "form_designation", operator: "IN", values: ["Owner", "HOD"] },
      ];
    case "sql":
      return [{ propertyName: "first_demo_schedule_datetime", operator: "HAS_PROPERTY" }];
    case "demo_done":
      return [{ propertyName: "first_demo_complete_datetime", operator: "HAS_PROPERTY" }];
    case "paid":
      return [{ propertyName: "first_payment_date", operator: "HAS_PROPERTY" }];
    default:
      return [];
  }
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "get_facebook_campaigns": {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/meta_ads_daily?select=campaign_id,campaign_name&limit=1000`,
          { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
        );
        const rows = await res.json() as Array<{ campaign_id: string; campaign_name: string }>;
        const seen = new Set<string>();
        const campaigns = rows
          .filter(r => !seen.has(r.campaign_id) && seen.add(r.campaign_id))
          .map(r => ({ id: r.campaign_id, name: r.campaign_name }));
        return JSON.stringify(campaigns, null, 2);
      }

      case "get_facebook_insights": {
        const { date_preset } = input as Record<string, string>;
        const today = new Date();
        let since: Date, until: Date = new Date(today);
        switch (date_preset) {
          case "today": since = new Date(today); break;
          case "yesterday": since = new Date(today); since.setDate(since.getDate() - 1); until = new Date(since); break;
          case "last_7d": since = new Date(today); since.setDate(since.getDate() - 7); break;
          case "last_14d": since = new Date(today); since.setDate(since.getDate() - 14); break;
          case "this_month": since = new Date(today.getFullYear(), today.getMonth(), 1); break;
          case "last_month":
            since = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            until = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
          default: since = new Date(today); since.setDate(since.getDate() - 30); // last_30d
        }
        const sinceStr = since.toISOString().slice(0, 10);
        const untilStr = until.toISOString().slice(0, 10);
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/meta_ads_daily?select=date,campaign_id,campaign_name,spend,impressions,reach,clicks` +
          `&date=gte.${sinceStr}&date=lte.${untilStr}&limit=10000`,
          { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
        );
        const rows = await res.json() as Array<{ date: string; campaign_id: string; campaign_name: string; spend: number; impressions: number; reach: number; clicks: number }>;
        const totals = rows.reduce(
          (acc, r) => ({ spend: acc.spend + +r.spend, impressions: acc.impressions + +r.impressions, reach: acc.reach + +r.reach, clicks: acc.clicks + +r.clicks }),
          { spend: 0, impressions: 0, reach: 0, clicks: 0 }
        );
        const byCampaign: Record<string, { name: string; spend: number; impressions: number; clicks: number }> = {};
        for (const r of rows) {
          const c = byCampaign[r.campaign_id] ?? { name: r.campaign_name, spend: 0, impressions: 0, clicks: 0 };
          c.spend += +r.spend; c.impressions += +r.impressions; c.clicks += +r.clicks;
          byCampaign[r.campaign_id] = c;
        }
        return JSON.stringify({
          date_range: `${sinceStr} to ${untilStr}`,
          totals: {
            ...totals,
            ctr: totals.impressions > 0 ? `${(totals.clicks / totals.impressions * 100).toFixed(2)}%` : "0%",
            cpc: totals.clicks > 0 ? `$${(totals.spend / totals.clicks).toFixed(2)}` : "$0",
            cpm: totals.impressions > 0 ? `$${(totals.spend / totals.impressions * 1000).toFixed(2)}` : "$0",
          },
          by_campaign: Object.entries(byCampaign).map(([id, v]) => ({ id, ...v })),
        }, null, 2);
      }

      case "get_google_campaigns": {
        const status = (input.status as string) || "ALL";
        const accessToken = await getGoogleAccessToken();
        const whereClause = status !== "ALL" ? `WHERE campaign.status = '${status}'` : "";
        const query = `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros FROM campaign ${whereClause} ORDER BY campaign.name LIMIT 50`;
        const res = await fetch(
          `https://googleads.googleapis.com/v19/customers/${GA_ACCOUNT_ID}/googleAds:search`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": GA_DEV_TOKEN,
              "Content-Type": "application/json",
              ...(GA_PROJECT_ID ? { "x-goog-user-project": GA_PROJECT_ID } : {}),
            },
            body: JSON.stringify({ query }),
          }
        );
        return JSON.stringify(await res.json(), null, 2);
      }

      case "get_google_ads_insights": {
        const { date_range = "LAST_30_DAYS", level = "campaign" } = input as Record<string, string>;
        const accessToken = await getGoogleAccessToken();
        const resourceMap: Record<string, string> = { campaign: "campaign", ad_group: "ad_group" };
        const resource = resourceMap[level] ?? "campaign";
        const query = `SELECT ${resource}.name, ${resource}.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM ${resource} WHERE segments.date DURING ${date_range} ORDER BY metrics.cost_micros DESC LIMIT 25`;
        const res = await fetch(
          `https://googleads.googleapis.com/v19/customers/${GA_ACCOUNT_ID}/googleAds:search`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": GA_DEV_TOKEN,
              "Content-Type": "application/json",
              ...(GA_PROJECT_ID ? { "x-goog-user-project": GA_PROJECT_ID } : {}),
            },
            body: JSON.stringify({ query }),
          }
        );
        return JSON.stringify(await res.json(), null, 2);
      }

      case "get_hubspot_funnel": {
        const dateFrom = input.date_from as string | undefined;
        const dateTo = input.date_to as string | undefined;
        const df = dateFilters(dateFrom, dateTo);

        const stages = ["leads", "mql", "sql", "demo_done", "paid"] as const;
        const stageNames: Record<string, string> = {
          leads: "Total Leads",
          mql: "MQLs",
          sql: "SQLs",
          demo_done: "Demo Done",
          paid: "Paid",
        };

        const results: Record<string, number> = {};
        for (const stage of stages) {
          const sf = stageFilters(stage);
          // Combine stage filters with date filters in one filter group
          const allFilters = [...sf, ...df];
          const data = await hsSearch([{ filters: allFilters }]);
          results[stageNames[stage]] = data.total;
        }

        return JSON.stringify({ funnel: results, date_range: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "All time" }, null, 2);
      }

      case "get_hubspot_leads_by_source": {
        const stage = (input.stage as string) || "leads";
        const dateFrom = input.date_from as string | undefined;
        const dateTo = input.date_to as string | undefined;
        const df = dateFilters(dateFrom, dateTo);
        const sf = stageFilters(stage);

        const sources = ["Facebook", "Google", "Others"];
        const breakdown: Record<string, number> = {};

        for (const source of sources) {
          const sourceFilter = source === "Others"
            ? { propertyName: "deal_source_25", operator: "NOT_IN", values: ["Facebook", "Google"] }
            : { propertyName: "deal_source_25", operator: "EQ", value: source };

          const allFilters = [...sf, ...df, sourceFilter];
          const data = await hsSearch([{ filters: allFilters }]);
          breakdown[source] = data.total;
        }

        const stageLabel: Record<string, string> = {
          leads: "Total Leads", mql: "MQLs", sql: "SQLs", demo_done: "Demo Done", paid: "Paid",
        };

        return JSON.stringify({
          stage: stageLabel[stage] || stage,
          breakdown_by_source: breakdown,
          date_range: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "All time",
        }, null, 2);
      }

      case "get_hubspot_contacts": {
        const limit = (input.limit as number) || 10;
        const res = await fetch(
          `https://api.hubapi.com/crm/v3/objects/deals/search`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${HS_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              filterGroups: [{ filters: [{ propertyName: "last_crm_lead_datetime", operator: "HAS_PROPERTY" }] }],
              properties: ["dealname", "last_crm_lead_datetime", "form_is_manufacturing", "form_designation", "deal_source_25", "first_demo_schedule_datetime", "first_demo_complete_datetime", "first_payment_date"],
              sorts: [{ propertyName: "last_crm_lead_datetime", direction: "DESCENDING" }],
              limit,
            }),
          }
        );
        return JSON.stringify(await res.json(), null, 2);
      }

      case "get_hubspot_deals": {
        const limit = (input.limit as number) || 10;
        const res = await fetch(
          `https://api.hubapi.com/crm/v3/objects/deals/search`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${HS_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              filterGroups: [{ filters: [{ propertyName: "last_crm_lead_datetime", operator: "HAS_PROPERTY" }] }],
              properties: ["dealname", "amount", "dealstage", "last_crm_lead_datetime", "deal_source_25", "form_designation", "form_is_manufacturing", "first_demo_schedule_datetime", "first_demo_complete_datetime", "first_payment_date"],
              sorts: [{ propertyName: "last_crm_lead_datetime", direction: "DESCENDING" }],
              limit,
            }),
          }
        );
        return JSON.stringify(await res.json(), null, 2);
      }

      case "get_hubspot_companies": {
        const limit = (input.limit as number) || 10;
        const props = "name,domain,industry,annualrevenue,numberofemployees,city,country,lifecyclestage";
        const url = `https://api.hubapi.com/crm/v3/objects/companies?limit=${limit}&properties=${props}&sorts=-createdate`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${HS_TOKEN}` } });
        return JSON.stringify(await res.json(), null, 2);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

export default async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  let password = "";
  try {
    password = atob(token);
  } catch {
    /* ignore */
  }
  if (password !== DASHBOARD_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let messages: Anthropic.MessageParam[];
  try {
    const body = (await req.json()) as { messages: Anthropic.MessageParam[] };
    messages = body.messages;
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const conversationMessages: Anthropic.MessageParam[] = [...messages];

        while (true) {
          const apiStream = anthropic.messages.stream({
            model: "claude-opus-4-6",
            max_tokens: 4096,
            system: `You are a marketing analytics assistant with access to Facebook Ads, Google Ads, and HubSpot CRM data.
Help users understand their marketing performance, identify trends, and get actionable insights.
When presenting data, use markdown tables and formatted lists. Always interpret numbers in context.
Costs from Google Ads are in micros (divide by 1,000,000 for dollars).

## HubSpot Data Model:
- All funnel data lives on the **Deals** object, not Contacts. Always query deals for funnel metrics.

## HubSpot Funnel Definitions (strictly follow these):
- **Total Leads**: Contacts where last_crm_lead_datetime HAS_PROPERTY. Always use last_crm_lead_datetime — never use creation date.
- **MQLs**: Contacts where form_is_manufacturing = Yes AND form_designation is one of [Owner, HOD].
- **SQLs**: Contacts where first_demo_schedule_datetime HAS_PROPERTY (demo was scheduled).
- **Demo Done**: Contacts where first_demo_complete_datetime HAS_PROPERTY (demo was completed).
- **Paid**: Contacts where first_payment_date HAS_PROPERTY (converted to customer).

## Lead Source Breakdown:
- Only break down by source (deal_source_25) when the user explicitly asks for it.
- Sources are: Facebook, Google, Others.

## Funnel Presentation:
- When showing funnel data, always show the full funnel: Leads → MQLs → SQLs → Demo Done → Paid.
- Calculate and show conversion rates between stages (e.g., MQL rate = MQLs/Leads).`,
            messages: conversationMessages,
            tools,
          });

          for await (const event of apiStream) {
            if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
              send({ type: "tool_start", name: event.content_block.name, id: event.content_block.id });
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              send({ type: "text_delta", text: event.delta.text });
            }
          }

          const finalMessage = await apiStream.finalMessage();

          if (finalMessage.stop_reason === "end_turn") {
            send({ type: "done" });
            break;
          }

          if (finalMessage.stop_reason === "tool_use") {
            conversationMessages.push({ role: "assistant", content: finalMessage.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of finalMessage.content) {
              if (block.type === "tool_use") {
                const result = await executeTool(block.name, block.input as Record<string, unknown>);
                send({ type: "tool_done", name: block.name });
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
              }
            }

            conversationMessages.push({ role: "user", content: toolResults });
          } else {
            send({ type: "done" });
            break;
          }
        }
      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const config = { path: "/api/chat" };
