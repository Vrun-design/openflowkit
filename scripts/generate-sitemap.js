import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.resolve(__dirname, '../public/sitemap.xml');
const PAGES_DIR = path.resolve(__dirname, '../web/src/pages');
const SITE_URL = 'https://openflowkit.com';

const ROUTE_SUFFIXES = new Set(['.astro', '.md', '.mdx']);

function toRoute(relativePath) {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const withoutExtension = normalizedPath.replace(/\.(astro|md|mdx)$/u, '');

  if (withoutExtension === 'index') {
    return '/';
  }

  if (withoutExtension.endsWith('/index')) {
    return `/${withoutExtension.slice(0, -'/index'.length)}/`;
  }

  return `/${withoutExtension}/`;
}

function collectRoutes(directory, relativeDirectory = '') {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const entryRelativePath = path.posix.join(relativeDirectory, entry.name);
    const entryAbsolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectRoutes(entryAbsolutePath, entryRelativePath);
    }

    const extension = path.extname(entry.name);
    const isStaticPage =
      ROUTE_SUFFIXES.has(extension) &&
      !entryRelativePath.startsWith('api/') &&
      !entry.name.startsWith('[');

    if (!isStaticPage) {
      return [];
    }

    return [toRoute(entryRelativePath)];
  });
}

function buildRoutes() {
  const discoveredRoutes = collectRoutes(PAGES_DIR);

  return Array.from(new Set(discoveredRoutes))
    .sort((left, right) => left.localeCompare(right))
    .map((route) => ({
      loc: new URL(route, SITE_URL).toString(),
      changefreq: route === '/' ? 'weekly' : 'monthly',
      priority: route === '/' ? '1.0' : '0.7',
    }));
}

function renderUrl({ loc, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function generateSitemap() {
  const routes = buildRoutes();
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map(renderUrl),
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf8');
  console.log(`Sitemap generated at ${OUTPUT_FILE}`);
}

generateSitemap();
