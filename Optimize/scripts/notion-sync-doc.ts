/**
 * Sync a local markdown file to a Notion child page.
 *
 * Usage:
 *   npx tsx scripts/notion-sync-doc.ts <markdown-file> [--title "Page Title"]
 *
 * Env (put in dashboard/.env or .env):
 *   NOTION_TOKEN              — internal integration secret
 *   NOTION_PARENT_PAGE_ID     — 32-char ID of the Notion page under which the child is created
 *
 * Behavior: if a child page with the same title already exists under the parent,
 * it is archived before creating a fresh page. This keeps the URL churny but keeps
 * content always in sync (no stale blocks left behind).
 */
import './_env';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@notionhq/client';
import { markdownToBlocks } from '@tryfabric/martian';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_TOKEN || !NOTION_PARENT_PAGE_ID) {
  console.error('Missing NOTION_TOKEN or NOTION_PARENT_PAGE_ID. Set in dashboard/.env or .env.');
  process.exit(1);
}

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith('--'));
const titleFlagIdx = args.indexOf('--title');
const titleArg = titleFlagIdx >= 0 ? args[titleFlagIdx + 1] : undefined;

if (!filePath) {
  console.error('Usage: npx tsx scripts/notion-sync-doc.ts <markdown-file> [--title "Page Title"]');
  process.exit(1);
}

const abs = path.resolve(filePath);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(1);
}

const md = fs.readFileSync(abs, 'utf8');

// Extract title from first H1 if --title not provided
function inferTitle(src: string): string {
  const m = src.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : path.basename(abs, path.extname(abs));
}

const title = titleArg ?? inferTitle(md);

// Strip the first H1 if present — Notion pages have their own title, so keeping it
// in the body would duplicate the heading.
const body = md.replace(/^#\s+.+\n+/m, '');

const notion = new Client({ auth: NOTION_TOKEN });

async function findExistingChild(parentId: string, childTitle: string): Promise<string | null> {
  // Paginate through children, looking for a child page with matching title
  let cursor: string | undefined;
  while (true) {
    const res = await notion.blocks.children.list({
      block_id: parentId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of res.results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any;
      if (b.type === 'child_page' && b.child_page?.title === childTitle) {
        return b.id;
      }
    }
    if (!res.has_more) return null;
    cursor = res.next_cursor ?? undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeBlocks(blocks: any[]): any[] {
  // Martian converts multi-line markdown blockquotes into a quote block with
  // empty rich_text and a child paragraph. Notion's web renderer crashes on that
  // shape ("Oops, there was an error loading this page"). Flatten: move the
  // child paragraph's rich_text into the quote's rich_text and drop the child.
  for (const b of blocks) {
    if (
      b.type === 'quote' &&
      (!b.quote?.rich_text || b.quote.rich_text.length === 0) &&
      Array.isArray(b.quote?.children) &&
      b.quote.children.length === 1 &&
      b.quote.children[0].type === 'paragraph'
    ) {
      b.quote.rich_text = b.quote.children[0].paragraph.rich_text ?? [];
      delete b.quote.children;
    }
  }
  return blocks;
}

async function appendInChunks(pageId: string, blocks: unknown[]) {
  // Notion caps to 100 blocks per append request
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    await notion.blocks.children.append({
      block_id: pageId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: chunk as any,
    });
  }
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks = sanitizeBlocks(markdownToBlocks(body) as any[]);

  console.error(`Syncing "${title}" → Notion parent ${NOTION_PARENT_PAGE_ID}`);
  console.error(`  ${blocks.length} blocks from ${abs}`);

  const existing = await findExistingChild(NOTION_PARENT_PAGE_ID!, title);
  if (existing) {
    console.error(`  Archiving existing page ${existing}`);
    await notion.pages.update({ page_id: existing, archived: true });
  }

  const page = await notion.pages.create({
    parent: { page_id: NOTION_PARENT_PAGE_ID! },
    properties: {
      title: [{ type: 'text', text: { content: title } }],
    },
  });

  await appendInChunks(page.id, blocks);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const url = (page as any).url;
  console.log(url || `Created page ${page.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
