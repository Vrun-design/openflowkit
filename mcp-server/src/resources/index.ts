import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findStarterTemplate, STARTER_TEMPLATES } from '../lib/starterTemplates.js';
import { loadGrammar, loadIcons } from '../lib/fileCapabilities.js';

export function registerResources(server: McpServer): void {
  // The canonical grammar, straight from the repository's src/dsl/grammar.md.
  server.registerResource(
    'grammar',
    'openflowkit://docs/grammar',
    {
      title: 'OpenFlow grammar',
      description: 'The complete, versioned OpenFlow DSL reference (family headers, statements, attributes, families, loss tables).',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: await loadGrammar() }],
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
            STARTER_TEMPLATES.map(({ name, title, family, summary }) => ({
              name,
              title,
              family,
              summary,
            })),
            null,
            2
          ),
        },
      ],
    })
  );

  // Full icon catalog — agents can read it once and remember slugs, or use the
  // search_icons / find_icons_for tools for targeted queries.
  server.registerResource(
    'icons-catalog',
    'openflowkit://icons',
    {
      title: 'Provider icon catalog',
      description:
        'Full JSON list of every provider icon available for [architecture] nodes ' +
        '(AWS, Azure, GCP, CNCF, developer brand logos). Each entry has provider, slug, label, category. ' +
        'The 5,000 Standard glyphs are at openflowkit://icons/tabler and in search_icons.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          // Standard glyphs stay out: they would triple what an agent reads here.
          text: JSON.stringify((await loadIcons()).filter(({ provider }) => provider !== 'tabler'), null, 2),
        },
      ],
    })
  );

  server.registerResource(
    'icons-by-provider',
    new ResourceTemplate('openflowkit://icons/{provider}', {
      list: async () => {
        const providers = [...new Set((await loadIcons()).map(({ provider }) => provider))].sort();
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
          const providers = [...new Set((await loadIcons()).map(({ provider }) => provider))].sort();
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
      const icons = (await loadIcons()).filter((icon) => icon.provider === provider);
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
