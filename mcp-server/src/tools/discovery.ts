import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AGENT_OPS } from '../lib/agent.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../lib/version.js';

// Shape words an agent can write inside `[...]` attributes (grammar §5.1).
const SHAPE_WORDS = [
  'rect', 'rounded', 'circle', 'ellipse', 'diamond', 'cylinder', 'hexagon', 'cloud',
  'doc', 'note', 'parallelogram', 'person', 'queue', 'component', 'browser', 'mobile',
  'triangle', 'trapezoid', 'venn', 'speech', 'comment', 'star', 'check-circle',
  'cross-circle', 'heart', 'bolt', 'bookmark', 'bar', 'prism', 'tag', 'chevron',
  'octagon', 'cube', 'target', 'page', 'half-round', 'callout-stack', 'layer-stack',
  'folder', 'panel', 'brace', 'bracket', 'numbered-circle', 'list-card', 'pin',
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'plus', 'stadium',
];

const EDGE_STYLES = [
  { syntax: '->', usage: 'Default directed edge.' },
  { syntax: 'A : label -> B', usage: 'Edge with a label (or `A -> B : label`).' },
  { syntax: '-->', usage: 'Dashed / secondary flow.' },
  { syntax: '<->', usage: 'Bidirectional.' },
  { syntax: '--', usage: 'Undirected.' },
  { syntax: '->>', usage: 'Async (sequence messages).' },
];

const FAMILIES = ['flowchart', 'architecture', 'sequence', 'state', 'erd', 'class', 'gitgraph', 'mindmap'];

const STATIC_TOOLS = [
  'validate_openflow_dsl',
  'analyze_codebase',
  'discover_architecture',
  'drift_report',
  'explain_element',
  'list_starter_templates',
  'get_starter_template',
  'list_diagram_node_types',
  'openflow_create',
  'openflow_open',
  'openflow_save',
  'whoami',
];

export function registerDiscoveryTools(server: McpServer): void {
  server.registerTool(
    'list_diagram_node_types',
    {
      title: 'List OpenFlow DSL shapes, families and edge styles',
      description:
        'Quick reference for the OpenFlow DSL vocabulary: family names, shape words and edge arrows. ' +
        'Call get_syntax for the full grammar.',
    },
    async () => ({
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ families: FAMILIES, shapeWords: SHAPE_WORDS, edgeStyles: EDGE_STYLES }, null, 2),
        },
      ],
    })
  );

  server.registerTool(
    'server_info',
    {
      title: 'Server info',
      description:
        'Return version, capabilities, and a self-test report from the MCP server. ' +
        'Useful when debugging client connections.',
    },
    async () => ({
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              name: MCP_SERVER_NAME,
              version: MCP_SERVER_VERSION,
              localFirst: true,
              modes: ['live-editor (pair with "Connect agent")', 'file (.openflow.json)'],
              tools: [...STATIC_TOOLS, ...AGENT_OPS.map(({ name }) => name)].sort(),
              resources: [
                'openflowkit://docs/grammar',
                'openflowkit://docs/grammar',
                'openflowkit://templates',
                'openflowkit://templates/{name}',
                'openflowkit://icons',
                'openflowkit://icons/{provider}',
              ],
              prompts: [
                'flowchart_from_description',
                'convert_mermaid_to_openflow',
                'architecture_from_codebase',
              ],
            },
            null,
            2
          ),
        },
      ],
    })
  );
}
