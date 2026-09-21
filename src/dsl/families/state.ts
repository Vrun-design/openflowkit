import type { SceneNode } from '../../opencanvas/domain/document/types';
import type { DslToken } from '../tokenize';
import type { DslSegment } from '../segments';
import { slugifyDslId } from '../text';
import { compileGraph, graphText, parseGraphStatements } from './graph';
import type { Family, FamilyContext, FamilyScene } from './types';

// The state family: the graph engine plus state vocabulary — `[*]` pseudo-states,
// `state X { … }` composites and fork/join/choice control nodes (grammar §8.4).

const PSEUDO_START = '__state_start__';
const PSEUDO_END = '__state_end__';
const CONTROL_WORDS = new Set(['fork', 'join', 'choice']);
const COMPOSITES = new Set(['state']);

function pseudoTokens(at: DslToken): DslToken[] {
  // `[ellipse, bold, gray, width: 22, height: 22]` — a small filled dot.
  const synthetic: Array<[string, 'word' | 'punctuation']> = [
    ['[', 'punctuation'], ['ellipse', 'word'], [',', 'punctuation'], ['bold', 'word'], [',', 'punctuation'],
    ['gray', 'word'], [',', 'punctuation'], ['width', 'word'], [':', 'punctuation'], ['24', 'word'],
    [',', 'punctuation'], ['height', 'word'], [':', 'punctuation'], ['24', 'word'], [']', 'punctuation'],
  ];
  return synthetic.map(([value, kind]) => ({ ...at, kind, value }));
}

/** `[*]` becomes a sized dot: the initial state before the first arrow, the final one after. */
function rewritePseudoStates(segments: readonly DslSegment[]): DslSegment[] {
  return segments.map((segment) => {
    if (!segment.tokens.some((token) => token.value === '[')) return segment;
    const tokens: DslToken[] = [];
    let afterArrow = false;
    let touched = false;
    for (let index = 0; index < segment.tokens.length; index += 1) {
      const token = segment.tokens[index]!;
      if (token.kind === 'arrow') afterArrow = true;
      if (token.value === '[' && segment.tokens[index + 1]?.value === '*' && segment.tokens[index + 2]?.value === ']') {
        tokens.push({ ...token, kind: 'word', value: afterArrow ? PSEUDO_END : PSEUDO_START }, ...pseudoTokens(token));
        index += 2;
        touched = true;
        continue;
      }
      tokens.push(token);
    }
    return touched ? { ...segment, tokens } : segment;
  });
}

/** `[*]` dots carry no label; fork/join/choice get the filled control look. */
function tagScene(scene: FamilyScene, context: FamilyContext): FamilyScene {
  return {
    ...scene,
    nodes: scene.nodes.map((node): SceneNode => {
      const meta = node.metadata.dsl as Record<string, unknown> | undefined;
      const label = typeof node.content.label === 'string' ? node.content.label : '';
      if (label === PSEUDO_START || label === PSEUDO_END || node.id === slugifyDslId(PSEUDO_START) || node.id === slugifyDslId(PSEUDO_END)) {
        return {
          ...node,
          content: { ...node.content, label: '' },
          metadata: { ...node.metadata, dsl: { ...meta, statePseudo: node.id.endsWith('start') ? 'start' : 'end' } },
        };
      }
      const shape = typeof meta?.shape === 'string' ? meta.shape : '';
      if (CONTROL_WORDS.has(shape)) {
        // Fork/join are bars: the name stays addressable in text but is not drawn.
        const bar = shape === 'fork' || shape === 'join';
        return {
          ...node,
          appearance: { ...context.swatch('slate', 'solid'), strokeWidth: 2, ...(bar ? { textColor: 'transparent' } : {}) },
        };
      }
      return node;
    }),
  };
}

function isComposite(group: SceneNode): boolean {
  const kind = (group.metadata.dsl as { kind?: string } | undefined)?.kind;
  return typeof kind === 'string' && COMPOSITES.has(kind);
}

function isPseudo(node: SceneNode): boolean {
  return typeof (node.metadata.dsl as { statePseudo?: string } | undefined)?.statePseudo === 'string';
}

export const stateFamily: Family = {
  name: 'state',
  async compile(segments, context: FamilyContext) {
    const statements = parseGraphStatements(rewritePseudoStates(segments), context.diagnostics, { reservedRecords: COMPOSITES });
    return tagScene(await compileGraph({ statements, family: 'state' }, context), context);
  },
  serialize: (scene) => graphText(scene, {
    groupKeyword: (group) => (isComposite(group) ? 'state' : 'group'),
    nodeRef: (node) => (isPseudo(node) ? '[*]' : undefined),
  }),
};
