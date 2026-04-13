import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, RefreshCw, ChevronDown, AlertTriangle } from "lucide-react";

interface Props { token: string; onBack: () => void; }

interface PeriodMetrics {
  spend: number; impressions: number; reach: number; clicks: number;
  ctr: number; cpc: number; cpm: number;
  mqls: number; cp_mql: number; conv_rate: number;
  sqls: number; cp_sql: number; sql_pct: number;
  demos: number; cp_demo: number; demo_pct: number;
  paid: number; cp_paid: number; paid_pct: number;
}

interface FunnelResponse {
  periods: string[];
  data: Record<string, PeriodMetrics>;
  totals: PeriodMetrics;
  meta: {
    campaigns_fb: Array<{ id: string; name: string }>;
    campaigns_ga: Array<{ id: string; name: string }>;
    errors: { google_ads: string | null };
  };
}

type MetricKey = keyof PeriodMetrics;
type Format = "inr" | "number" | "percent";

interface MetricDef { key: MetricKey; label: string; format: Format; section: "ads" | "funnel"; }

const METRICS: MetricDef[] = [
  { key: "spend",       label: "Spends",        format: "inr",     section: "ads" },
  { key: "impressions", label: "Impressions",   format: "number",  section: "ads" },
  { key: "reach",       label: "Reach",         format: "number",  section: "ads" },
  { key: "clicks",      label: "Link Clicks",   format: "number",  section: "ads" },
  { key: "ctr",         label: "CTR",           format: "percent", section: "ads" },
  { key: "cpc",         label: "CPC",           format: "inr",     section: "ads" },
  { key: "cpm",         label: "CPM",           format: "inr",     section: "ads" },
  { key: "mqls",        label: "MQL",           format: "number",  section: "funnel" },
  { key: "cp_mql",      label: "CP MQL",        format: "inr",     section: "funnel" },
  { key: "conv_rate",   label: "Conv. Rate",    format: "percent", section: "funnel" },
  { key: "sqls",        label: "SQL",           format: "number",  section: "funnel" },
  { key: "cp_sql",      label: "CP SQL",        format: "inr",     section: "funnel" },
  { key: "sql_pct",     label: "SQL %",         format: "percent", section: "funnel" },
  { key: "demos",       label: "Demo",          format: "number",  section: "funnel" },
  { key: "cp_demo",     label: "CP Demo",       format: "inr",     section: "funnel" },
  { key: "demo_pct",    label: "Demo %",        format: "percent", section: "funnel" },
  { key: "paid",        label: "Paid",          format: "number",  section: "funnel" },
  { key: "cp_paid",     label: "CP Paid",       format: "inr",     section: "funnel" },
  { key: "paid_pct",    label: "Paid %",        format: "percent", section: "funnel" },
];

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("en-IN");

function fmt(value: number, format: Format): string {
  if (value === 0 || value === undefined) return "—";
  if (format === "inr") return INR.format(Math.round(value));
  if (format === "number") return NUM.format(Math.round(value));
  return value.toFixed(1) + "%";
}

function periodLabel(p: string, cadence: string): string {
  if (cadence === "monthly") {
    const [y, m] = p.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, 1)
      .toLocaleString("en-IN", { month: "short", year: "2-digit" });
  }
  if (cadence === "weekly") {
    const d = new Date(p + "T00:00:00Z");
    const end = new Date(d); end.setUTCDate(end.getUTCDate() + 6);
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })
      + " – " + end.toLocaleString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  }
  return new Date(p + "T00:00:00Z")
    .toLocaleString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

function defaultSince() {
  return new Date().getFullYear() + "-01-01";
}
function defaultUntil() {
  return new Date().toISOString().slice(0, 10);
}

