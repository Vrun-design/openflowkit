import { parseMermaid } from '@/lib/mermaidParser';
import type { DiagramPlugin } from './plugin';

export const FLOWCHART_PLUGIN: DiagramPlugin = {
  id: 'flowchart',
  displayName: 'Flowchart',
  parseMermaid: (input) => parseMermaid(input),
};

