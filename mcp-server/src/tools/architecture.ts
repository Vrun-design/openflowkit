// Phase 5.6: discovery, drift and element explanations over the C4 model.
// Discovery is deterministic and local; drift diffs a model (DSL or a stored
// document) against what the repo actually contains.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { compileWorkspace, lintDsl } from '../lib/agent.js';
import {
  discoverySummary, discoveryToDsl, driftReport, modelFromDocument, modelFromNode,
  runArchitectureDiscovery, type ArchElementData, type ArchModelData,
} from '../lib/architectureDiscovery.js';
import type { DocumentStore } from '../lib/documentStore.js';
import { describeError, toolError } from '../lib/errors.js';

function text(payload: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

const pathField = z.string().min(1).describe('Absolute or cwd-relative path to the repository root.');
const dslField = z.string().min(1).optional().describe('Inline OFK architecture workspace; wins over documentId.');
const documentIdField = z.string().min(1).optional()
  .describe('File-mode document id from openflow_open; defaults to the first open document.');

/** The model a drift/explain call is about: inline DSL, a stored document, or the repo's architecture.ofk. */
async function modelForInput(
  input: { dsl?: string | undefined; documentId?: string | undefined; path?: string | undefined },
  store: DocumentStore,
): Promise<ArchModelData | null> {
  if (input.dsl) {
    const workspace = await compileWorkspace(input.dsl);
    for (const view of workspace.views) {
      const model = modelFromNode(view.result.frame);
      if (model) return model;
    }
    return null;
  }
  const id = input.documentId ?? store.list()[0]?.id;
  if (id) return modelFromDocument(store.get(id));
  if (input.path) {
    const source = await readFile(path.join(path.resolve(input.path), 'architecture.ofk'), 'utf8');
    const workspace = await compileWorkspace(source);
    for (const view of workspace.views) {
      const model = modelFromNode(view.result.frame);
      if (model) return model;
    }
  }
  return null;
}

function findElement(model: ArchModelData, elementId: string): ArchElementData | null {
  const exact = model.elements.find((element) => element.id === elementId);
  if (exact) return exact;
  const wanted = elementId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  return model.elements.find((element) => element.name.toLowerCase().replace(/[^a-z0-9]+/g, '') === wanted) ?? null;
}

/** ADR markdown files whose basename matches one of the element's links. */
async function linkedAdrs(rootPath: string, links: readonly string[]): Promise<Array<{ link: string; file: string; markdown: string }>> {
  if (links.length === 0) return [];
  const dir = path.join(path.resolve(rootPath), 'adr');
  const names = await readdir(dir).catch(() => [] as string[]);
  const adrs: Array<{ link: string; file: string; markdown: string }> = [];
  for (const link of links) {
    const wanted = path.posix.basename(link.replace(/\\/g, '/'));
    const file = names.find((name) => name === wanted || name.replace(/\.md$/i, '') === wanted.replace(/\.md$/i, ''));
    if (!file) continue;
    const markdown = await readFile(path.join(dir, file), 'utf8').catch(() => '');
    adrs.push({ link, file: `adr/${file}`, markdown: markdown.slice(0, 8000) });
  }
  return adrs;
}

export function registerArchitectureTools(server: McpServer, store: DocumentStore): void {
  server.registerTool(
    'discover_architecture',
    {
      title: 'Discover architecture from a repository',
      description:
        'Walk a local repo (compose, Dockerfiles, k8s, terraform, package manifests, datastore and ' +
        'HTTP-client usage) and return a proposed OFK C4 workspace as DSL, with evidence per unit. ' +
        'Deterministic, offline; review the proposal before committing it.',
      inputSchema: {
        path: pathField,
        name: z.string().min(1).optional().describe('System name; defaults to the repo directory name.'),
        maxFiles: z.number().int().min(1).max(5000).optional().describe('Cap on files scanned. Defaults to 2000.'),
      },
    },
    async ({ path: rootPath, name, maxFiles }) => {
      try {
        const discovery = await runArchitectureDiscovery(rootPath, maxFiles ? { maxFiles } : {});
        const dsl = discoveryToDsl(discovery, name ?? path.basename(path.resolve(rootPath)));
        return text({
          summary: discoverySummary(discovery),
          dsl,
          units: discovery.units.length,
          relations: discovery.relations.length,
          diagnostics: lintDsl(dsl).diagnostics,
        });
      } catch (error) {
        return toolError(`Architecture discovery failed: ${describeError(error)}`);
      }
    },
  );

  server.registerTool(
    'drift_report',
    {
      title: 'Architecture drift report',
      description:
        'Compare an architecture model (inline dsl, or an open document) against a repository. ' +
        'Returns missing (in repo, not in model), undrawn (in model, no repo evidence) and changed ' +
        '(name matches, tech or dir differs) with evidence lines.',
      inputSchema: { path: pathField, dsl: dslField, documentId: documentIdField },
    },
    async ({ path: rootPath, dsl, documentId }) => {
      try {
        const discovery = await runArchitectureDiscovery(rootPath);
        const model = await modelForInput({ dsl, documentId, path: rootPath }, store);
        if (!model) throw new Error('No C4 model found: pass dsl, open a document, or put architecture.ofk in the repo.');
        const report = driftReport(model, discovery);
        return text({
          ...report,
          checked: model.elements.length,
          drift: report.missing.length + report.undrawn.length + report.changed.length > 0,
          hint: 'missing → add to the model; undrawn → delete or accept as future state; changed → update tech.',
        });
      } catch (error) {
        return toolError(`Drift report failed: ${describeError(error)}`);
      }
    },
  );

  server.registerTool(
    'explain_element',
    {
      title: 'Explain a model element',
      description:
        'Everything known about one element: the model entry, its relations, repository evidence ' +
        '(when a path is given) and the ADR markdown files its links point at.',
      inputSchema: {
        elementId: z.string().min(1).describe('Element id (shop.api) or display name.'),
        path: pathField.optional(),
        dsl: dslField,
        documentId: documentIdField,
      },
    },
    async ({ elementId, path: rootPath, dsl, documentId }) => {
      try {
        const model = await modelForInput({ dsl, documentId, path: rootPath }, store);
        if (!model) throw new Error('No C4 model found: pass dsl, open a document, or point path at a repo with architecture.ofk.');
        const element = findElement(model, elementId);
        if (!element) throw new Error(`Element "${elementId}" is not in the model.`);
        const relations = model.relations.filter((relation) => relation.from === element.id || relation.to === element.id);

        let evidence: unknown[] = [];
        let adrs: Awaited<ReturnType<typeof linkedAdrs>> = [];
        if (rootPath) {
          const discovery = await runArchitectureDiscovery(rootPath);
          const wanted = element.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
          const unit = discovery.units.find((candidate) => candidate.id === element.id
            || candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, '') === wanted);
          evidence = unit ? [...unit.evidence] : [];
          adrs = await linkedAdrs(rootPath, element.links);
        }
        return text({ element, relations, evidence, adrs });
      } catch (error) {
        return toolError(`Explain element failed: ${describeError(error)}`);
      }
    },
  );
}
