import { stat as statPath } from 'node:fs/promises';
import path from 'node:path';
import { acceptsArchitectureFile, discoverArchitecture, type ArchitectureDiscovery } from './agent.js';
import { walkProjectFiles } from './codebaseScanner.js';

/**
 * Architecture discovery lives in the app (src/dsl/discovery) and arrives through
 * the generated bundle. This file is the Node side: walk a checkout, hand the
 * files to the bundle, and re-export its surface for the CLI and the tools.
 */

export {
  acceptsArchitectureFile, capUnits, discoverArchitecture, discoverySummary, discoveryToDsl, driftReport,
  modelFromDocument, modelFromNode, readArchModel, slugDiscoveryId,
} from './agent.js';
export type {
  ArchElementData, ArchFlowData, ArchFlowStepData, ArchModelData, ArchRelationData, ArchViewData,
  ArchitectureDiscovery, DiscoveredRelation, DiscoveredUnit, DiscoveredUnitKind, DiscoveryEvidence,
  DriftChange, DriftFinding, DriftReportResult,
} from './agent.js';

export interface DiscoveryOptions {
  readonly maxFiles?: number;
}

export async function runArchitectureDiscovery(
  rootPath: string,
  options: DiscoveryOptions = {},
): Promise<ArchitectureDiscovery> {
  const resolved = path.resolve(rootPath);
  const stat = await statPath(resolved).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`"${rootPath}" is not a directory.`);

  const { files } = await walkProjectFiles(resolved, options.maxFiles ?? 2000, acceptsArchitectureFile);
  // Evidence paths are POSIX in the DSL and in the report, whatever the host.
  const ordered = files
    .map((file) => ({ path: file.path.split(path.sep).join('/'), content: file.content }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return discoverArchitecture(ordered, path.basename(resolved));
}
