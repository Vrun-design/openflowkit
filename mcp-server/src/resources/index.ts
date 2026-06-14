import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findStarterTemplate, STARTER_TEMPLATES } from '../lib/starterTemplates.js';
import { getAllIcons, getIconProviders, getIconsByProvider } from '../lib/iconCatalog.js';

const DSL_CHEATSHEET = `# OpenFlow DSL Cheatsheet

flow: <Title>            # required header
direction: TB | LR       # default TB

# Nodes (declare before edges)
[start] s1
[end]   e1
[process]      step1: Friendly Label { color: "blue" }
[decision]     branch: Approved?     { color: "amber" }
[system]       api:    Internal API
[architecture] db:     Postgres     { archProvider: "aws", archResourceType: "databases-rds" }
[browser]      web:    Dashboard
[mobile]       app:    Mobile App
[note]         n:      Latency 200ms

# Edges
s1 -> step1                 # default
step1 ==> api               # primary path
api  --> db                 # secondary
api  ..|error| n            # async / dotted
branch ->|Yes| step1
branch ->|No|  e1

# Architecture icons
# Use the [architecture] node type with archProvider + archResourceType attributes
# to render a real provider icon (AWS, Azure, GCP, CNCF, or developer brand logos).
# Always call the find_icon tool to discover the correct slug; do not guess.
# Providers: aws, azure, gcp, cncf, developer
# Catalog resource: openflowkit://icons (full) or openflowkit://icons/{provider} (per pack)
`;

export function registerResources(server: McpServer): void {
  // Static cheatsheet — agents read it once to learn DSL surface.
  server.registerResource(
    'dsl-cheatsheet',
    'openflowkit://docs/dsl-cheatsheet',
    {
      title: 'OpenFlow DSL Cheatsheet',
      description: 'Quick reference for OpenFlow DSL node types, attributes, and edge styles.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: DSL_CHEATSHEET,
        },
      ],
    })
  );

  // Templates exposed both as a catalog and via per-name URI template.
  server.registerResource(
    'templates-catalog',
    'openflowkit://templates',
    {
      title: 'Starter template catalog',
      description: 'JSON list of all available starter templates (name, title, category, summary).',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            STARTER_TEMPLATES.map(({ name, title, category, summary }) => ({
              name,
              title,
              category,
              summary,
            })),
            null,
            2
          ),
        },
      ],
    })
  );

  // Full icon catalog — agents can read it once and remember slugs, or prefer the
  // find_icon tool for targeted queries.
  server.registerResource(
    'icons-catalog',
    'openflowkit://icons',
    {
      title: 'Provider icon catalog',
      description:
        'Full JSON list of every provider icon available for [architecture] nodes ' +
        '(AWS, Azure, GCP, CNCF, developer brand logos). Each entry has provider, slug, label, category.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(await getAllIcons(), null, 2),
        },
      ],
    })
  );

  server.registerResource(
    'icons-by-provider',
    new ResourceTemplate('openflowkit://icons/{provider}', {
      list: async () => {
        const providers = await getIconProviders();
        return {
          resources: providers.map((provider) => ({
            uri: `openflowkit://icons/${provider}`,
            name: `icons-${provider}`,
            title: `${provider} icons`,
            description: `Icon catalog for the ${provider} provider pack.`,
            mimeType: 'application/json',
          })),
        };
      },
      complete: {
        provider: async (value) => {
          const providers = await getIconProviders();
          return providers.filter((p) => p.startsWith(value.toLowerCase()));
        },
      },
    }),
    {
      title: 'Provider icon catalog (per pack)',
      description: 'JSON list of icons within a single provider pack.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const provider = String(variables.provider ?? '').toLowerCase();
      const icons = await getIconsByProvider(provider);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(icons, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    'template',
    new ResourceTemplate('openflowkit://templates/{name}', {
      list: async () => ({
        resources: STARTER_TEMPLATES.map((template) => ({
          uri: `openflowkit://templates/${template.name}`,
          name: template.name,
          title: template.title,
          description: template.summary,
          mimeType: 'text/plain',
        })),
      }),
      complete: {
        name: async (value) =>
          STARTER_TEMPLATES.filter((template) =>
            template.name.toLowerCase().startsWith(value.toLowerCase())
          ).map((template) => template.name),
      },
    }),
    {
      title: 'Starter template DSL',
      description: 'Returns the OpenFlow DSL body of the named starter template.',
      mimeType: 'text/plain',
    },
    async (uri, variables) => {
      const name = String(variables.name ?? '');
      const template = findStarterTemplate(name);
      if (!template) {
        throw new Error(`Unknown template "${name}".`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: template.dsl,
          },
        ],
      };
    }
  );
}
