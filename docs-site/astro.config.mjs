import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.openflowkit.com',
  integrations: [
    starlight({
      title: 'OpenFlowKit Docs',
      description: 'Documentation for OpenFlowKit — the local-first, AI-powered diagramming tool.',
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
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'introduction' },
            { label: 'Quick Start', slug: 'quick-start' },
          ],
        },
        {
          label: 'Core Workflows',
          items: [
            { label: 'Canvas Basics', slug: 'canvas-basics' },
            { label: 'Node Types', slug: 'node-types' },
            { label: 'Properties Panel', slug: 'properties-panel' },
            { label: 'Command Center', slug: 'command-center' },
          ],
        },
        {
          label: 'Studio & Automation',
          items: [
            { label: 'AI Generation', slug: 'ai-generation' },
            { label: 'Smart Layout', slug: 'smart-layout' },
            { label: 'Playback & History', slug: 'playback-history' },
            { label: 'OpenFlow DSL', slug: 'openflow-dsl' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Prompting AI Agents', slug: 'prompting-agents' },
            { label: 'Mermaid vs OpenFlow', slug: 'mermaid-vs-openflow' },
            { label: 'AWS Architecture', slug: 'aws-architecture' },
            { label: 'Payment Flow', slug: 'payment-flow' },
            { label: 'Mermaid Integration', slug: 'mermaid-integration' },
            { label: 'Exporting', slug: 'exporting' },
            { label: 'Keyboard Shortcuts', slug: 'keyboard-shortcuts' },
          ],
        },
        {
          label: 'Project Notes',
          items: [
            { label: 'Roadmap', slug: 'roadmap' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
  redirects: {
    '/': '/introduction',
  },
});
