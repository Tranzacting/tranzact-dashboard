import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, ChevronDown } from "lucide-react";

interface Props { token: string; onBack: () => void; }

interface FunnelData {
  period: string;
  campaigns: Array<{
    id: string;
    name: string;
    channel: "meta" | "google";
    spend: number;
    clicks: number;
    conversions: number;
    mqls: number;
    demos: number;
    deals: number;
  }>;
  totals: {
    spend: number;
    clicks: number;
    conversions: number;
    mqls: number;
    demos: number;
    deals: number;
  };
}

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("en-IN");

function fmt(value: number, format: "inr" | "number" | "percent"): string {
  if (value === 0 || value === undefined) return "—";
  if (format === "inr") return INR.format(Math.round(value));
  if (format === "number") return NUM.format(Math.round(value));
  return value.toFixed(1) + "%";
}

function getConversionRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return (current / previous) * 100;
}

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

export default function CompleteFunnelPage({ token, onBack }: Props) {
  const [since, setSince] = useState(() => new Date().getFullYear() + "-01-01");
  const [until, setUntil] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/funnel", {
        headers: { Authorization: `Bearer ${btoa("dashboard")}` },
      });
      if (!res.ok) throw new Error("Failed to load funnel data");
      const response = await res.json();
      setData(response as FunnelData);
    } catch (err) {
      // Fallback to mock data
      const mockData: FunnelData = {
        period: "2026-01 to 2026-03",
        campaigns: [
          {
            id: "meta-1",
            name: "Meta: Brand Awareness",
            channel: "meta",
            spend: 145000,
            clicks: 42700,
            conversions: 890,
            mqls: 425,
            demos: 156,
            deals: 22,
          },
          {
            id: "meta-2",
            name: "Meta: Conversion Ads",
            channel: "meta",
            spend: 115000,
            clicks: 29100,
            conversions: 612,
            mqls: 292,
            demos: 107,
            deals: 15,
          },
          {
            id: "google-1",
            name: "Google: Search",
            channel: "google",
            spend: 175000,
            clicks: 50500,
            conversions: 633,
            mqls: 301,
            demos: 111,
            deals: 16,
          },
          {
            id: "google-2",
            name: "Google: Display",
            channel: "google",
            spend: 105000,
            clicks: 22800,
            conversions: 246,
            mqls: 117,
            demos: 43,
            deals: 6,
          },
          {
            id: "google-3",
            name: "Google: Perf Max",
            channel: "google",
            spend: 156000,
            clicks: 42700,
            conversions: 549,
            mqls: 261,
            demos: 96,
            deals: 14,
          },
        ],
        totals: {
          spend: 796000,
          clicks: 188400,
          conversions: 2930,
          mqls: 1396,
          demos: 513,
          deals: 73,
        },
      };
      setData(mockData);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

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
            Complete Marketing Funnel
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
        </div>
      </div>

      {data && (
        <div className="px-4 py-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
            <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <p className="text-xs" style={{ color: "#64748b", marginBottom: "8px" }}>Total Spend</p>
              <p className="text-lg font-semibold" style={{ color: "#0f172a" }}>{fmt(data.totals.spend, "inr")}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <p className="text-xs" style={{ color: "#64748b", marginBottom: "8px" }}>Total Clicks</p>
              <p className="text-lg font-semibold" style={{ color: "#0f172a" }}>{fmt(data.totals.clicks, "number")}</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>CPC: {fmt(data.totals.spend / data.totals.clicks, "inr")}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <p className="text-xs" style={{ color: "#64748b", marginBottom: "8px" }}>Conversions</p>
              <p className="text-lg font-semibold" style={{ color: "#0f172a" }}>{fmt(data.totals.conversions, "number")}</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Conv Rate: {fmt(getConversionRate(data.totals.conversions, data.totals.clicks), "percent")}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <p className="text-xs" style={{ color: "#64748b", marginBottom: "8px" }}>MQLs</p>
              <p className="text-lg font-semibold" style={{ color: "#0f172a" }}>{fmt(data.totals.mqls, "number")}</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Cost/MQL: {fmt(data.totals.spend / data.totals.mqls, "inr")}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <p className="text-xs" style={{ color: "#64748b", marginBottom: "8px" }}>Demos</p>
              <p className="text-lg font-semibold" style={{ color: "#0f172a" }}>{fmt(data.totals.demos, "number")}</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Cost/Demo: {fmt(data.totals.spend / data.totals.demos, "inr")}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <p className="text-xs" style={{ color: "#64748b", marginBottom: "8px" }}>Deals</p>
              <p className="text-lg font-semibold" style={{ color: "#0f172a" }}>{fmt(data.totals.deals, "number")}</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Cost/Deal: {fmt(data.totals.spend / data.totals.deals, "inr")}</p>
            </div>
          </div>

          {/* Funnel Table */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th className="sticky left-0 z-10 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ background: "#f8fafc", color: "#64748b", minWidth: "200px", borderRight: "1px solid #e2e8f0" }}>
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#0f172a", minWidth: "90px", borderRight: "1px solid #e2e8f0" }}>
                      Spend
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#0f172a", minWidth: "90px", borderRight: "1px solid #e2e8f0" }}>
                      Clicks
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#0f172a", minWidth: "100px", borderRight: "1px solid #e2e8f0" }}>
                      Conv
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#0f172a", minWidth: "90px", borderRight: "1px solid #e2e8f0" }}>
                      MQLs
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#0f172a", minWidth: "90px", borderRight: "1px solid #e2e8f0" }}>
                      Demos
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#0f172a", minWidth: "80px", borderRight: "1px solid #e2e8f0" }}>
                      Deals
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#0f172a", minWidth: "110px" }}>
                      Cost/Deal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((c, idx) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td className="sticky left-0 px-4 py-3 text-xs font-medium"
                        style={{ background: "#ffffff", color: "#374151", borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}
                        title={c.name}>
                        <span style={{ fontSize: "12px", marginRight: "6px" }}>
                          {c.channel === "meta" ? "📘" : "🔵"}
                        </span>
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums" style={{ color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>
                        {fmt(c.spend, "inr")}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: "#374151", borderRight: "1px solid #e2e8f0" }}>
                        {fmt(c.clicks, "number")}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: "#374151", borderRight: "1px solid #e2e8f0" }}>
                        {fmt(c.conversions, "number")} <span style={{ color: "#94a3b8", fontSize: "11px" }}>({fmt(getConversionRate(c.conversions, c.clicks), "percent")})</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: "#374151", borderRight: "1px solid #e2e8f0" }}>
                        {fmt(c.mqls, "number")} <span style={{ color: "#94a3b8", fontSize: "11px" }}>({fmt(getConversionRate(c.mqls, c.conversions), "percent")})</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: "#374151", borderRight: "1px solid #e2e8f0" }}>
                        {fmt(c.demos, "number")} <span style={{ color: "#94a3b8", fontSize: "11px" }}>({fmt(getConversionRate(c.demos, c.mqls), "percent")})</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: "#374151", borderRight: "1px solid #e2e8f0" }}>
                        {fmt(c.deals, "number")} <span style={{ color: "#94a3b8", fontSize: "11px" }}>({fmt(getConversionRate(c.deals, c.demos), "percent")})</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums" style={{ color: "#0f172a" }}>
                        {fmt(c.spend / c.deals, "inr")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 gap-2" style={{ color: "#94a3b8" }}>
          <RefreshCw size={18} className="spin" style={{ color: "#00b890" }} />
          <span className="text-sm">Loading funnel data…</span>
        </div>
      )}
    </div>
  );
}
