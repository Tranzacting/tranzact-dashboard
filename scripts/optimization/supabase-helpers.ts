import dotenv from "dotenv";

// Load env vars: dashboard/.env has all API keys, .env.vercel has Supabase
dotenv.config({ path: "dashboard/.env" });
dotenv.config({ path: ".env.vercel" });

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment");
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// --- Types ---

export interface Learning {
  id: string;
  created_at: string;
  category: string;
  insight: string;
  evidence: Record<string, unknown> | null;
  confidence: number;
  times_validated: number;
  last_validated: string | null;
  source: string | null;
  status: string;
  superseded_by: string | null;
  tags: string[] | null;
}

export interface Recommendation {
  id: string;
  created_at: string;
  learning_id: string | null;
  action_type: string;
  description: string;
  specifics: Record<string, unknown> | null;
  priority: string;
  status: string;
  accepted_at: string | null;
  implemented_at: string | null;
  rejected_reason: string | null;
  review_cycle_id: string | null;
}

export interface Outcome {
  id: string;
  recommendation_id: string;
  created_at: string;
  measured_at: string | null;
  baseline_metrics: Record<string, unknown> | null;
  outcome_metrics: Record<string, unknown> | null;
  impact: Record<string, unknown> | null;
  verdict: string | null;
  notes: string | null;
}

// --- Learnings ---

export async function getLearnings(filters?: {
  category?: string;
  status?: string;
  min_confidence?: number;
}): Promise<Learning[]> {
  const params = new URLSearchParams({ order: "confidence.desc", limit: "50" });
  if (filters?.category) params.append("category", `eq.${filters.category}`);
  if (filters?.status) params.append("status", `eq.${filters.status}`);
  else params.append("status", "eq.active");
  if (filters?.min_confidence) params.append("confidence", `gte.${filters.min_confidence}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/optimization_learnings?${params}`, { headers });
  if (!res.ok) throw new Error(`getLearnings failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<Learning[]>;
}

export async function upsertLearning(learning: Partial<Learning>): Promise<Learning> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/optimization_learnings`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(learning),
  });
  if (!res.ok) throw new Error(`upsertLearning failed: ${res.status} ${await res.text()}`);
  const rows = await res.json() as Learning[];
  return rows[0];
}

export async function updateLearning(id: string, updates: Partial<Learning>): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/optimization_learnings?id=eq.${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`updateLearning failed: ${res.status} ${await res.text()}`);
}

// --- Recommendations ---

export async function getRecommendations(filters?: {
  status?: string;
  priority?: string;
}): Promise<Recommendation[]> {
  const params = new URLSearchParams({ order: "created_at.desc", limit: "50" });
  if (filters?.status) params.append("status", `eq.${filters.status}`);
  if (filters?.priority) params.append("priority", `eq.${filters.priority}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/optimization_recommendations?${params}`, { headers });
  if (!res.ok) throw new Error(`getRecommendations failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<Recommendation[]>;
}

export async function insertRecommendation(rec: Partial<Recommendation>): Promise<Recommendation> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/optimization_recommendations`, {
    method: "POST",
    headers,
    body: JSON.stringify(rec),
  });
  if (!res.ok) throw new Error(`insertRecommendation failed: ${res.status} ${await res.text()}`);
  const rows = await res.json() as Recommendation[];
  return rows[0];
}

export async function updateRecommendationStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const body: Record<string, unknown> = { status, ...extra };
  if (status === "accepted") body.accepted_at = new Date().toISOString();
  if (status === "implemented") body.implemented_at = new Date().toISOString();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/optimization_recommendations?id=eq.${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateRecommendationStatus failed: ${res.status} ${await res.text()}`);
}

// --- Outcomes ---

export async function insertOutcome(outcome: Partial<Outcome>): Promise<Outcome> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/optimization_outcomes`, {
    method: "POST",
    headers,
    body: JSON.stringify(outcome),
  });
  if (!res.ok) throw new Error(`insertOutcome failed: ${res.status} ${await res.text()}`);
  const rows = await res.json() as Outcome[];
  return rows[0];
}

export async function getOutcomes(recId?: string): Promise<Outcome[]> {
  const params = new URLSearchParams({ order: "created_at.desc", limit: "50" });
  if (recId) params.append("recommendation_id", `eq.${recId}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/optimization_outcomes?${params}`, { headers });
  if (!res.ok) throw new Error(`getOutcomes failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<Outcome[]>;
}
