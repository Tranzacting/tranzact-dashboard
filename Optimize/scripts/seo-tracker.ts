/**
 * Supabase helpers for the SEO learning layer.
 *
 * Three tables (create once in Supabase SQL editor):
 *
 * create table seo_keyword_snapshots (
 *   id bigint generated always as identity primary key,
 *   keyword text not null,
 *   position numeric,
 *   impressions integer,
 *   clicks integer,
 *   ctr numeric,
 *   snapshot_date date not null,
 *   site_url text,
 *   created_at timestamptz default now(),
 *   unique (keyword, snapshot_date)
 * );
 *
 * create table seo_posts (
 *   id bigint generated always as identity primary key,
 *   keyword text not null,
 *   slug text,
 *   title text,
 *   intent text,
 *   status text default 'draft',
 *   word_count integer,
 *   brief jsonb,
 *   file_path text,
 *   notion_url text,
 *   created_at timestamptz default now(),
 *   published_at date
 * );
 *
 * create table seo_learnings (
 *   id bigint generated always as identity primary key,
 *   insight text not null,
 *   category text,
 *   confidence numeric default 0.5,
 *   evidence jsonb,
 *   status text default 'active',
 *   times_validated integer default 0,
 *   created_at timestamptz default now(),
 *   last_validated timestamptz
 * );
 *
 * create table seo_recommendations (
 *   id uuid default gen_random_uuid() primary key,
 *   action_type text not null,
 *   description text not null,
 *   keyword text,
 *   url text,
 *   priority text not null default 'medium',
 *   status text not null default 'pending',
 *   specifics jsonb,
 *   review_cycle_id text,
 *   learning_id bigint references seo_learnings(id),
 *   created_at timestamptz default now(),
 *   accepted_at timestamptz,
 *   implemented_at timestamptz,
 *   rejected_reason text,
 *   outcome text,
 *   outcome_measured_at timestamptz,
 *   baseline_position numeric,
 *   outcome_position numeric
 * );
 */
import './_env';
import type { GSCQuery } from './seo-pull';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function supabaseEnabled(): boolean {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeywordSnapshot {
  id?: number;
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  snapshot_date: string;   // YYYY-MM-DD
  site_url?: string;
  created_at?: string;
}

export interface SEOPost {
  id?: number;
  keyword: string;
  slug?: string;
  title?: string;
  intent?: string;
  status?: 'draft' | 'published' | 'rejected';
  word_count?: number;
  brief?: Record<string, unknown>;
  file_path?: string;
  notion_url?: string;
  created_at?: string;
  published_at?: string;
}

export interface SEOLearning {
  id?: number;
  insight: string;
  category: 'content_performance' | 'keyword_pattern' | 'competitor_gap' | 'technical';
  confidence: number;
  evidence?: Record<string, unknown>;
  status?: 'active' | 'superseded' | 'rejected';
  times_validated?: number;
  created_at?: string;
  last_validated?: string;
}

// ---------------------------------------------------------------------------
// Keyword snapshots
// ---------------------------------------------------------------------------

export async function saveKeywordSnapshots(
  queries: GSCQuery[],
  siteUrl: string,
  date?: string,
): Promise<void> {
  if (!supabaseEnabled()) {
    console.error('  Supabase not configured — skipping keyword snapshot');
    return;
  }

  const snapshotDate = date ?? new Date().toISOString().slice(0, 10);
  const byKeyword = new Map<string, GSCQuery>();
  for (const q of queries) byKeyword.set(q.query, q);
  const rows = [...byKeyword.values()].map((q) => ({
    keyword: q.query,
    position: q.position,
    impressions: q.impressions,
    clicks: q.clicks,
    ctr: q.ctr,
    snapshot_date: snapshotDate,
    site_url: siteUrl,
  }));

  // Upsert in batches of 100 (on conflict keyword + snapshot_date → update)
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_keyword_snapshots?on_conflict=keyword,snapshot_date`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const err = await res.text();
      // Table not created yet — fail silently with a clear message
      if (err.includes('does not exist') || res.status === 404) {
        console.error('  seo_keyword_snapshots table not found — run the SQL in seo-tracker.ts to create it');
        return;
      }
      throw new Error(`saveKeywordSnapshots failed: ${res.status} ${err}`);
    }
  }

  console.error(`  Saved ${rows.length} keyword snapshots (${snapshotDate})`);
}

export async function getKeywordSnapshots(options: {
  keywords?: string[];
  since?: string;   // YYYY-MM-DD
  limit?: number;
}): Promise<KeywordSnapshot[]> {
  if (!supabaseEnabled()) return [];

  const params = new URLSearchParams({ order: 'snapshot_date.desc', limit: String(options.limit ?? 500) });
  if (options.since) params.append('snapshot_date', `gte.${options.since}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_keyword_snapshots?${params}`, { headers });
  if (!res.ok) return [];
  const rows = await res.json() as KeywordSnapshot[];

  if (options.keywords?.length) {
    const set = new Set(options.keywords.map((k) => k.toLowerCase()));
    return rows.filter((r) => set.has(r.keyword.toLowerCase()));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function logPost(post: Omit<SEOPost, 'id' | 'created_at'>): Promise<SEOPost | null> {
  if (!supabaseEnabled()) {
    console.error('  Supabase not configured — skipping post log');
    return null;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(post),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes('does not exist') || res.status === 404) {
      console.error('  seo_posts table not found — run the SQL in seo-tracker.ts to create it');
      return null;
    }
    throw new Error(`logPost failed: ${res.status} ${err}`);
  }

  const rows = await res.json() as SEOPost[];
  console.error(`  Post logged to Supabase (id: ${rows[0]?.id})`);
  return rows[0] ?? null;
}

export async function getPosts(options: { status?: string; limit?: number } = {}): Promise<SEOPost[]> {
  if (!supabaseEnabled()) return [];

  const params = new URLSearchParams({ order: 'created_at.desc', limit: String(options.limit ?? 50) });
  if (options.status) params.append('status', `eq.${options.status}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_posts?${params}`, { headers });
  if (!res.ok) return [];
  return res.json() as Promise<SEOPost[]>;
}

export async function updatePostStatus(id: number, status: SEOPost['status'], publishedAt?: string): Promise<void> {
  if (!supabaseEnabled()) return;

  const body: Partial<SEOPost> = { status };
  if (publishedAt) body.published_at = publishedAt;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_posts?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updatePostStatus failed: ${res.status} ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// Learnings
// ---------------------------------------------------------------------------

export async function saveLearning(learning: Omit<SEOLearning, 'id' | 'created_at'>): Promise<SEOLearning | null> {
  if (!supabaseEnabled()) return null;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_learnings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ status: 'active', times_validated: 0, ...learning }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes('does not exist') || res.status === 404) {
      console.error('  seo_learnings table not found — run the SQL in seo-tracker.ts to create it');
      return null;
    }
    throw new Error(`saveLearning failed: ${res.status} ${err}`);
  }

  const rows = await res.json() as SEOLearning[];
  return rows[0] ?? null;
}

export async function getLearnings(options: {
  category?: SEOLearning['category'];
  minConfidence?: number;
  limit?: number;
} = {}): Promise<SEOLearning[]> {
  if (!supabaseEnabled()) return [];

  const params = new URLSearchParams({
    status: 'eq.active',
    order: 'confidence.desc',
    limit: String(options.limit ?? 20),
  });
  if (options.category) params.append('category', `eq.${options.category}`);
  if (options.minConfidence) params.append('confidence', `gte.${options.minConfidence}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_learnings?${params}`, { headers });
  if (!res.ok) return [];
  return res.json() as Promise<SEOLearning[]>;
}

export async function validateLearning(id: number): Promise<void> {
  if (!supabaseEnabled()) return;

  // Increment times_validated and update last_validated timestamp
  const existing = await fetch(`${SUPABASE_URL}/rest/v1/seo_learnings?id=eq.${id}`, { headers });
  if (!existing.ok) return;
  const [row] = await existing.json() as SEOLearning[];
  if (!row) return;

  await fetch(`${SUPABASE_URL}/rest/v1/seo_learnings?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      times_validated: (row.times_validated ?? 0) + 1,
      last_validated: new Date().toISOString(),
      confidence: Math.min(0.99, (row.confidence ?? 0.5) + 0.05),
    }),
  });
}

