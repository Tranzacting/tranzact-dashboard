import React, { useState, useCallback, useEffect } from "react";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";

interface MetricsShape {
  spend: number;
  impressions: number;
  reach: number;
  link_clicks: number;
  frequency: number;
  results: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cost_per_result: number;
  conv_rate: number;
  mqls: number;
  cp_mql: number;
  sqls: number;
  cp_sql: number;
  demos: number;
  cp_demo: number;
  paid: number;
  cp_paid: number;
}

interface AdNode extends MetricsShape {
  ad_id: string;
  ad_name: string;
}

interface AdSetNode {
  adset_id: string;
  adset_name: string;
  ads: AdNode[];
  totals: MetricsShape;
}

interface CampaignNode {
  campaign_id: string;
  campaign_name: string;
  adsets: AdSetNode[];
  totals: MetricsShape;
}

interface TableResponse {
  campaigns: CampaignNode[];
  grand_totals: MetricsShape;
  meta: {
    since: string;
    until: string;
    fb_ad_rows: number;
    hs_totals: {
      mqls: number;
      sqls: number;
      demos: number;
      paid: number;
    };
  };
}

const FB_COLUMNS = [
  { key: "spend", label: "Spend", fmt: "inr" },
  { key: "impressions", label: "Impressions", fmt: "number" },
  { key: "reach", label: "Reach", fmt: "number" },
  { key: "link_clicks", label: "Link Clicks", fmt: "number" },
  { key: "frequency", label: "Frequency", fmt: "decimal" },
  { key: "results", label: "Results", fmt: "number" },
  { key: "ctr", label: "CTR", fmt: "percent" },
  { key: "cpc", label: "CPC", fmt: "inr" },
  { key: "cpm", label: "CPM", fmt: "inr" },
  { key: "cost_per_result", label: "CP Result", fmt: "inr" },
  { key: "conv_rate", label: "Conv. Rate", fmt: "percent" },
] as const;

const HS_COLUMNS = [
  { key: "mqls", label: "MQLs", fmt: "number" },
  { key: "cp_mql", label: "CP MQL", fmt: "inr" },
  { key: "sqls", label: "SQLs", fmt: "number" },
  { key: "cp_sql", label: "CP SQL", fmt: "inr" },
  { key: "demos", label: "Demos", fmt: "number" },
  { key: "cp_demo", label: "CP Demo", fmt: "inr" },
  { key: "paid", label: "Paid", fmt: "number" },
  { key: "cp_paid", label: "CP Paid", fmt: "inr" },
] as const;

function formatValue(value: number, fmt: string): string {
  if (value === undefined || value === null) return "—";
  if (isNaN(value)) return "—";

  switch (fmt) {
    case "inr":
      return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    case "number":
      return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    case "percent":
      return `${value.toFixed(2)}%`;
    case "decimal":
      return value.toFixed(2);
    default:
      return String(value);
  }
}

interface Props {
  token: string;
  onBack: () => void;
}

