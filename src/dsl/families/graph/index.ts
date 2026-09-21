import type { Family } from '../types';
import { parseGraphStatements } from './parse';
import { compileGraph } from './scene';
import { graphText } from './text';

/**
 * The graph family engine. Flowchart, architecture, state and the reserved
 * families (bpmn, gantt, …) all register it; state overlays its own parser
 * and scene hook, the rest use it as-is.
 */
export const graphFamily: Family = {
  name: 'flowchart',
  async compile(segments, context) {
    const statements = parseGraphStatements(segments, context.diagnostics);
    return compileGraph({ statements, family: 'flowchart' }, context);
  },
  serialize: graphText,
};

export { graphText, parseGraphStatements, compileGraph };
export type { GraphTextOptions } from './text';
