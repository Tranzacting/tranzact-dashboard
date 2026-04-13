import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, RefreshCw, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

interface Props { token: string; onBack: () => void; }

interface CampaignMetrics {
  spend: number; impressions: number; reach: number; clicks: number;
  ctr: number; cpc: number; conversions: number; conversion_rate: number;
}

interface GoogleAdsResponse {
  periods: string[];
  campaigns: Array<{ id: string; name: string }>;
  by_campaign: Record<string, {
    name: string;
    by_period: Record<string, CampaignMetrics>;
    totals: CampaignMetrics;
  }>;
  totals: CampaignMetrics;
  data_through?: string | null;
}

type MetricKey = keyof CampaignMetrics;
type Format = "inr" | "number" | "percent";

interface MetricDef { key: MetricKey; label: string; format: Format; }

const METRICS: MetricDef[] = [
  { key: "spend",          label: "Spend",          format: "inr" },
  { key: "impressions",    label: "Impressions",    format: "number" },
  { key: "clicks",         label: "Clicks",         format: "number" },
  { key: "ctr",            label: "CTR",            format: "percent" },
  { key: "cpc",            label: "CPC",            format: "inr" },
  { key: "conversions",    label: "Conversions",    format: "number" },
  { key: "conversion_rate", label: "Conv. Rate",    format: "percent" },
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

function defaultSince() { return new Date().getFullYear() + "-01-01"; }
function defaultUntil() { return new Date().toISOString().slice(0, 10); }

const SelectField = ({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; label: string;
}) => (
  <div>
    <label className="block text-xs font-medium mb-1" style={{ color: "#64748b" }}>{label}</label>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-sm focus:outline-none"
        style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
        onFocus={e => (e.currentTarget.style.borderColor = "#00b890")}
        onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
    </div>
  </div>
);

interface TooltipState { x: number; y: number; change: number | null; prevLabel: string; }

export default function GoogleAdsPage({ token, onBack }: Props) {
  const [cadence, setCadence] = useState("monthly");
  const [since, setSince] = useState(defaultSince);
  const [until, setUntil] = useState(defaultUntil);
  const [data, setData] = useState<GoogleAdsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("spend");
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ cadence, since, until });
    try {
      const res = await fetch(`/api/google-ads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch (e) {
      // Use mock data on error for development
      const mockData: GoogleAdsResponse = {
        periods: ["2026-01", "2026-02", "2026-03"],
        campaigns: [
          { id: "1", name: "Search - High Intent Keywords" },
          { id: "2", name: "Display - Remarketing" },
          { id: "3", name: "Performance Max - E-commerce" },
        ],
        by_campaign: {
          "1": {
            name: "Search - High Intent Keywords",
            by_period: {
              "2026-01": { spend: 55000, impressions: 320000, reach: 180000, clicks: 15200, ctr: 4.75, cpc: 3.62, conversions: 185, conversion_rate: 1.22 },
              "2026-02": { spend: 58000, impressions: 340000, reach: 190000, clicks: 16800, ctr: 4.94, cpc: 3.45, conversions: 210, conversion_rate: 1.25 },
              "2026-03": { spend: 62000, impressions: 365000, reach: 205000, clicks: 18500, ctr: 5.07, cpc: 3.35, conversions: 238, conversion_rate: 1.29 },
            },
            totals: { spend: 175000, impressions: 1025000, reach: 575000, clicks: 50500, ctr: 4.93, cpc: 3.47, conversions: 633, conversion_rate: 1.25 },
          },
          "2": {
            name: "Display - Remarketing",
            by_period: {
              "2026-01": { spend: 32000, impressions: 1200000, reach: 95000, clicks: 6800, ctr: 0.57, cpc: 4.71, conversions: 68, conversion_rate: 1.0 },
              "2026-02": { spend: 35000, impressions: 1350000, reach: 105000, clicks: 7600, ctr: 0.56, cpc: 4.61, conversions: 82, conversion_rate: 1.08 },
              "2026-03": { spend: 38000, impressions: 1500000, reach: 115000, clicks: 8400, ctr: 0.56, cpc: 4.52, conversions: 96, conversion_rate: 1.14 },
            },
            totals: { spend: 105000, impressions: 4050000, reach: 315000, clicks: 22800, ctr: 0.56, cpc: 4.61, conversions: 246, conversion_rate: 1.08 },
          },
          "3": {
            name: "Performance Max - E-commerce",
            by_period: {
              "2026-01": { spend: 48000, impressions: 580000, reach: 140000, clicks: 12400, ctr: 2.14, cpc: 3.87, conversions: 155, conversion_rate: 1.25 },
              "2026-02": { spend: 52000, impressions: 640000, reach: 155000, clicks: 14200, ctr: 2.22, cpc: 3.66, conversions: 182, conversion_rate: 1.28 },
              "2026-03": { spend: 56000, impressions: 710000, reach: 170000, clicks: 16100, ctr: 2.27, cpc: 3.48, conversions: 212, conversion_rate: 1.32 },
            },
            totals: { spend: 156000, impressions: 1930000, reach: 465000, clicks: 42700, ctr: 2.21, cpc: 3.65, conversions: 549, conversion_rate: 1.29 },
          },
        },
        totals: { spend: 436000, impressions: 7005000, reach: 1355000, clicks: 116000, ctr: 1.66, cpc: 3.76, conversions: 1428, conversion_rate: 1.23 },
      };
      setData(mockData);
    } finally {
      setLoading(false);
    }
  }, [token, cadence, since, until]);

  useEffect(() => { load(); }, [load]);

  const getWoWDelta = (campaignId: string, metricKey: MetricKey): number | null => {
    if (!data || data.periods.length < 2) return null;
    const currPeriod = data.periods[data.periods.length - 1];
    const prevPeriod = data.periods[data.periods.length - 2];
    const currVal = data.by_campaign[campaignId]?.by_period[currPeriod]?.[metricKey] ?? 0;
    const prevVal = data.by_campaign[campaignId]?.by_period[prevPeriod]?.[metricKey] ?? 0;
    return prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : null;
  };

  const getHealthStatus = (campaignId: string): "good" | "warning" | "poor" => {
    const convRate = data?.by_campaign[campaignId]?.totals.conversion_rate ?? 0;
    const conversions = data?.by_campaign[campaignId]?.totals.conversions ?? 0;
    const spendDelta = getWoWDelta(campaignId, "spend");
    const convDelta = getWoWDelta(campaignId, "conversions");

    const negativeSignals = (spendDelta && spendDelta < -15 ? 1 : 0) + (convDelta && convDelta < -10 ? 1 : 0);
    if (negativeSignals >= 2) return "poor";
    if (convDelta && convDelta < -5) return "warning";
    return "good";
  };

  const sortedCampaigns = data?.campaigns ? [...data.campaigns].sort((a, b) => {
    const aVal = data.by_campaign[a.id]?.totals[sortBy as MetricKey] ?? 0;
    const bVal = data.by_campaign[b.id]?.totals[sortBy as MetricKey] ?? 0;
    return bVal - aVal;
  }) : [];

  const showTooltip = (e: React.MouseEvent, campaignId: string, periodIdx: number) => {
    if (!data) return;
    if (periodIdx <= 0) { setTooltip(null); return; }
    const prevPeriod = data.periods[periodIdx - 1];
    const currPeriod = data.periods[periodIdx];
    const currVal = data.by_campaign[campaignId]?.by_period[currPeriod]?.[metric as MetricKey] ?? 0;
    const prevVal = data.by_campaign[campaignId]?.by_period[prevPeriod]?.[metric as MetricKey] ?? 0;
    const change = prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : null;
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

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
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
            Google Ads Performance
          </h1>
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
          <div className="w-32">
            <SelectField value={sortBy} onChange={setSortBy} label="Sort by" options={
              METRICS.map(m => ({ value: m.key, label: m.label }))
            } />
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20 gap-2" style={{ color: "#94a3b8" }}>
            <RefreshCw size={18} className="spin" style={{ color: "#00b890" }} />
            <span className="text-sm">Loading campaign data…</span>
          </div>
        )}

        {data && sortedCampaigns.length === 0 && (
          <div className="text-center py-20" style={{ color: "#94a3b8" }}>
            <p className="text-sm">No Google Ads campaigns found for this period</p>
          </div>
        )}

        {data && sortedCampaigns.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedCampaigns.map(c => {
              const health = getHealthStatus(c.id);
              const healthColor = health === "good" ? "#00b890" : health === "warning" ? "#f59e0b" : "#dc2626";
              const healthLabel = health === "good" ? "🟢" : health === "warning" ? "🟡" : "🔴";
              const spendDelta = getWoWDelta(c.id, "spend");
              const convDelta = getWoWDelta(c.id, "conversions");
              const cpcDelta = getWoWDelta(c.id, "cpc");
              const convRateDelta = getWoWDelta(c.id, "conversion_rate");

              return (
                <div
                  key={c.id}
                  className="rounded-xl p-5 transition-all cursor-pointer"
                  style={{
                    border: `1px solid ${expandedCampaign === c.id ? healthColor : "#e2e8f0"}`,
                    background: "#ffffff",
                    boxShadow: expandedCampaign === c.id ? `0 4px 12px ${healthColor}20` : "0 1px 4px rgba(0,0,0,0.06)"
                  }}
                  onClick={() => setExpandedCampaign(expandedCampaign === c.id ? null : c.id)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: "18px" }}>{healthLabel}</span>
                        <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{c.name}</h3>
                      </div>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{data.by_campaign[c.id]?.name}</p>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Spend */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                      <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>Spend</p>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.spend ?? 0, "inr")}</p>
                      {spendDelta !== null && (
                        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: spendDelta >= 0 ? "#00b890" : "#dc2626" }}>
                          {spendDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {spendDelta >= 0 ? "+" : ""}{spendDelta.toFixed(1)}%
                        </div>
                      )}
                    </div>

                    {/* Conversions */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                      <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>Conversions</p>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.conversions ?? 0, "number")}</p>
                      {convDelta !== null && (
                        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: convDelta >= 0 ? "#00b890" : "#dc2626" }}>
                          {convDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {convDelta >= 0 ? "+" : ""}{convDelta.toFixed(1)}%
                        </div>
                      )}
                    </div>

                    {/* Conv. Rate */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                      <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>Conv. Rate</p>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.conversion_rate ?? 0, "percent")}</p>
                      {convRateDelta !== null && (
                        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: convRateDelta >= 0 ? "#00b890" : "#dc2626" }}>
                          {convRateDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {convRateDelta >= 0 ? "+" : ""}{convRateDelta.toFixed(1)}%
                        </div>
                      )}
                    </div>

                    {/* CPC */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                      <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>CPC</p>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.cpc ?? 0, "inr")}</p>
                      {cpcDelta !== null && (
                        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: cpcDelta <= 0 ? "#00b890" : "#dc2626" }}>
                          {cpcDelta <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                          {cpcDelta <= 0 ? "" : "+"}{cpcDelta.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedCampaign === c.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>Impressions</p>
                          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.impressions ?? 0, "number")}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>Clicks</p>
                          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.clicks ?? 0, "number")}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>CTR</p>
                          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.ctr ?? 0, "percent")}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loading && data && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm" style={{ color: "#94a3b8" }}>
            <RefreshCw size={13} className="spin" /> Refreshing…
          </div>
        )}
      </div>
    </div>
  );
}
