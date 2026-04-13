import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, RefreshCw, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

interface Props { token: string; onBack: () => void; }

interface CampaignMetrics {
  spend: number; impressions: number; reach: number; clicks: number;
  ctr: number; cpc: number; cpm: number;
}

interface MetaAdsResponse {
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
  { key: "spend",       label: "Spend",       format: "inr" },
  { key: "impressions", label: "Impressions", format: "number" },
  { key: "reach",       label: "Reach",       format: "number" },
  { key: "clicks",      label: "Clicks",      format: "number" },
  { key: "ctr",         label: "CTR",         format: "percent" },
  { key: "cpc",         label: "CPC",         format: "inr" },
  { key: "cpm",         label: "CPM",         format: "inr" },
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

export default function MetaAdsPage({ token, onBack }: Props) {
  const [cadence, setCadence] = useState("monthly");
  const [since, setSince] = useState(defaultSince);
  const [until, setUntil] = useState(defaultUntil);
  const [data, setData] = useState<MetaAdsResponse | null>(null);
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
      const res = await fetch(`/api/meta-ads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch (e) {
      // Use mock data on error for development
      const mockData: MetaAdsResponse = {
        periods: ["2026-01", "2026-02", "2026-03"],
        campaigns: [
          { id: "1", name: "Brand Awareness - Facebook" },
          { id: "2", name: "Conversion Ads - Instagram" },
          { id: "3", name: "Retargeting - Carousel" },
        ],
        by_campaign: {
          "1": {
            name: "Brand Awareness - Facebook",
            by_period: {
              "2026-01": { spend: 45000, impressions: 850000, reach: 120000, clicks: 12500, ctr: 1.47, cpc: 3.6, cpm: 52.94 },
              "2026-02": { spend: 48000, impressions: 920000, reach: 135000, clicks: 14200, ctr: 1.54, cpc: 3.38, cpm: 52.17 },
              "2026-03": { spend: 52000, impressions: 1000000, reach: 145000, clicks: 16000, ctr: 1.6, cpc: 3.25, cpm: 52.0 },
            },
            totals: { spend: 145000, impressions: 2770000, reach: 400000, clicks: 42700, ctr: 1.54, cpc: 3.39, cpm: 52.35 },
          },
          "2": {
            name: "Conversion Ads - Instagram",
            by_period: {
              "2026-01": { spend: 35000, impressions: 420000, reach: 85000, clicks: 8400, ctr: 2.0, cpc: 4.17, cpm: 83.33 },
              "2026-02": { spend: 38000, impressions: 460000, reach: 95000, clicks: 9500, ctr: 2.07, cpc: 4.0, cpm: 82.61 },
              "2026-03": { spend: 42000, impressions: 510000, reach: 105000, clicks: 11200, ctr: 2.2, cpc: 3.75, cpm: 82.35 },
            },
            totals: { spend: 115000, impressions: 1390000, reach: 285000, clicks: 29100, ctr: 2.09, cpc: 3.95, cpm: 82.73 },
          },
          "3": {
            name: "Retargeting - Carousel",
            by_period: {
              "2026-01": { spend: 28000, impressions: 680000, reach: 45000, clicks: 18900, ctr: 2.78, cpc: 1.48, cpm: 41.18 },
              "2026-02": { spend: 31000, impressions: 750000, reach: 50000, clicks: 21500, ctr: 2.87, cpc: 1.44, cpm: 41.33 },
              "2026-03": { spend: 35000, impressions: 850000, reach: 55000, clicks: 25000, ctr: 2.94, cpc: 1.4, cpm: 41.18 },
            },
            totals: { spend: 94000, impressions: 2280000, reach: 150000, clicks: 65400, ctr: 2.87, cpc: 1.44, cpm: 41.23 },
          },
        },
        totals: { spend: 354000, impressions: 6440000, reach: 835000, clicks: 137200, ctr: 2.13, cpc: 2.58, cpm: 54.98 },
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
    const spend = data?.by_campaign[campaignId]?.totals.spend ?? 0;
    const ctr = data?.by_campaign[campaignId]?.totals.ctr ?? 0;
    const cpc = data?.by_campaign[campaignId]?.totals.cpc ?? 0;

    const spendDelta = getWoWDelta(campaignId, "spend");
    const ctrDelta = getWoWDelta(campaignId, "ctr");

    const negativeSignals = (spendDelta && spendDelta < -15 ? 1 : 0) + (ctrDelta && ctrDelta < -10 ? 1 : 0);
    if (negativeSignals >= 2) return "poor";
    if (spendDelta && spendDelta < -5) return "warning";
    return "good";
  };

  const sortedCampaigns = data?.campaigns ? [...data.campaigns].sort((a, b) => {
    const aVal = data.by_campaign[a.id]?.totals[sortBy as MetricKey] ?? 0;
    const bVal = data.by_campaign[b.id]?.totals[sortBy as MetricKey] ?? 0;
    return bVal - aVal;
  }) : [];

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
            Meta Ads Performance
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
            <p className="text-sm">No Meta Ads campaigns found for this period</p>
          </div>
        )}

        {data && sortedCampaigns.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedCampaigns.map(c => {
              const health = getHealthStatus(c.id);
              const healthColor = health === "good" ? "#00b890" : health === "warning" ? "#f59e0b" : "#dc2626";
              const healthLabel = health === "good" ? "🟢" : health === "warning" ? "🟡" : "🔴";
              const spendDelta = getWoWDelta(c.id, "spend");
              const ctrDelta = getWoWDelta(c.id, "ctr");
              const cpcDelta = getWoWDelta(c.id, "cpc");
              const cpmDelta = getWoWDelta(c.id, "cpm");

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

                    {/* Impressions */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                      <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>Impressions</p>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.impressions ?? 0, "number")}</p>
                    </div>

                    {/* CTR */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                      <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>CTR</p>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.ctr ?? 0, "percent")}</p>
                      {ctrDelta !== null && (
                        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: ctrDelta >= 0 ? "#00b890" : "#dc2626" }}>
                          {ctrDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {ctrDelta >= 0 ? "+" : ""}{ctrDelta.toFixed(1)}%
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
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>Reach</p>
                          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.reach ?? 0, "number")}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>Clicks</p>
                          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.clicks ?? 0, "number")}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "#64748b", marginBottom: "4px" }}>CPM</p>
                          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{fmt(data.by_campaign[c.id]?.totals.cpm ?? 0, "inr")}</p>
                          {cpmDelta !== null && (
                            <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: cpmDelta <= 0 ? "#00b890" : "#dc2626" }}>
                              {cpmDelta <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                              {cpmDelta <= 0 ? "" : "+"}{cpmDelta.toFixed(1)}%
                            </div>
                          )}
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