export async function supersedeLearning(id: number): Promise<void> {
  if (!supabaseEnabled()) return;
  await fetch(`${SUPABASE_URL}/rest/v1/seo_learnings?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'superseded' }),
  });
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export interface SEORecommendation {
  id?: string;
  action_type: 'write_post' | 'update_post' | 'fix_technical' | 'fix_meta' | 'target_keyword' | 'competitor_gap';
  description: string;
  keyword?: string;
  url?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status?: 'pending' | 'accepted' | 'implemented' | 'rejected';
  specifics?: Record<string, unknown>;
  review_cycle_id?: string;
  learning_id?: number;
  created_at?: string;
  accepted_at?: string;
  implemented_at?: string;
  rejected_reason?: string;
  outcome?: 'positive' | 'negative' | 'neutral' | 'inconclusive';
  outcome_measured_at?: string;
  baseline_position?: number;
  outcome_position?: number;
}

export async function insertSEORec(
  rec: Omit<SEORecommendation, 'id' | 'created_at'>,
): Promise<SEORecommendation | null> {
  if (!supabaseEnabled()) {
    console.error('  Supabase not configured — skipping rec insert');
    return null;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_recommendations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ status: 'pending', ...rec }),
  });
  if (!res.ok) {
    const err = await res.text();
    if (err.includes('does not exist') || res.status === 404) {
      console.error('  seo_recommendations table not found — run the SQL in seo-tracker.ts to create it');
      return null;
    }
    throw new Error(`insertSEORec failed: ${res.status} ${err}`);
  }
  const rows = await res.json() as SEORecommendation[];
  return rows[0] ?? null;
}

export async function getSEORecs(options: {
  status?: string;
  limit?: number;
} = {}): Promise<SEORecommendation[]> {
  if (!supabaseEnabled()) return [];
  const params = new URLSearchParams({ order: 'created_at.desc', limit: String(options.limit ?? 50) });
  if (options.status) params.append('status', `eq.${options.status}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_recommendations?${params}`, { headers });
  if (!res.ok) return [];
  return res.json() as Promise<SEORecommendation[]>;
}

export async function updateSEORecStatus(
  id: string,
  status: SEORecommendation['status'],
  extra: Record<string, unknown> = {},
): Promise<void> {
  if (!supabaseEnabled()) return;
  const body: Record<string, unknown> = { status, ...extra };
  if (status === 'accepted') body.accepted_at = new Date().toISOString();
  if (status === 'implemented') body.implemented_at = new Date().toISOString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_recommendations?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateSEORecStatus failed: ${res.status} ${await res.text()}`);
}
