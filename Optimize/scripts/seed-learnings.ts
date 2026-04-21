import { upsertLearning } from "./supabase-helpers.ts";

const SEED_LEARNINGS = [
  {
    category: "audience",
    insight: "ICP-qualified leads (is_icp_industry verified) convert ~2x better to SQL than non-ICP leads (9.2% vs 4.4%)",
    evidence: { metric: "sql_pct", icp: 9.2, non_icp: 4.4, ratio: 2.1, period: "Oct 2025 - Mar 2026" },
    confidence: 0.7,
    source: "seed",
    tags: ["icp", "audience_quality", "sql_rate"],
  },
  {
    category: "audience",
    insight: "Positive SD sentiment leads (sd_sentiment=1) convert significantly better — 11.9% SQL% vs 2.1% for neutral",
    evidence: { metric: "sql_pct", positive: 11.9, neutral: 2.1, ratio: 5.7, period: "Oct 2025 - Mar 2026" },
    confidence: 0.6,
    source: "seed",
    tags: ["sentiment", "sd_sentiment", "sql_rate", "lead_quality"],
  },
  {
    category: "audience",
    insight: "Cluster/custom audiences outperform broad lookalikes on SQL% — cluster campaigns see ~11.9% SQL% vs broad LA at ~2-3%",
    evidence: { metric: "sql_pct", cluster: 11.9, broad_la: 2.5, period: "Jan-Mar 2026" },
    confidence: 0.6,
    source: "seed",
    tags: ["facebook", "audience_targeting", "cluster", "lookalike", "sql_rate"],
  },
  {
    category: "process",
    insight: "SDR follow-up volume is the primary bottleneck for SQL conversion — leads that convert to SQL receive ~2.4x more call attempts",
    evidence: { metric: "sdr_call_attempts", sql_leads_avg: 4.8, non_sql_avg: 2.0, ratio: 2.4, period: "Oct 2025 - Mar 2026" },
    confidence: 0.6,
    source: "seed",
    tags: ["sdr", "follow_up", "call_attempts", "process", "sql_rate"],
  },
  {
    category: "budget",
    insight: "CP Demo can spike even with flat spend when SQL% declines — Jan to Mar 2026 saw CP Demo nearly double (7,008 to 13,536) due to SQL% dropping from 7.9% to 5.8%",
    evidence: { metric: "cp_demo", jan: 7008, mar: 13536, sql_pct_jan: 7.9, sql_pct_mar: 5.8, period: "Jan-Mar 2026" },
    confidence: 0.6,
    source: "seed",
    tags: ["cp_demo", "sql_rate", "budget_efficiency", "cost_per"],
  },
];

async function main() {
  console.log("Seeding optimization learnings...\n");
  for (const learning of SEED_LEARNINGS) {
    try {
      const result = await upsertLearning(learning);
      console.log(`  Seeded: [${learning.category}] ${learning.insight.slice(0, 80)}... (id: ${result.id})`);
    } catch (err) {
      console.error(`  FAILED: ${learning.insight.slice(0, 60)}... - ${err}`);
    }
  }
  console.log(`\nDone. Seeded ${SEED_LEARNINGS.length} learnings.`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