const SelectField = ({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; label: string;
}) => (
  <div>
    <label className="block text-xs font-medium mb-1" style={{ color: "#64748b" }}>{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-sm focus:outline-none"
        style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
        onFocus={e => (e.currentTarget.style.borderColor = "#00b890")}
        onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
    </div>
  </div>
);

interface TooltipState {
  x: number; y: number;
  change: number | null;
  prevLabel: string;
}

export default function FunnelPage({ token, onBack }: Props) {
  const [cadence, setCadence] = useState("monthly");
  const [source, setSource] = useState("all");
  const [leadType, setLeadType] = useState("all");
  const [campaignFb, setCampaignFb] = useState("");
  const [campaignGa, setCampaignGa] = useState("");
  const [since, setSince] = useState(defaultSince);
  const [until, setUntil] = useState(defaultUntil);
  const [data, setData] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ cadence, source, lead_type: leadType, since, until });
    if (campaignFb) params.set("campaign_fb", campaignFb);
    if (campaignGa) params.set("campaign_ga", campaignGa);
    try {
      const res = await fetch(`/api/funnel?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [token, cadence, source, leadType, campaignFb, campaignGa, since, until]);

  useEffect(() => { load(); }, [load]);

  const showTooltip = (
    e: React.MouseEvent,
    metricKey: MetricKey,
    periodIdx: number
  ) => {
    if (!data) return;
    if (periodIdx <= 0) { setTooltip(null); return; }
    const prevPeriod = data.periods[periodIdx - 1];
    const currPeriod = data.periods[periodIdx];
    const curr = data.data[currPeriod]?.[metricKey] ?? 0;
    const prev = data.data[prevPeriod]?.[metricKey] ?? 0;
    const change = prev > 0 ? ((curr - prev) / prev) * 100 : null;
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      change,
      prevLabel: periodLabel(prevPeriod, cadence),
    });
  };

  const hideTooltip = () => {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 80);
  };

  const periods = data?.periods ?? [];
  const fbCampaignOptions = [
    { value: "", label: "All FB Campaigns" },
    ...(data?.meta.campaigns_fb ?? []).map(c => ({ value: c.id, label: c.name })),
  ];
  const gaCampaignOptions = [
    { value: "", label: "All GA Campaigns" },
    ...(data?.meta.campaigns_ga ?? []).map(c => ({ value: c.id, label: c.name })),
  ];

  const showFbCampaigns = source === "all" || source === "facebook";
  const showGaCampaigns = source === "all" || source === "google";

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 36,
            zIndex: 9999,
            pointerEvents: "none",
            background: "#1e293b",
            color: "#f8fafc",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {tooltip.change !== null ? (
            <span style={{ color: tooltip.change >= 0 ? "#4ade80" : "#f87171" }}>
              {tooltip.change >= 0 ? "▲ +" : "▼ "}
              {Math.abs(tooltip.change).toFixed(1)}%
            </span>
          ) : (
            <span style={{ color: "#94a3b8" }}>no prev data</span>
          )}
          <span style={{ color: "#94a3b8", marginLeft: 4 }}>vs {tooltip.prevLabel}</span>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20" style={{ background: "rgba(255,255,255,0.97)", borderBottom: "1px solid #e2e8f0", backdropFilter: "blur(12px)" }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: "#64748b" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#00b890")}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
          >
            <ArrowLeft size={16} /> Home
          </button>
          <h1 className="font-display text-base font-semibold flex-1" style={{ color: "#0f172a" }}>
            Full Funnel Metrics
          </h1>
          {data?.meta.errors.google_ads && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg" style={{ color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a" }}>
              <AlertTriangle size={12} />
              Google Ads error
            </div>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ color: "#64748b" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#00b890")}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#64748b" }}>From</label>
            <input type="date" value={since} onChange={e => setSince(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#00b890")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#64748b" }}>To</label>
            <input type="date" value={until} onChange={e => setUntil(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#00b890")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")} />
          </div>
          <div className="w-28">
            <SelectField value={cadence} onChange={setCadence} label="Cadence" options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]} />
          </div>
          <div className="w-36">
            <SelectField value={source} onChange={v => { setSource(v); setCampaignFb(""); setCampaignGa(""); }} label="Source" options={[
              { value: "all", label: "All Channels" },
              { value: "facebook", label: "Facebook" },
              { value: "google", label: "Google" },
              { value: "others", label: "Others" },
            ]} />
          </div>
          <div className="w-32">
            <SelectField value={leadType} onChange={setLeadType} label="Lead Type" options={[
              { value: "all", label: "All" },
              { value: "signup", label: "Sign Up" },
              { value: "demo", label: "Demo" },
            ]} />
          </div>
          {showFbCampaigns && (
            <div className="w-48">
              <SelectField value={campaignFb} onChange={setCampaignFb} label="FB Campaign" options={fbCampaignOptions} />
            </div>
          )}
          {showGaCampaigns && (
            <div className="w-48">
              <SelectField value={campaignGa} onChange={setCampaignGa} label="GA Campaign" options={gaCampaignOptions} />
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20 gap-2" style={{ color: "#94a3b8" }}>
            <RefreshCw size={18} className="spin" style={{ color: "#00b890" }} />
            <span className="text-sm">Loading funnel data…</span>
          </div>
        )}

        {data && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm border-collapse" style={{ minWidth: "500px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th className="sticky left-0 z-10 text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ background: "#f8fafc", color: "#64748b", minWidth: "120px", borderRight: "1px solid #e2e8f0" }}>
                      Metric
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider"
                      style={{ color: "#0f172a", minWidth: "110px", background: "rgba(0,184,144,0.06)", borderRight: "2px solid #e2e8f0" }}>
                      Total
                    </th>
                    {periods.map(p => (
                      <th key={p} className="px-4 py-2.5 text-right text-xs font-medium"
                        style={{ color: "#64748b", minWidth: "110px", whiteSpace: "nowrap", borderRight: "1px solid #f1f5f9" }}>
                        {periodLabel(p, cadence)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((m, idx) => {
                    const isSectionStart = idx === 0 || METRICS[idx - 1].section !== m.section;
                    return (
                      <>
                        {isSectionStart && (
                          <tr key={`sep-${m.section}`}>
                            <td colSpan={periods.length + 2} className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
                              style={{ background: "#f1f5f9", color: "#94a3b8", borderTop: idx > 0 ? "2px solid #e2e8f0" : undefined, borderBottom: "1px solid #e2e8f0" }}>
                              {m.section === "ads" ? "Ad Metrics" : "Funnel Metrics"}
                            </td>
                          </tr>
                        )}
                        <tr key={m.key}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                          onMouseLeave={e => (e.currentTarget.style.background = "")}
                        >
                          <td className="sticky left-0 px-4 py-2.5 text-xs font-medium"
                            style={{ background: "#ffffff", color: "#374151", borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                            {m.label}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums"
                            style={{ color: "#0f172a", background: "rgba(0,184,144,0.04)", borderRight: "2px solid #e2e8f0" }}>
                            {fmt(data.totals[m.key], m.format)}
                          </td>
                          {periods.map((p, pIdx) => (
                            <td
                              key={p}
                              className="px-4 py-2.5 text-right text-xs tabular-nums cursor-default"
                              style={{ color: "#374151", borderRight: "1px solid #f1f5f9" }}
                              onMouseEnter={e => showTooltip(e, m.key, pIdx)}
                              onMouseLeave={hideTooltip}
                            >
                              {fmt(data.data[p]?.[m.key] ?? 0, m.format)}
                            </td>
                          ))}
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading && data && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm" style={{ color: "#94a3b8" }}>
            <RefreshCw size={13} className="spin" /> Refreshing…
          </div>
        )}

        {data?.meta.errors.google_ads && (
          <p className="mt-3 text-xs text-center" style={{ color: "#b45309" }}>
            ⚠ Google Ads data unavailable: {data.meta.errors.google_ads}
          </p>
        )}
      </div>
    </div>
  );
}