export default function MetaAdsTablePage({ token, onBack }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [since, setSince] = useState(yearStart);
  const [until, setUntil] = useState(today);
  const [data, setData] = useState<TableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ since, until });
      const res = await fetch(`/api/meta-ads-table?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [token, since, until]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCampaign = (id: string) => {
    const newSet = new Set(expandedCampaigns);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCampaigns(newSet);
  };

  const toggleAdset = (id: string) => {
    const newSet = new Set(expandedAdsets);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedAdsets(newSet);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
          Meta Ads Attribution
        </h1>
      </div>

      {/* Date filters */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
            Since
          </label>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
            Until
          </label>
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "8px 16px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: "16px",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "8px",
            color: "#c33",
            marginBottom: "24px",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          Loading...
        </div>
      )}

      {/* Table */}
      {data && (
        <>
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            <table style={{ minWidth: "1800px", borderCollapse: "collapse", width: "100%" }}>
              <thead>
                {/* Group header row */}
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th
                    rowSpan={2}
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 25,
                      background: "#f8fafc",
                      padding: "12px",
                      textAlign: "left",
                      fontWeight: "600",
                      minWidth: "200px",
                    }}
                  >
                    Campaign / Ad Set / Ad
                  </th>
                  <th
                    colSpan={FB_COLUMNS.length}
                    style={{
                      background: "#eff6ff",
                      color: "#1877f2",
                      padding: "12px",
                      textAlign: "center",
                      fontWeight: "600",
                      borderRight: "1px solid #e2e8f0",
                    }}
                  >
                    Facebook Metrics
                  </th>
                  <th
                    colSpan={HS_COLUMNS.length}
                    style={{
                      background: "#f0fdf4",
                      color: "#00b890",
                      padding: "12px",
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    HubSpot Attribution
                  </th>
                </tr>

                {/* Column header row */}
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {FB_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#666",
                        borderRight: "1px solid #e2e8f0",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                  {HS_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#666",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Grand totals row */}
                <tr
                  style={{
                    background: "rgba(0,184,144,0.05)",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 10,
                      background: "rgba(0,184,144,0.05)",
                      padding: "12px",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    TOTAL
                  </td>
                  {FB_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        fontSize: "13px",
                        fontWeight: "600",
                        borderRight: "1px solid #e2e8f0",
                      }}
                    >
                      {formatValue(data.grand_totals[col.key as keyof MetricsShape], col.fmt)}
                    </td>
                  ))}
                  {HS_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {formatValue(data.grand_totals[col.key as keyof MetricsShape], col.fmt)}
                    </td>
                  ))}
                </tr>

                {/* Campaign rows */}
                {data.campaigns.map((campaign) => {
                  const isExpanded = expandedCampaigns.has(campaign.campaign_id);

                  return (
                    <React.Fragment key={campaign.campaign_id}>
                      {/* Campaign row */}
                      <tr
                        style={{
                          background: "#f8fafc",
                          borderBottom: "1px solid #e2e8f0",
                          cursor: "pointer",
                        }}
                        onClick={() => toggleCampaign(campaign.campaign_id)}
                      >
                        <td
                          style={{
                            position: "sticky",
                            left: 0,
                            zIndex: 10,
                            background: "#f8fafc",
                            padding: "12px",
                            paddingLeft: "12px",
                            fontWeight: "bold",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                          {campaign.campaign_name}
                        </td>
                        {FB_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            style={{
                              padding: "12px",
                              textAlign: "right",
                              fontSize: "13px",
                              fontWeight: "600",
                              borderRight: "1px solid #e2e8f0",
                            }}
                          >
                            {formatValue(campaign.totals[col.key as keyof MetricsShape], col.fmt)}
                          </td>
                        ))}
                        {HS_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            style={{
                              padding: "12px",
                              textAlign: "right",
                              fontSize: "13px",
                              fontWeight: "600",
                            }}
                          >
                            {formatValue(campaign.totals[col.key as keyof MetricsShape], col.fmt)}
                          </td>
                        ))}
                      </tr>

                      {/* AdSet rows (when campaign expanded) */}
                      {isExpanded &&
                        campaign.adsets.map((adset) => {
                          const asKey = `${campaign.campaign_id}_${adset.adset_id}`;
                          const asExpanded = expandedAdsets.has(asKey);

                          return (
                            <React.Fragment key={asKey}>
                              {/* AdSet row */}
                              <tr
                                style={{
                                  background: "white",
                                  borderBottom: "1px solid #e2e8f0",
                                  cursor: "pointer",
                                }}
                                onClick={() => toggleAdset(asKey)}
                              >
                                <td
                                  style={{
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 10,
                                    background: "white",
                                    padding: "12px",
                                    paddingLeft: "28px",
                                    fontWeight: "500",
                                    fontSize: "13px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                  }}
                                >
                                  {asExpanded ? (
                                    <ChevronDown size={16} />
                                  ) : (
                                    <ChevronRight size={16} />
                                  )}
                                  {adset.adset_name}
                                </td>
                                {FB_COLUMNS.map((col) => (
                                  <td
                                    key={col.key}
                                    style={{
                                      padding: "12px",
                                      textAlign: "right",
                                      fontSize: "13px",
                                      borderRight: "1px solid #e2e8f0",
                                    }}
                                  >
                                    {formatValue(adset.totals[col.key as keyof MetricsShape], col.fmt)}
                                  </td>
                                ))}
                                {HS_COLUMNS.map((col) => (
                                  <td
                                    key={col.key}
                                    style={{
                                      padding: "12px",
                                      textAlign: "right",
                                      fontSize: "13px",
                                    }}
                                  >
                                    {formatValue(adset.totals[col.key as keyof MetricsShape], col.fmt)}
                                  </td>
                                ))}
                              </tr>

                              {/* Ad rows (when adset expanded) */}
                              {asExpanded &&
                                adset.ads.map((ad) => (
                                  <tr
                                    key={ad.ad_id}
                                    style={{
                                      background: "#fafafa",
                                      borderBottom: "1px solid #e2e8f0",
                                    }}
                                  >
                                    <td
                                      style={{
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 10,
                                        background: "#fafafa",
                                        padding: "12px",
                                        paddingLeft: "48px",
                                        fontSize: "12px",
                                        color: "#666",
                                      }}
                                    >
                                      {ad.ad_name}
                                    </td>
                                    {FB_COLUMNS.map((col) => (
                                      <td
                                        key={col.key}
                                        style={{
                                          padding: "12px",
                                          textAlign: "right",
                                          fontSize: "12px",
                                          color: "#666",
                                          borderRight: "1px solid #e2e8f0",
                                        }}
                                      >
                                        {formatValue(ad[col.key as keyof AdNode], col.fmt)}
                                      </td>
                                    ))}
                                    {HS_COLUMNS.map((col) => (
                                      <td
                                        key={col.key}
                                        style={{
                                          padding: "12px",
                                          textAlign: "right",
                                          fontSize: "12px",
                                          color: "#666",
                                        }}
                                      >
                                        {formatValue(ad[col.key as keyof AdNode], col.fmt)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Meta info */}
          <div
            style={{
              marginTop: "16px",
              fontSize: "12px",
              color: "#999",
              display: "flex",
              gap: "24px",
            }}
          >
            <div>
              Ads: {data.meta.fb_ad_rows} | MQLs: {data.meta.hs_totals.mqls} | SQLs:{" "}
              {data.meta.hs_totals.sqls} | Demos: {data.meta.hs_totals.demos} | Paid:{" "}
              {data.meta.hs_totals.paid}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
