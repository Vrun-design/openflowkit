export type DocSection = {
    title: string;
    items: DocItem[];
};

export type DocItem = {
    title: string;
    slug: string;
};

export const docsNavigation: DocSection[] = [
    {
        title: 'Getting Started',
        items: [
            { title: 'Introduction', slug: 'introduction' },
            { title: 'Quick Start', slug: 'quick-start' },
        ],
    },
    {
        title: 'Core Features',
        items: [
            { title: 'Canvas Basics', slug: 'canvas-basics' },
            { title: 'Node Types', slug: 'node-types' },
            { title: 'Properties Panel', slug: 'properties-panel' },
            { title: 'Command Center', slug: 'command-center' },
        ],
    },
    {
        title: 'Advanced Tools',
        items: [
            { title: 'AI Generation', slug: 'ai-generation' },
            { title: 'Smart Layout', slug: 'smart-layout' },
            { title: 'Playback & History', slug: 'playback-history' },
            { title: 'OpenFlow DSL', slug: 'openflow-dsl' },
        ],
    },
    {
        title: 'Guides',
        items: [
            { title: 'Mermaid Integration', slug: 'mermaid-integration' },
            { title: 'Exporting', slug: 'exporting' },
            { title: 'Keyboard Shortcuts', slug: 'keyboard-shortcuts' },
            { title: 'Theming', slug: 'theming' },
        ],
    },
];
