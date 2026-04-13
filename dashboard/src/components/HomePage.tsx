import { useEffect, useState, useRef } from "react";
import { MessageSquare, BarChart2, Film } from "lucide-react";

const QUOTES = [
  "Every rupee here was argued over, optimized, and sweated for. You're welcome. 💸",
  "The marketing team once turned ₹1 of ad spend into actual pipeline. Then did it again. Then again.",
  "Behind every 'how did you hear about us?' is someone who spent 3am A/B testing headlines.",
  "Fun fact: this dashboard paid for itself before you finished your morning coffee. ☕",
  "Warning: prolonged exposure to these numbers may cause uncontrollable optimism. 📈",
  "We didn't reduce CP MQL by accident. It was spite. Productive spite.",
  "Your sales team gets the leads. Your marketing team gets the blame. Same team, different energy.",
  "Some people sleep. We retarget. Sleep is for people who've hit their MQL target.",
];

interface Props {
  token: string;
  onOpenChat: () => void;
  onOpenFunnel: () => void;
  onOpenInstantly: () => void;
  onOpenVideo?: () => void;
  onOpenMeta?: () => void;
  onOpenMetaTable?: () => void;
  onOpenGoogle?: () => void;
}

interface ScorecardData {
  spend: { facebook: number; google: number; total: number };
  mqls: number;
  cp_mql: number;
  demos: number;
  cp_demo: number;
  month: string;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

interface Insights {
  highlights: string[];
  concerns: string[];
  recommended_questions: string[];
  metrics: any;
}

export default function HomePage({ token, onOpenChat, onOpenFunnel, onOpenInstantly, onOpenVideo, onOpenMeta, onOpenMetaTable, onOpenGoogle }: Props) {
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(true);
  const [scorecardError, setScorecardError] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quoteFade, setQuoteFade] = useState(true);
  const quoteTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    quoteTimer.current = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length);
        setQuoteFade(true);
      }, 400);
    }, 9000);
    return () => { if (quoteTimer.current) clearInterval(quoteTimer.current); };
  }, []);

  useEffect(() => {
    setScorecardLoading(true);
    setScorecardError(false);

    fetch("/api/scorecard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load scorecard");
        return res.json();
      })
      .then((data: ScorecardData) => {
        setScorecard(data);
        setScorecardLoading(false);
      })
      .catch(() => {
        setScorecardError(true);
        setScorecardLoading(false);
      });
  }, [token]);

  useEffect(() => {
    setInsightsLoading(true);

    fetch("/api/insights", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load insights");
        return res.json();
      })
      .then((data: Insights) => {
        setInsights(data);
        setInsightsLoading(false);
      })
      .catch(() => {
        setInsightsLoading(false);
      });
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-16" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="text-6xl mb-4 animate-float">🐪</div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-center leading-tight mb-1" style={{ color: "#0f172a" }}>
          Single Source of Truth
        </h1>
        <p className="font-display text-xl sm:text-2xl font-semibold glow-text text-center">
          Marketing Dashboard
        </p>
      </div>

      {/* Rotating quote */}
      <div className="w-full max-w-3xl mb-2 min-h-[2.5rem] flex items-center justify-center px-2">
        <p
          className="text-sm text-center italic"
          style={{
            color: "#64748b",
            opacity: quoteFade ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          {QUOTES[quoteIdx]}
        </p>
      </div>

      {/* Cards grid */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Card 1 — Score Card (full width) */}
        <div className="glass-card rounded-2xl p-6 md:col-span-2">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-semibold mb-0.5" style={{ color: "#0f172a" }}>Score Card</h2>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Month to Date</p>
            </div>
            {scorecard && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(0,184,144,0.1)", color: "#00b890", border: "1px solid rgba(0,184,144,0.2)" }}>
                {new Date(scorecard.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
              </span>
            )}
          </div>

          {scorecardError ? (
            <p className="text-sm text-center py-4" style={{ color: "#94a3b8" }}>Could not load data</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "MQLs", value: scorecard?.mqls ?? 0, fmt: (v: number) => v.toLocaleString("en-IN"), loading: scorecardLoading },
                { label: "CP MQL", value: scorecard?.cp_mql ?? 0, fmt: formatINR, loading: scorecardLoading },
                { label: "Demos", value: scorecard?.demos ?? 0, fmt: (v: number) => v.toLocaleString("en-IN"), loading: scorecardLoading },
                { label: "CP Demo", value: scorecard?.cp_demo ?? 0, fmt: formatINR, loading: scorecardLoading },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <p className="text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>{item.label}</p>
                  {item.loading ? (
                    <SkeletonBlock className="h-6 w-20" />
                  ) : (
                    <p className="font-display text-lg font-semibold" style={{ color: "#0f172a" }}>{item.fmt(item.value)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 2 — Ask Anything */}
        <button
          onClick={onOpenChat}
          className="glass-card rounded-2xl p-6 text-left group transition-all duration-200 focus:outline-none"
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,184,144,0.4)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,184,144,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(0,184,144,0.08)", border: "1px solid rgba(0,184,144,0.15)" }}>
            <MessageSquare size={22} style={{ color: "#00b890" }} />
          </div>
          <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "#0f172a" }}>Ask Me Anything</h2>
          <p className="text-sm" style={{ color: "#64748b" }}>AI-powered answers from your ads & CRM data</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#00b890" }}>
            <span>Open chat</span>
            <span>→</span>
          </div>
        </button>

        {/* Card 3 — Full Funnel Metrics */}
        <button
          onClick={onOpenFunnel}
          className="glass-card rounded-2xl p-6 text-left group transition-all duration-200 focus:outline-none"
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <BarChart2 size={22} style={{ color: "#6366f1" }} />
          </div>
          <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "#0f172a" }}>Full Funnel Metrics</h2>
          <p className="text-sm" style={{ color: "#64748b" }}>Spends → MQL → SQL → Demo → Paid with date breakdown</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#6366f1" }}>
            <span>View metrics</span>
            <span>→</span>
          </div>
        </button>

        {/* Card 3b — Instantly Campaigns */}
        <button
          onClick={onOpenInstantly}
          className="glass-card rounded-2xl p-6 text-left group transition-all duration-200 focus:outline-none md:col-span-2"
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(251,191,36,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <span style={{ fontSize: "20px" }}>⚡</span>
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "#0f172a" }}>Instantly Campaigns</h2>
              <p className="text-sm" style={{ color: "#64748b" }}>Open rates, reply rates & opportunities across all email campaigns</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#d97706" }}>
              <span>View stats</span>
              <span>→</span>
            </div>
          </div>
        </button>

        {/* Card 4 — Video Generator */}
        {onOpenVideo && (
          <button
            onClick={onOpenVideo}
            className="glass-card rounded-2xl p-6 text-left group transition-all duration-200 focus:outline-none"
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <Film size={22} style={{ color: "#8b5cf6" }} />
            </div>
            <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "#0f172a" }}>Video Generator</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>Create and preview feature videos with Remotion</p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#8b5cf6" }}>
              <span>View generator</span>
              <span>→</span>
            </div>
          </button>
        )}

        {/* Card 6 — Meta Ads */}
        {onOpenMeta && (
          <button
            onClick={onOpenMeta}
            className="glass-card rounded-2xl p-6 text-left group transition-all duration-200 focus:outline-none"
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(24,119,242,0.4)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(24,119,242,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(24,119,242,0.08)", border: "1px solid rgba(24,119,242,0.15)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "#0f172a" }}>Meta Ads</h2>
                <p className="text-sm" style={{ color: "#64748b" }}>Deep dive into Facebook & Instagram campaigns</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#1877F2" }}>
                <span>Explore</span>
                <span>→</span>
              </div>
            </div>
          </button>
        )}

        {/* Card 7 — Meta Ads Attribution */}
        {onOpenMetaTable && (
          <button
            onClick={onOpenMetaTable}
            className="glass-card rounded-2xl p-6 text-left group transition-all duration-200 focus:outline-none"
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(24,119,242,0.4)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(24,119,242,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(24,119,242,0.08)", border: "1px solid rgba(24,119,242,0.15)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" fill="#1877F2"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "#0f172a" }}>Meta Ads Attribution</h2>
                <p className="text-sm" style={{ color: "#64748b" }}>Campaign → Ad Set → Ad with HubSpot metrics</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#1877F2" }}>
                <span>Explore</span>
                <span>→</span>
              </div>
            </div>
          </button>
        )}

        {/* Card 8 — Google Ads */}
        {onOpenGoogle && (
          <button
            onClick={onOpenGoogle}
            className="glass-card rounded-2xl p-6 text-left group transition-all duration-200 focus:outline-none"
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(234,67,53,0.4)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(234,67,53,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,67,53,0.08)", border: "1px solid rgba(234,67,53,0.12)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3.065 12.573a5.556 5.556 0 0 0 7.654 7.387l4.89-4.89a5.556 5.556 0 0 0-7.654-7.388l-4.89 4.89z" fill="#FBBC05"/>
                  <path d="M20.935 11.427a5.556 5.556 0 0 0-7.654-7.387l-4.89 4.89a5.556 5.556 0 0 0 7.654 7.388l4.89-4.89z" fill="#4285F4"/>
                  <circle cx="7.556" cy="15.556" r="3.111" fill="#34A853"/>
                  <circle cx="16.444" cy="8.444" r="3.111" fill="#EA4335"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "#0f172a" }}>Google Ads</h2>
                <p className="text-sm" style={{ color: "#64748b" }}>Search, display & performance max insights</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#EA4335" }}>
                <span>Explore</span>
                <span>→</span>
              </div>
            </div>
          </button>
        )}

      </div>

      {/* Insights Card */}
      {insights && (
        <div className="w-full max-w-3xl mt-6">
          <div className="glass-card rounded-2xl p-6" style={{ background: "rgba(0,184,144,0.03)", border: "1px solid rgba(0,184,144,0.2)" }}>
            <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "#0f172a" }}>✨ This Week's Insights</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>🎯 Highlights</h3>
                <ul className="space-y-1">
                  {insights.highlights?.map((h, i) => (
                    <li key={i} className="text-sm" style={{ color: "#00b890" }}>✓ {h}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>⚠️  Watch Out For</h3>
                <ul className="space-y-1">
                  {insights.concerns?.map((c, i) => (
                    <li key={i} className="text-sm" style={{ color: "#dc2626" }}>• {c}</li>
                  ))}
                </ul>
              </div>
            </div>

            {insights.recommended_questions && insights.recommended_questions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>💡 Questions to Ask</h3>
                <ul className="space-y-1">
                  {insights.recommended_questions.map((q, i) => (
                    <li key={i} className="text-sm" style={{ color: "#6366f1" }}>→ {q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trends / Creative Banner */}
      <div className="w-full max-w-3xl mt-4">
        <a
          href="https://fcbtech.slack.com/team/U09QF47RS84"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl p-6 transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(0,184,144,0.06) 100%)",
            border: "1.5px dashed rgba(99,102,241,0.3)",
            textDecoration: "none",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(99,102,241,0.6)"; (e.currentTarget as HTMLAnchorElement).style.background = "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(0,184,144,0.08) 100%)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(99,102,241,0.3)"; (e.currentTarget as HTMLAnchorElement).style.background = "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(0,184,144,0.06) 100%)"; }}
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl flex-shrink-0">🔥</div>
            <div className="flex-1">
              <p className="font-display text-base font-bold mb-1" style={{ color: "#0f172a" }}>
                Watching reels during office hours? At least make it useful.
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "#64748b" }}>
                Spotted a trend mid-scroll that screams campaign? Don't let it die in your head — drop it in Slack and we'll run with it.
              </p>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}
              >
                💡 Drop your idea →
              </span>
            </div>
          </div>
        </a>
      </div>

    </div>
  );
}
