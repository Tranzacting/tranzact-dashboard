/**
 * Build a Notion weekly sub-page under "Campaign Optimization Methodology" for a given review cycle.
 *
 * Usage:
 *   npx tsx scripts/optimization/notion-weekly-sync.ts <weekly.json> <review-cycle-id>
 *   # where weekly.json comes from `pull-weekly.ts` and review-cycle-id matches recs in Supabase
 *
 * Behavior: archives any prior sub-page with the same week title, creates fresh, populates with blocks.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import { Client } from '@notionhq/client';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'dashboard/.env' });
dotenv.config({ path: '.env.vercel' });

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const METHODOLOGY_PAGE_TITLE = 'Campaign Optimization Methodology';
const METHODOLOGY_PARENT_ID = process.env.NOTION_PARENT_PAGE_ID; // the TranZact docs page
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!NOTION_TOKEN || !METHODOLOGY_PARENT_ID || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NOTION_TOKEN / NOTION_PARENT_PAGE_ID / SUPABASE_URL / SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

const args = process.argv.slice(2);
const jsonPath = args[0];
const cycleId = args[1];
if (!jsonPath || !cycleId) {
  console.error('Usage: notion-weekly-sync.ts <weekly.json> <review-cycle-id>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// --- Helpers ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const text = (content: string, opts: Record<string, any> = {}) => ({
  type: 'text',
  text: { content },
  annotations: { bold: false, italic: false, code: false, strikethrough: false, underline: false, color: 'default', ...opts },
});

const p = (content: string) => ({
  object: 'block',
  type: 'paragraph',
  paragraph: { rich_text: [text(content)] },
});

const h2 = (content: string) => ({
  object: 'block',
  type: 'heading_2',
  heading_2: { rich_text: [text(content)] },
});

const h3 = (content: string) => ({
  object: 'block',
  type: 'heading_3',
  heading_3: { rich_text: [text(content)] },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (headers: string[], rows: (string | number)[][]): any => ({
  object: 'block',
  type: 'table',
  table: {
    table_width: headers.length,
    has_column_header: true,
    has_row_header: false,
    children: [
      { object: 'block', type: 'table_row', table_row: { cells: headers.map((h) => [text(h, { bold: true })]) } },
      ...rows.map((r) => ({
        object: 'block',
        type: 'table_row',
        table_row: { cells: r.map((c) => [text(String(c))]) },
      })),
    ],
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toggle = (title: string, children: any[]): any => ({
  object: 'block',
  type: 'toggle',
  toggle: { rich_text: [text(title)], children },
});

const callout = (content: string, emoji = '📅') => ({
  object: 'block',
  type: 'callout',
  callout: { rich_text: [text(content)], icon: { type: 'emoji', emoji } },
});

// --- Supabase: load recs for this cycle ---

async function loadRecs() {
  const url = `${SUPABASE_URL}/rest/v1/optimization_recommendations?review_cycle_id=eq.${cycleId}&order=priority.asc,created_at.asc`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY!}` },
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Array<{
    id: string;
    priority: string;
    action_type: string;
    description: string;
    status: string;
  }>;
}

// --- Find methodology page under parent ---

async function findMethodologyPage(): Promise<string | null> {
  let cursor: string | undefined;
  while (true) {
    const res = await notion.blocks.children.list({ block_id: METHODOLOGY_PARENT_ID!, start_cursor: cursor, page_size: 100 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const b of res.results as any[]) {
      if (b.type === 'child_page' && b.child_page?.title === METHODOLOGY_PAGE_TITLE) return b.id;
    }
    if (!res.has_more) return null;
    cursor = res.next_cursor ?? undefined;
  }
}

async function findExistingWeekly(methodologyPageId: string, weekTitle: string): Promise<string | null> {
  let cursor: string | undefined;
  while (true) {
    const res = await notion.blocks.children.list({ block_id: methodologyPageId, start_cursor: cursor, page_size: 100 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const b of res.results as any[]) {
      if (b.type === 'child_page' && b.child_page?.title === weekTitle) return b.id;
    }
    if (!res.has_more) return null;
    cursor = res.next_cursor ?? undefined;
  }
}

// --- Main ---

function n(v: number, digits = 2): string {
  if (!isFinite(v)) return '—';
  return Number(v.toFixed(digits)).toString();
}

function pct(v: number): string {
  return `${n(v, 2)}%`;
}

async function main() {
  const recs = await loadRecs();
  const methodologyPageId = await findMethodologyPage();
  if (!methodologyPageId) throw new Error(`Could not find "${METHODOLOGY_PAGE_TITLE}" under parent`);

  const weekTitle: string = data.week_title;
  const focal = data.focal_week;
  const w1 = data.cohorts['W-1'].overall;
  const w2 = data.cohorts['W-2'].overall;
  const w2ByCampaign: Array<{ campaign: string; mqls: number; sqls: number; sql_pct: number; connect_rate_pct: number; sd_positive_pct: number }> =
    data.cohorts['W-2'].byCampaign;
  const weeklyHistoryLabels = ['W-0 (in progress)', 'W-1 (focal)', 'W-2 (mature)', 'W-3', 'W-4'];
  const weeklyHistory = ['W-0', 'W-1', 'W-2', 'W-3', 'W-4'].map((label, i) => {
    const c = data.cohorts[label].overall;
    return [weeklyHistoryLabels[i], c.mqls, c.sqls, c.demos, c.paid, pct(c.sql_pct), pct(c.connect_rate_pct), pct(c.sd_positive_pct)];
  });

  // Verdict logic for scorecard
  const mqlStatus = w1.mqls >= 700 ? '✅' : '❌';
  const sqlStatus = w1.sqls >= 40 ? '✅' : '❌';
  const sqlPctStatus = w2.sql_pct >= 10 ? '✅' : '❌';

  // Verdict per campaign
  function verdict(c: typeof w2ByCampaign[0]): string {
    if (c.sql_pct >= 10 && c.mqls >= 20) return '✅ Above benchmark';
    if (c.mqls < 20) return '⏸ Too small to judge';
    if (c.sql_pct < 2 && c.mqls >= 50) return '🛑 Pause candidate (Rule 1)';
    if (c.sql_pct < 10) return '⚠️ Below benchmark (investigate)';
    return '—';
  }

  const blocks = [
    callout(
      `Week ${weekTitle.split(' ')[0]} review. Focal period: ${focal.start} → ${focal.end}. Reviewed on ${data.review_date}.`,
      '📅',
    ),

    h2('Benchmark scorecard'),
    p('Focal week counts (W-1 for MQL / SQL) and the mature-cohort SQL% (W-2).'),
    table(
      ['Benchmark', 'Target', 'Actual', 'Status'],
      [
        ['Weekly MQLs', '≥ 700', w1.mqls, mqlStatus],
        ['Weekly SQLs', '≥ 40', w1.sqls, sqlStatus],
        ['W-2 cohort SQL%', '≥ 10%', pct(w2.sql_pct), sqlPctStatus],
      ],
    ),

    h2('W-2 cohort by campaign (Paid ads)'),
    p('Each campaign\'s just-matured cohort. Uses W-2 SQL% as the verdict metric. Funnel layers shown so process vs. campaign-quality can be separated.'),
    table(
      ['Campaign', 'MQLs', 'SQLs', 'SQL%', 'Connect %', 'SD+ %', 'Verdict'],
      w2ByCampaign.map((c) => [c.campaign, c.mqls, c.sqls, pct(c.sql_pct), pct(c.connect_rate_pct), pct(c.sd_positive_pct), verdict(c)]),
    ),

    h2('Recommendations this week'),
    p(`${recs.length} recommendations generated. Accept / reject via /optimize <id>.`),
    table(
      ['ID (short)', 'Priority', 'Action', 'Summary'],
      recs.map((r) => [r.id.slice(0, 8), r.priority.toUpperCase(), r.action_type, r.description.slice(0, 140)]),
    ),

    toggle('📊 Weekly comparison (W-0 → W-4)', [
      p('Overall funnel and full-funnel layer metrics across the last 5 weeks. W-2 is the mature verdict; W-1 is the focal week just completed; W-0 is in progress.'),
      table(
        ['Window', 'MQLs', 'SQLs', 'Demos', 'Paid', 'SQL%', 'Connect %', 'SD+ %'],
        weeklyHistory,
      ),
    ]),
  ];

  // Archive existing weekly page with same title
  const existing = await findExistingWeekly(methodologyPageId, weekTitle);
  if (existing) {
    console.error(`Archiving existing weekly page ${existing}`);
    await notion.pages.update({ page_id: existing, archived: true });
  }

  const page = await notion.pages.create({
    parent: { page_id: methodologyPageId },
    properties: { title: [{ type: 'text', text: { content: weekTitle } }] },
  });

  // Append in chunks of 100
  for (let i = 0; i < blocks.length; i += 100) {
    await notion.blocks.children.append({
      block_id: page.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: blocks.slice(i, i + 100) as any,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log((page as any).url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
