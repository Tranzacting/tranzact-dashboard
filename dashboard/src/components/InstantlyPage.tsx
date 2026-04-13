import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, ChevronDown } from "lucide-react";

interface Props { token: string; onBack: () => void; }

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  sent: number;
  open_rate: number;
  reply_rate: number;
  bounce_rate: number;
  opportunities: number;
  leads: number;
}

interface InstantlyResponse {
  campaigns: CampaignRow[];
  totals: { sent: number; opportunities: number; leads: number };
  since: string;
  until: string;
  error?: string;
}

const NUM = new Intl.NumberFormat("en-IN");

function pct(v: number) { return v === 0 ? "—" : v.toFixed(1) + "%"; }
function num(v: number) { return v === 0 ? "—" : NUM.format(v); }

function defaultSince() { return new Date().getFullYear() + "-01-01"; }
function defaultUntil() { return new Date().toISOString().slice(0, 10); }

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Active:    { bg: "rgba(0,184,144,0.08)",   color: "#00b890", border: "rgba(0,184,144,0.2)" },
  Paused:    { bg: "rgba(251,191,36,0.1)",   color: "#d97706", border: "rgba(251,191,36,0.2)" },
  Completed: { bg: "rgba(148,163,184,0.1)",  color: "#64748b", border: "rgba(148,163,184,0.2)" },
  Draft:     { bg: "rgba(99,102,241,0.08)",  color: "#6366f1", border: "rgba(99,102,241,0.2)" },
};

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

export default function InstantlyPage({ token, onBack }: Props) {
  const [since, setSince] = useState(defaultSince);
  const [until, setUntil] = useState(defaultUntil);
  const [status, setStatus] = useState("all");
  const [data, setData] = useState<InstantlyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ since, until, status });
    try {
      const res = await fetch(`/api/instantly?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json() as InstantlyResponse;
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [token, since, until, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div className="sticky top-0 z-20" style={{ background: "rgba(255,255,255,0.97)", borderBottom: "1px solid #e2e8f0", backdropFilter: "blur(12px)" }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: "#64748b" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#00b890")}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
            <ArrowLeft size={16} /> Home
          </button>
          <h1 className="font-display text-base font-semibold flex-1" style={{ color: "#0f172a" }}>
            Instantly Campaigns
          </h1>
          <button onClick={load} disabled={loading}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ color: "#64748b" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#00b890")}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
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
          <div className="w-36">
            <SelectField value={status} onChange={setStatus} label="Status" options={[
              { value: "all", label: "All Statuses" },
              { value: "Active", label: "Active" },
              { value: "Paused", label: "Paused" },
              { value: "Completed", label: "Completed" },
              { value: "Draft", label: "Draft" },
            ]} />
          </div>
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
            <span className="text-sm">Loading campaign stats…</span>
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total Sent", value: NUM.format(data.totals.sent) },
                { label: "Opportunities", value: NUM.format(data.totals.opportunities) },
                { label: "Campaigns", value: NUM.format(data.campaigns.length) },
              ].map(card => (
                <div key={card.label} className="rounded-xl p-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "#94a3b8" }}>{card.label}</p>
                  <p className="font-display text-lg font-semibold" style={{ color: "#0f172a" }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ minWidth: "700px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      {["Campaign", "Status", "Sent", "Open Rate", "Reply Rate", "Bounce Rate", "Opps"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map(c => {
                      const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.Draft;
                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                          onMouseLeave={e => (e.currentTarget.style.background = "")}>
                          <td className="px-4 py-2.5 text-xs font-medium" style={{ color: "#0f172a", maxWidth: "220px" }}>
                            <span className="truncate block" title={c.name}>{c.name}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: "#374151" }}>{num(c.sent)}</td>
                          <td className="px-4 py-2.5 text-xs tabular-nums font-medium" style={{ color: c.open_rate > 30 ? "#00b890" : "#374151" }}>
                            {pct(c.open_rate)}
                          </td>
                          <td className="px-4 py-2.5 text-xs tabular-nums font-medium" style={{ color: c.reply_rate > 3 ? "#00b890" : "#374151" }}>
                            {pct(c.reply_rate)}
                          </td>
                          <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: c.bounce_rate > 5 ? "#dc2626" : "#374151" }}>
                            {pct(c.bounce_rate)}
                          </td>
                          <td className="px-4 py-2.5 text-xs tabular-nums font-semibold" style={{ color: c.opportunities > 0 ? "#6366f1" : "#94a3b8" }}>
                            {c.opportunities > 0 ? num(c.opportunities) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm" style={{ color: "#94a3b8" }}>
                <RefreshCw size={13} className="spin" /> Refreshing…
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
