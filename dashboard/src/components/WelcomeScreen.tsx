import { BarChart3, TrendingUp, Users, Target, Zap, AlertCircle } from "lucide-react";

interface Insights {
  highlights?: string[];
  concerns?: string[];
  recommended_questions?: string[];
}

interface Props {
  onPrompt: (prompt: string) => void;
  insights?: Insights;
}

const staticExamples = [
  { icon: BarChart3, label: "Facebook Ads", prompt: "Show me my Facebook Ads campaign performance for the last 30 days", color: "#3b82f6" },
  { icon: TrendingUp, label: "Google Ads", prompt: "What are my top performing Google Ads campaigns by clicks this month?", color: "#f59e0b" },
  { icon: Users, label: "HubSpot Funnel", prompt: "Show me the full funnel — leads, MQLs, SQLs, demos, paid for this month", color: "#f97316" },
  { icon: Target, label: "Cross-platform", prompt: "Compare my Facebook Ads and Google Ads spend for the last 7 days", color: "#00b890" },
];

export default function WelcomeScreen({ onPrompt, insights }: Props) {
  // Build dynamic examples from insights if available
  const dynamicExamples = insights?.recommended_questions?.slice(0, 4).map((q, i) => {
    const icons = [Zap, AlertCircle, TrendingUp, Target];
    const colors = ["#00b890", "#dc2626", "#f59e0b", "#3b82f6"];
    return {
      icon: icons[i % 4],
      label: i === 0 ? "🎯 This Week's Insight" : i === 1 ? "⚠️ Watch Out" : "💡 Recommendation",
      prompt: q,
      color: colors[i % 4],
      isInsight: true,
    };
  });

  const examples = dynamicExamples && dynamicExamples.length > 0 ? dynamicExamples : staticExamples;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "#0f172a" }}>Single Source of Truth — Marketing</h2>
      <p className="text-center mb-8 max-w-sm text-sm leading-relaxed" style={{ color: "#64748b" }}>
        {dynamicExamples ? "Based on this week's performance, explore these questions:" : "Ask anything about your ads and CRM data. No dashboards, no spreadsheets — just ask."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
        {examples.map((ex, idx) => (
          <button
            key={idx}
            onClick={() => onPrompt(ex.prompt)}
            className="flex items-start gap-3 p-4 rounded-xl text-left transition-all glass-card"
            onMouseEnter={e => (e.currentTarget.style.borderColor = `${ex.color}40`)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
          >
            <ex.icon size={17} style={{ color: ex.color, marginTop: "2px", flexShrink: 0 }} />
            <div>
              <p className="text-xs mb-1 font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>{ex.label}</p>
              <p className="text-sm leading-snug" style={{ color: "#64748b" }}>{ex.prompt}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
