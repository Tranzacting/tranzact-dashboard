import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Loader2, CheckCircle2 } from "lucide-react";
import { Message as MsgType } from "../types";

interface Props { message: MsgType; }

const toolLabels: Record<string, string> = {
  get_facebook_campaigns: "Fetching Facebook campaigns",
  get_facebook_insights: "Loading Facebook insights",
  get_google_campaigns: "Fetching Google campaigns",
  get_google_ads_insights: "Loading Google Ads data",
  get_hubspot_funnel: "Calculating funnel metrics",
  get_hubspot_leads_by_source: "Breaking down leads by source",
  get_hubspot_contacts: "Fetching latest leads",
  get_hubspot_deals: "Loading deals",
  get_hubspot_companies: "Fetching companies",
};

export default function Message({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 py-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
        style={isUser
          ? { background: "#00b890" }
          : { background: "#f8fafc", border: "1px solid #e2e8f0" }
        }
      >
        {isUser
          ? <User size={15} color="#ffffff" />
          : <span style={{ fontSize: "16px", lineHeight: 1 }}>🐪</span>
        }
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? "flex justify-end" : ""}`}>
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 w-fit"
                style={{ color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0" }}
              >
                {tc.status === "running" ? (
                  <Loader2 size={11} className="spin" style={{ color: "#00b890" }} />
                ) : (
                  <CheckCircle2 size={11} style={{ color: "#00b890" }} />
                )}
                <span>{toolLabels[tc.name] || tc.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] sm:max-w-lg text-sm leading-relaxed"
            style={{ background: "rgba(0,184,144,0.1)", color: "#0f172a", border: "1px solid rgba(0,184,144,0.2)" }}
          >
            {message.content}
          </div>
        ) : (
          <div className="text-sm prose max-w-full" style={{ color: "#374151" }}>
            {message.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            ) : null}
            {message.isStreaming && !message.content && (
              <span className="inline-block w-2 h-4 rounded-sm cursor-blink" style={{ background: "#00b890" }} />
            )}
            {message.isStreaming && message.content && (
              <span className="inline-block w-2 h-4 rounded-sm cursor-blink ml-0.5 align-text-bottom" style={{ background: "#00b890" }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
