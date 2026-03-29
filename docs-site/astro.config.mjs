import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { toStarlightSidebar } from '../src/docs/publicDocsCatalog.js';

export default defineConfig({
  site: 'https://docs.openflowkit.com',
  legacy: {
    collections: true,
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
      // Root locale keeps English at clean URLs (/introduction not /en/introduction)
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        tr: { label: 'Türkçe', lang: 'tr' },
      },
      sidebar: toStarlightSidebar(),
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
