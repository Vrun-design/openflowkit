export const PUBLIC_DOC_SECTIONS = [
    {
        title: 'Getting Started',
        items: [
            { title: 'Quick Start', slug: 'quick-start' },
            { title: 'Choose an Input Mode', slug: 'choose-input-mode' },
            { title: 'Import from Structured Data', slug: 'import-from-data' },
            { title: 'Introduction', slug: 'introduction' },
            { title: 'Local-First Diagramming', slug: 'local-first-diagramming' },
        ],
    },
    {
        title: 'Editor Basics',
        items: [
            { title: 'Canvas Basics', slug: 'canvas-basics' },
            { title: 'Diagram Families', slug: 'diagram-families' },
            { title: 'Node Types', slug: 'node-types' },
            { title: 'Properties Panel', slug: 'properties-panel' },
            { title: 'Command Center', slug: 'command-center' },
            { title: 'Keyboard Shortcuts', slug: 'keyboard-shortcuts' },
        ],
    },
    {
        title: 'Studio & Automation',
        items: [
            { title: 'Studio Overview', slug: 'studio-overview' },
            { title: 'AI Generation', slug: 'ai-generation' },
            { title: 'Ask Flowpilot', slug: 'ask-flowpilot' },
            { title: 'Smart Layout', slug: 'smart-layout' },
            { title: 'Playback & History', slug: 'playback-history' },
            { title: 'Architecture Linting', slug: 'architecture-lint' },
            { title: 'Diagram Diff & Compare', slug: 'diagram-diff' },
        ],
    },
    {
        title: 'Imports & Code Workflows',
        items: [
            { title: 'OpenFlow DSL', slug: 'openflow-dsl' },
            { title: 'Mermaid Integration', slug: 'mermaid-integration' },
            { title: 'Mermaid vs OpenFlow', slug: 'mermaid-vs-openflow' },
            { title: 'Infrastructure Sync', slug: 'infra-sync' },
            { title: 'Figma Design Import', slug: 'figma-design-import' },
        ],
    },
    {
        title: 'Templates, Assets & Branding',
        items: [
            { title: 'Templates & Asset Libraries', slug: 'templates-assets' },
            { title: 'Design Systems & Branding', slug: 'design-systems-branding' },
        ],
    },
    {
        title: 'Sharing & Export',
        items: [
            { title: 'Collaboration & Sharing', slug: 'collaboration-sharing' },
            { title: 'Choose an Export Format', slug: 'choose-export-format' },
            { title: 'Exporting', slug: 'exporting' },
            { title: 'Embed Diagrams in GitHub', slug: 'github-embed' },
        ],
    },
    {
        title: 'Workflow Guides',
        items: [
            { title: 'AWS Architecture', slug: 'aws-architecture' },
            { title: 'Payment Flow', slug: 'payment-flow' },
            { title: 'Prompting AI Agents', slug: 'prompting-agents' },
        ],
    },
    {
        title: 'Reference',
        items: [
            { title: 'Roadmap & Release Policy', slug: 'roadmap' },
        ],
    },
];

export function getPublicDocSlugs(sections = PUBLIC_DOC_SECTIONS) {
    const seen = new Set();
    const slugs = [];

    sections.forEach((section) => {
        section.items.forEach((item) => {
            if (seen.has(item.slug)) {
                return;
            }

            seen.add(item.slug);
            slugs.push(item.slug);
        });
    });

    return slugs;
}

export function toStarlightSidebar(sections = PUBLIC_DOC_SECTIONS) {
    return sections.map((section) => ({
        label: section.title,
        items: section.items.map((item) => ({
            label: item.title,
            slug: item.slug,
        })),
    }));
}
