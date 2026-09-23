// The docs gate. Runs at the end of prebuild (and predev), after the DSL
// reference, the compiled examples and the generated references exist. It fails
// on the three failures the build itself cannot see:
//
//   1. an internal link whose target page does not exist;
//   2. a `shipped` inventory feature whose page does not exist;
//   3. a page no inventory feature backs (editorial pages are named below).
//
// The fourth failure — an example that does not compile — is the build-examples
// script, which runs before this one.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS_SITE = resolve(HERE, '..');
const REPO_ROOT = resolve(DOCS_SITE, '..');
const CONTENT = resolve(DOCS_SITE, 'src', 'content', 'docs');
const PAGES = resolve(DOCS_SITE, 'src', 'pages');

/** Pages that exist to orient, not to describe a feature. Keep this tiny. */
const EDITORIAL = new Set(['introduction', 'prompting-agents']);

const problems = [];

async function markdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(full)));
    else if (/\.mdx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

function slugOf(file) {
  return relative(CONTENT, file).replace(/\.mdx?$/, '');
}

function linkTargets(text) {
  const targets = new Set();
  for (const match of text.matchAll(/\]\((\/[^)\s]*)\)/g)) targets.add(match[1]);
  for (const match of text.matchAll(/href="(\/[^"\s]*)"/g)) targets.add(match[1]);
  return targets;
}

function isAsset(href) {
  return /\.(svg|png|jpg|jpeg|webp|gif|ico|xml|txt|json|css|js)$/.test(href);
}

async function main() {
  const files = await markdownFiles(CONTENT);
  const slugs = new Set(files.map(slugOf));
  const astroPages = (await readdir(PAGES)).filter((name) => name.endsWith('.astro'));

  // 1. Internal links resolve to a page that exists.
  const routeExists = (href) => {
    const path = href.split(/[?#]/)[0].replace(/^\/|\/$/g, '');
    if (path === '') return astroPages.includes('index.astro');
    return slugs.has(path) || astroPages.includes(`${path}.astro`);
  };
  for (const file of [...files, ...astroPages.map((name) => resolve(PAGES, name))]) {
    const text = await readFile(file, 'utf8');
    for (const href of linkTargets(text)) {
      if (isAsset(href) || href.startsWith('//')) continue;
      if (!routeExists(href)) problems.push(`${relative(REPO_ROOT, file)}: link ${href} has no page`);
    }
  }

  // 2. Every shipped feature has a page that exists.
  const inventory = JSON.parse(await readFile(resolve(DOCS_SITE, 'inventory.json'), 'utf8'));
  for (const feature of inventory.features) {
    if (feature.status !== 'shipped') continue;
    if (!feature.page) problems.push(`inventory: ${feature.id} is shipped with no page`);
    else if (!slugs.has(feature.page)) problems.push(`inventory: ${feature.id} points at missing page ${feature.page}`);
  }

  // 3. Every page is backed by an inventory feature (or is editorial).
  const backed = new Set(inventory.features.map(({ page }) => page).filter(Boolean));
  for (const slug of slugs) {
    if (!backed.has(slug) && !EDITORIAL.has(slug)) problems.push(`${slug}.md: no inventory feature backs this page`);
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`[docs-gate] ${problem}`);
    console.error(`[docs-gate] ${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log(`[docs-gate] ${slugs.size} pages, ${inventory.features.length} inventory rows, links and backing verified`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
