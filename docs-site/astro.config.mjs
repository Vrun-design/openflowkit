import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { toStarlightSidebar } from '../src/docs/publicDocsCatalog.js';

export default defineConfig({
  site: 'https://docs.openflowkit.com',
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
    }),
  ],
});
