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
            { label: 'Local-First Diagramming', slug: 'local-first-diagramming' },
          ],
        },
        {
          label: 'Editor Basics',
          items: [
            { label: 'Canvas Basics', slug: 'canvas-basics' },
            { label: 'Diagram Families', slug: 'diagram-families' },
            { label: 'Node Types', slug: 'node-types' },
            { label: 'Properties Panel', slug: 'properties-panel' },
            { label: 'Command Center', slug: 'command-center' },
            { label: 'Keyboard Shortcuts', slug: 'keyboard-shortcuts' },
          ],
        },
        {
          label: 'Studio & Automation',
          items: [
            { label: 'Studio Overview', slug: 'studio-overview' },
            { label: 'AI Generation', slug: 'ai-generation' },
            { label: 'Ask FlowPilot', slug: 'ask-flowpilot' },
            { label: 'Smart Layout', slug: 'smart-layout' },
            { label: 'Playback & History', slug: 'playback-history' },
            { label: 'Architecture Linting', slug: 'architecture-lint' },
            { label: 'Diagram Diff & Compare', slug: 'diagram-diff' },
          ],
        },
        {
          label: 'Imports & Code Workflows',
          items: [
            { label: 'Choose an Input Mode', slug: 'choose-input-mode' },
            { label: 'OpenFlow DSL', slug: 'openflow-dsl' },
            { label: 'Mermaid Integration', slug: 'mermaid-integration' },
            { label: 'Mermaid vs OpenFlow', slug: 'mermaid-vs-openflow' },
            { label: 'Import from Structured Data', slug: 'import-from-data' },
            { label: 'Infrastructure Sync', slug: 'infra-sync' },
            { label: 'Figma Design Import', slug: 'figma-design-import' },
          ],
        },
        {
          label: 'Templates, Assets & Branding',
          items: [
            { label: 'Templates & Starter Flows', slug: 'templates-assets' },
            { label: 'Design Systems & Branding', slug: 'design-systems-branding' },
          ],
        },
        {
          label: 'Sharing & Export',
          items: [
            { label: 'Collaboration & Sharing', slug: 'collaboration-sharing' },
            { label: 'Choose an Export Format', slug: 'choose-export-format' },
            { label: 'Exporting', slug: 'exporting' },
            { label: 'Embed Diagrams in GitHub', slug: 'github-embed' },
          ],
        },
        {
          label: 'Workflow Guides',
          items: [
            { label: 'AWS Architecture', slug: 'aws-architecture' },
            { label: 'Payment Flow', slug: 'payment-flow' },
            { label: 'Prompting AI Agents', slug: 'prompting-agents' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Roadmap & Release Policy', slug: 'roadmap' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
