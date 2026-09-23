#!/usr/bin/env node
/**
 * Build a compact icon manifest from the third-party-icons folder plus the
 * Tabler outline set the editor ships as its "Standard" pack.
 * Output: mcp-server/data/icons.json
 *
 * Schema: [{ provider, slug, label, category }]
 *
 * Run automatically before `npm run build` in mcp-server.
 */
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const ICONS_ROOT = resolve(REPO_ROOT, 'assets', 'third-party-icons');
const OUT_DIR = resolve(HERE, '..', 'data');
const OUT_FILE = resolve(OUT_DIR, 'icons.json');
const TABLER_NODES = resolve(REPO_ROOT, 'node_modules', '@tabler', 'icons', 'tabler-nodes-outline.json');

/** The editor's Standard pack: every Tabler outline icon, filled variants excluded. */
async function tablerIcons() {
  const text = await readFile(TABLER_NODES, 'utf8').catch(() => null);
  if (!text) {
    console.warn(`[icons] ${TABLER_NODES} not found; Standard icons left out.`);
    return [];
  }
  return Object.keys(JSON.parse(text))
    .filter((name) => !name.endsWith('-filled'))
    .map((slug) => ({ provider: 'tabler', slug, label: humanize(slug), category: 'Standard' }));
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanize(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' ');
}

async function walkSvgs(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkSvgs(full)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const rootStat = await stat(ICONS_ROOT).catch(() => null);
  if (!rootStat?.isDirectory()) {
    console.warn(`[icons] ${ICONS_ROOT} not found; writing empty manifest.`);
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(OUT_FILE, '[]\n', 'utf8');
    return;
  }

  const providers = (await readdir(ICONS_ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const manifest = [];
  for (const provider of providers) {
    const processedDir = join(ICONS_ROOT, provider, 'processed');
    const svgs = await walkSvgs(processedDir);
    for (const filePath of svgs) {
      const rel = relative(processedDir, filePath).replace(/\\/g, '/').replace(/\.svg$/i, '');
      const parts = rel.split('/');
      const category = parts.length > 1 ? humanize(slugify(parts[0])) : 'Misc';
      const slug = slugify(rel.replace(/\//g, '-'));
      manifest.push({
        provider: provider.toLowerCase(),
        slug,
        label: humanize(slug),
        category,
      });
    }
  }

  manifest.push(...(await tablerIcons()));

  manifest.sort((a, b) => {
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    return a.slug.localeCompare(b.slug);
  });

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(manifest) + '\n', 'utf8');

  const byProvider = manifest.reduce((acc, item) => {
    acc[item.provider] = (acc[item.provider] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `[icons] wrote ${manifest.length} icons to ${relative(REPO_ROOT, OUT_FILE)} ` +
      `(${Object.entries(byProvider).map(([p, n]) => `${p}=${n}`).join(', ')})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
