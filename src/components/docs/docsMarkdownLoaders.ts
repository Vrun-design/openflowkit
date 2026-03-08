export const PUBLIC_DOCS_SLUGS = [
  'ai-generation',
  'ask-flowpilot',
  'aws-architecture',
  'canvas-basics',
  'command-center',
  'exporting',
  'introduction',
  'keyboard-shortcuts',
  'mermaid-integration',
  'mermaid-vs-openflow',
  'node-types',
  'openflow-dsl',
  'payment-flow',
  'playback-history',
  'prompting-agents',
  'properties-panel',
  'quick-start',
  'roadmap',
  'smart-layout',
  'theming',
  'v1-beta-launch',
] as const;

export const PUBLIC_DOCS_GLOB_PATTERNS = [
  '/docs/en/{ai-generation,ask-flowpilot,aws-architecture,canvas-basics,command-center,exporting,introduction,keyboard-shortcuts,mermaid-integration,mermaid-vs-openflow,node-types,openflow-dsl,payment-flow,playback-history,prompting-agents,properties-panel,quick-start,roadmap,smart-layout,theming,v1-beta-launch}.md',
  '/docs/tr/{ai-generation,ask-flowpilot,aws-architecture,canvas-basics,command-center,exporting,introduction,keyboard-shortcuts,mermaid-integration,mermaid-vs-openflow,node-types,openflow-dsl,payment-flow,playback-history,prompting-agents,properties-panel,quick-start,roadmap,smart-layout,theming,v1-beta-launch}.md',
];

export const docsMarkdownLoaders = import.meta.glob([
  '/docs/en/{ai-generation,ask-flowpilot,aws-architecture,canvas-basics,command-center,exporting,introduction,keyboard-shortcuts,mermaid-integration,mermaid-vs-openflow,node-types,openflow-dsl,payment-flow,playback-history,prompting-agents,properties-panel,quick-start,roadmap,smart-layout,theming,v1-beta-launch}.md',
  '/docs/tr/{ai-generation,ask-flowpilot,aws-architecture,canvas-basics,command-center,exporting,introduction,keyboard-shortcuts,mermaid-integration,mermaid-vs-openflow,node-types,openflow-dsl,payment-flow,playback-history,prompting-agents,properties-panel,quick-start,roadmap,smart-layout,theming,v1-beta-launch}.md',
], {
  query: '?raw',
  import: 'default',
});
