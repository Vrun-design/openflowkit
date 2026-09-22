import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { remarkOpenflowExamples } from './src/plugins/remark-openflow-examples.mjs';

// The sidebar mirrors the file system, so a page can never be orphaned: every
// markdown file under src/content/docs/ appears exactly once, titled by its
// frontmatter. Curated groups come first, anything unlisted lands in "More".
const DOCS_DIR = fileURLToPath(new URL('./src/content/docs', import.meta.url));

const CURATED = {
  'Start here': ['introduction', 'quick-start', 'local-first-diagramming'],
  'Diagram as code': ['openflow-dsl', 'mermaid-import'],
  'Diagram families': [
    'diagram-flowchart', 'diagram-architecture', 'diagram-sequence', 'diagram-state',
    'diagram-erd', 'diagram-class', 'diagram-mindmap', 'diagram-gitgraph', 'diagram-chart',
  ],
  'The canvas': ['canvas-basics', 'shapes-and-connectors', 'insert-media', 'context-menu', 'properties-panel', 'settings', 'theming'],
  'Agents & MCP': ['mcp-server', 'prompting-agents'],
  'AI (bring your own key)': ['ai-generation'],
  'Export & motion': ['exporting', 'animated-export'],
  'Architecture (C4)': ['architecture-c4', 'architecture-workspace'],
  Reference: ['openflow-dsl-reference', 'keyboard-shortcuts'],
};

const slugs = readdirSync(DOCS_DIR).filter((file) => file.endsWith('.md')).map((file) => file.slice(0, -3));
const titleOf = (slug) => {
  const match = /^title:\s*(.+)$/m.exec(readFileSync(`${DOCS_DIR}/${slug}.md`, 'utf8'));
  return match ? match[1].replace(/^["']|["']$/g, '') : slug;
};
const item = (slug) => ({ label: titleOf(slug), slug });

const curated = Object.values(CURATED).flat();
const sidebar = [
  ...Object.entries(CURATED).map(([label, entries]) => ({
    label,
    items: entries.filter((slug) => slugs.includes(slug)).map(item),
  })).filter(({ items }) => items.length > 0),
  ...(slugs.some((slug) => !curated.includes(slug))
    ? [{ label: 'More', items: slugs.filter((slug) => !curated.includes(slug)).sort().map(item) }]
    : []),
];

export default defineConfig({
  site: 'https://docs.openflowkit.com',
  legacy: {
    collections: true,
  },
  // Every ```` ```openflow ```` block becomes a figure whose SVG was compiled
  // from the same block at build time (scripts/build-examples.mts).
  markdown: {
    remarkPlugins: [remarkOpenflowExamples],
  },
  integrations: [
    starlight({
      title: 'OpenFlowKit Docs',
      description: 'Documentation for OpenFlowKit — the local-first, AI-powered diagramming tool.',
      favicon: '/favicon.svg',
      logo: {
        src: './src/assets/Logo_openflowkit.svg',
        alt: 'OpenFlowKit',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/Vrun-design/openflowkit' },
      ],
      editLink: {
        baseUrl: 'https://github.com/Vrun-design/openflowkit/edit/main/docs-site/src/content/docs/',
      },
      // English only: root locale keeps clean URLs (/introduction, not /en/introduction).
      defaultLocale: 'root',
      sidebar,
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'script',
          attrs: { type: 'module' },
          content: `
            import { initializeSurfaceAnalytics } from '../../src/services/analytics/surfaceAnalyticsClient';

            const analytics = initializeSurfaceAnalytics({
              surface: 'docs',
              apiKey: import.meta.env.PUBLIC_POSTHOG_KEY,
              apiHost: import.meta.env.PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
              enabled: import.meta.env.PUBLIC_ENABLE_ANALYTICS === 'true',
            });

            analytics.capturePageView('docs_page_viewed');

            document.addEventListener('click', (event) => {
              const element = event.target instanceof Element ? event.target.closest('a') : null;
              if (!(element instanceof HTMLAnchorElement)) return;

              const href = element.href || '';
              const target = element.dataset.analyticsTarget || null;
              const placement = element.dataset.analyticsPlacement || null;
              const explicitEvent = element.dataset.analyticsEvent || null;

              if (explicitEvent) {
                analytics.capture(explicitEvent, { href, target, placement });
                return;
              }

              if (href.includes('app.openflowkit.com')) {
                analytics.capture('docs_open_app_clicked', { href, target: 'app', placement });
                return;
              }

              if (href.includes('github.com/Vrun-design/openflowkit')) {
                analytics.capture('docs_github_clicked', { href, target: 'github', placement });
              }
            });
          `,
        },
      ],
    }),
  ],
});
