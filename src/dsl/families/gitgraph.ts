import type { SceneConnector, SceneNode } from '../../opencanvas/domain/document/types';
import type { Point2d } from '../../opencanvas/domain/geometry/types';
import type { PaletteKey } from '../../opencanvas/domain/nodes/nodePalette';
import { measurePortableText } from '../../opencanvas/domain/text/measurement';
import type { DslDiagnostic } from '../ast';
import { nonVisualAttributes, readAttributes, typedFrom } from '../attributes';
import { tokenDiagnostic } from '../diagnostics';
import { attrsToJson, dslFrameRaw, type CanonicalAttribute, type DslFrameScene } from '../sceneMeta';
import { joinTokens, type DslSegment } from '../segments';
import { attributeText, quote, slugifyDslId } from '../text';
import { sortAttributes } from '../vocabulary';
import type { Family, FamilyContext, FamilyScene } from './types';

// The git graph family: imperative commit/branch/checkout/merge lines become a
// lane diagram (branch = lane, commit = column) with no layout engine involved.

const COLUMN_MIN = 96;
const COLUMN_GAP = 22;
const LANE_GAP = 96;
const DOT = 20;
const LABEL_HEIGHT = 18;
const LABEL_TOP = 8;
const TAG_HEIGHT = 16;
const PADDING = { top: 88, right: 64, bottom: 56, left: 56 };
const TITLE_EXTRA = 24;
const LANE_KEYS: readonly PaletteKey[] = ['blue', 'emerald', 'amber', 'red', 'violet', 'cyan', 'pink', 'yellow', 'slate'];
const FLAG_WORDS = new Set(['highlight', 'revert']);

interface BranchDraft {
  name: string;
  lane: number;
  line: number;
  /** Document order, for statements that share a line. */
  seq: number;
  /** Commit the branch was created from; the lane's first segment starts here. */
  from?: string;
}

interface CommitDraft {
  id: string;
  line: number;
  seq: number;
  column: number;
  branch: string;
  op: 'commit' | 'merge' | 'cherry-pick';
  label?: string;
  tag?: string;
  type?: 'highlight' | 'revert';
  merged?: string;
  pick?: string;
  attrs: CanonicalAttribute[];
  comments: string[];
}

interface GitgraphModel {
  branches: BranchDraft[];
  commits: CommitDraft[];
  checkouts: Array<{ line: number; name: string }>;
}

function parseGitgraph(segments: readonly DslSegment[], context: FamilyContext): GitgraphModel {
  const branches: BranchDraft[] = [{ name: 'main', lane: 0, line: 0, seq: 0 }];
  const branchByName = new Map<string, BranchDraft>([['main', branches[0]!]]);
  const commits: CommitDraft[] = [];
  const commitBySlug = new Map<string, CommitDraft>();
  const checkouts: Array<{ line: number; name: string; seq: number }> = [];
  let seq = 0;
  const fail = (segment: DslSegment, code: DslDiagnostic['code'], message: string, hint?: string): void => {
    context.diagnostics.push(tokenDiagnostic(code, 'warning', segment.tokens[0], message, hint));
  };
  const tipOf = (branch: string) => [...commits].reverse().find((commit) => commit.branch === branch);
  const uniqueCommitId = (label: string | undefined): string => {
    const base = label ? slugifyDslId(label) : `commit-${commits.length + 1}`;
    let id = base;
    let suffix = 2;
    while (commitBySlug.has(id)) id = `${base}-${suffix++}`;
    return id;
  };
  let active = 'main';

  for (const segment of segments) {
    const claimed = context.comments.claim(segment.line);
    if (segment.tokens[0]?.kind === 'comment' || segment.closes || segment.tokens.length === 0) continue;
    const keyword = segment.tokens[0]!.value;
    const parsed = readAttributes(segment.tokens.slice(1), context.diagnostics);
    const name = joinTokens(parsed.body.filter((token) => token.kind !== 'comment'));
    const findAttr = (key: string) => parsed.attributes.find((attribute) => attribute.key?.toLowerCase() === key)?.value;
    const label = findAttr('label');
    const tag = findAttr('tag');
    // `label:`, `tag:` and the flag words are modelled on the record itself.
    const withoutLabel = (): CanonicalAttribute[] => parsed.attributes.filter((attribute) => (
      !(attribute.key === 'label' || attribute.key === 'tag')
      && !(!attribute.key && FLAG_WORDS.has(attribute.value.toLowerCase()))
    ));

    if (keyword === 'commit') {
      const flag = parsed.attributes.find((attribute) => !attribute.key && FLAG_WORDS.has(attribute.value.toLowerCase()))?.value.toLowerCase();
      const id = uniqueCommitId(label ?? name);
      const commit: CommitDraft = {
        id, line: segment.line, seq: seq++, column: commits.length, branch: active, op: 'commit',
        ...(label ?? name ? { label: label ?? name } : {}),
        ...(tag ? { tag } : {}),
        ...(flag === 'highlight' || flag === 'revert' ? { type: flag } : {}),
        attrs: withoutLabel(), comments: claimed,
      };
      commits.push(commit);
      commitBySlug.set(id, commit);
      continue;
    }
    if (keyword === 'cherry-pick') {
      const picked = commitBySlug.get(slugifyDslId(name));
      if (!name || !picked) {
        fail(segment, name ? 'W150' : 'W101', name ? `Unknown commit ${name}; cherry-pick ignored` : 'cherry-pick needs a commit to pick', 'commit labels become slugs');
        continue;
      }
      const inherited = picked.label;
      const id = uniqueCommitId(label ?? inherited);
      const commit: CommitDraft = {
        id, line: segment.line, seq: seq++, column: commits.length, branch: active, op: 'cherry-pick',
        ...(label ?? inherited ? { label: label ?? inherited } : {}), ...(tag ? { tag } : {}), pick: picked.id,
        attrs: withoutLabel(), comments: claimed,
      };
      commits.push(commit);
      commitBySlug.set(id, commit);
      continue;
    }
    if (keyword === 'branch') {
      if (!name) {
        fail(segment, 'W101', 'branch needs a name', 'branch feature');
        continue;
      }
      if (branchByName.has(name)) {
        fail(segment, 'W150', `Branch ${name} already exists; branch ignored`);
        continue;
      }
      const from = tipOf(active);
      const branch: BranchDraft = { name, lane: branches.length, line: segment.line, seq: seq++, ...(from ? { from: from.id } : {}) };
      branches.push(branch);
      branchByName.set(name, branch);
      // `branch` creates and switches, as Mermaid's gitGraph does; `checkout` moves back.
      active = name;
      continue;
    }
    if (keyword === 'checkout' || keyword === 'switch') {
      const branch = branchByName.get(name);
      if (!branch) {
        fail(segment, name ? 'W150' : 'W101', name ? `Unknown branch ${name}; ${keyword} ignored` : `${keyword} needs a branch name`, branches.map((item) => item.name).join(', '));
        continue;
      }
      active = branch.name;
      checkouts.push({ line: segment.line, name: branch.name, seq: seq++ });
      continue;
    }
    if (keyword === 'merge') {
      const branch = branchByName.get(name);
      if (!branch) {
        fail(segment, name ? 'W150' : 'W101', name ? `Unknown branch ${name}; merge ignored` : 'merge needs a branch name', branches.map((item) => item.name).join(', '));
        continue;
      }
      const id = uniqueCommitId(label ?? `merge ${name}`);
      const commit: CommitDraft = {
        id, line: segment.line, seq: seq++, column: commits.length, branch: active, op: 'merge', merged: name,
        ...(label ? { label } : {}), ...(tag ? { tag } : {}),
        attrs: withoutLabel(), comments: claimed,
      };
      commits.push(commit);
      commitBySlug.set(id, commit);
      continue;
    }
    fail(segment, 'W101', `Unknown git statement ${keyword}`, 'commit, branch, checkout, switch, merge, cherry-pick');
  }
  return { branches, commits, checkouts };
}

/** The text renderer wraps at `size.width - 16`, so every box carries that margin. */
function labelWidth(label: string, fontSize = 12): number {
  return Math.round(measurePortableText(label, { fontSize, fontWeight: 600, overflow: 'visible' }).width) + 20;
}

function materialize(model: GitgraphModel, context: FamilyContext): FamilyScene {
  const { origin } = context;
  const topPad = PADDING.top + (context.title ? TITLE_EXTRA : 0);
  const laneOf = (name: string) => model.branches.find((branch) => branch.name === name)?.lane ?? 0;
  const colorOf = (name: string): PaletteKey => LANE_KEYS[laneOf(name) % LANE_KEYS.length]!;
  // Each column is as wide as its widest label, so nothing collides.
  const columnWidth = model.commits.map((commit) => Math.max(COLUMN_MIN, (commit.label ? labelWidth(commit.label) : 0) + COLUMN_GAP));
  const columnX: number[] = [];
  let cursor = PADDING.left;
  for (const width of columnWidth) {
    columnX.push(cursor);
    cursor += width;
  }
  const dotAt = (commit: CommitDraft): Point2d => ({
    x: columnX[commit.column] ?? PADDING.left,
    y: topPad + laneOf(commit.branch) * LANE_GAP,
  });
  const nodes: SceneNode[] = [];
  const connectors: SceneConnector[] = [];

  for (const commit of model.commits) {
    const point = dotAt(commit);
    const colorKey = colorOf(commit.branch);
    const attrs = nonVisualAttributes(typedFrom(commit.attrs), 'node');
    nodes.push({
      id: commit.id, kind: 'process', parentId: null, layerId: 'default', zIndex: 1,
      transform: { translation: point, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width: DOT, height: DOT },
      content: { label: '', shape: 'circle' },
      appearance: {
        fill: context.swatch(colorKey, 'solid').fill,
        stroke: context.swatch(colorKey, 'solid').stroke,
        textColor: '#ffffff',
        strokeWidth: 2,
      },
      ports: [],
      metadata: {
        dsl: {
          id: commit.id, line: commit.line, gitKind: 'commit', gitOp: commit.op, gitBranch: commit.branch,
          ...(commit.label ? { gitLabel: commit.label } : {}),
          ...(commit.tag ? { gitTag: commit.tag } : {}),
          ...(commit.type ? { gitType: commit.type } : {}),
          ...(commit.merged ? { gitMerged: commit.merged } : {}),
          ...(commit.pick ? { gitPicked: commit.pick } : {}),
          ...(attrs.length ? { attrs: attrsToJson(attrs) } : {}),
          ...(commit.comments.length ? { comments: commit.comments } : {}),
        },
      },
      extensions: {},
    });
    if (commit.label) {
      // Below the dot, so the lane line never crosses the message.
      const width = labelWidth(commit.label);
      nodes.push({
        id: `${commit.id}-label`, kind: 'text', parentId: null, layerId: 'default', zIndex: 0,
        transform: { translation: { x: point.x + DOT / 2 - width / 2, y: point.y + DOT + LABEL_TOP }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        size: { width, height: LABEL_HEIGHT },
        content: { label: commit.label, color: 'slate', fontSize: 12, fontFamily: 'inter', fontWeight: '500' },
        appearance: {}, ports: [],
        metadata: { dsl: { id: `${commit.id}-label`, line: commit.line, gitKind: 'label' } },
        extensions: {},
      });
    }
    if (commit.tag) {
      const width = Math.max(48, labelWidth(commit.tag, 10));
      nodes.push({
        id: `${commit.id}-tag`, kind: 'text', parentId: null, layerId: 'default', zIndex: 0,
        transform: { translation: { x: point.x + DOT / 2 - width / 2, y: point.y - TAG_HEIGHT - 6 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        size: { width, height: TAG_HEIGHT },
        content: { label: commit.tag, color: colorKey, fontSize: 10, fontFamily: 'mono', fontWeight: '700' },
        appearance: {}, ports: [],
        metadata: { dsl: { id: `${commit.id}-tag`, line: commit.line, gitKind: 'tag' } },
        extensions: {},
      });
    }
  }

  const link = (id: string, from: CommitDraft, to: CommitDraft, colorKey: PaletteKey, curved: boolean, dashed = false) => {
    const start = dotAt(from);
    const end = dotAt(to);
    // S-curve inside the gap between the two columns, like a git lane change.
    // Waypoints are page coordinates; node translations are frame-relative.
    const mid = (start.x + end.x) / 2 + DOT / 2 + origin.x;
    const waypoints: Point2d[] = curved
      ? [{ x: mid, y: start.y + DOT / 2 + origin.y }, { x: mid, y: end.y + DOT / 2 + origin.y }]
      : [];
    connectors.push({
      id, source: { nodeId: from.id, portId: null, anchor: null, point: null },
      target: { nodeId: to.id, portId: null, anchor: null, point: null },
      route: { kind: curved ? 'bezier' : 'polyline', ownership: 'imported-fixed' }, waypoints, labels: [],
      appearance: { stroke: context.swatch(colorKey, 'solid').fill, strokeWidth: 2, ...(dashed ? { dashPattern: 'dashed' } : {}) },
      semantics: {}, metadata: { dsl: { gitKind: 'lane' } }, extensions: {},
    });
  };

  for (const branch of model.branches) {
    const onBranch = model.commits.filter((commit) => commit.branch === branch.name);
    const fork = branch.from ? model.commits.find((commit) => commit.id === branch.from) : undefined;
    const chain = fork ? [fork, ...onBranch] : onBranch;
    for (let index = 1; index < chain.length; index += 1) {
      const from = chain[index - 1]!;
      const to = chain[index]!;
      link(`git:lane:${from.id}->${to.id}`, from, to, colorOf(branch.name), from.branch !== to.branch);
    }
  }
  for (const commit of model.commits) {
    if (commit.op === 'merge' && commit.merged) {
      const tip = [...model.commits].reverse().find((candidate) => candidate.branch === commit.merged);
      if (tip) link(`git:merge:${tip.id}->${commit.id}`, tip, commit, colorOf(commit.merged), true);
    }
    if (commit.op === 'cherry-pick' && commit.pick) {
      const picked = model.commits.find((candidate) => candidate.id === commit.pick);
      if (picked) link(`git:pick:${picked.id}->${commit.id}`, picked, commit, colorOf(picked.branch), true, true);
    }
  }

  // Node translations stay frame-relative; connector waypoints are page coordinates.
  const positioned = nodes;
  const right = Math.max(360, ...positioned.map((node) => node.transform.translation.x + node.size.width)) + PADDING.right;
  const bottom = Math.max(260, ...positioned.map((node) => node.transform.translation.y + node.size.height)) + PADDING.bottom;
  return {
    nodes: positioned,
    connectors,
    size: { width: right, height: bottom },
    meta: {
      gitBranches: model.branches.map((branch) => ({ name: branch.name, line: branch.line, lane: branch.lane, ...(branch.from ? { from: branch.from } : {}) })),
      gitCheckouts: model.checkouts.map((checkout) => ({ ...checkout })),
    },
  };
}

function gitText(scene: DslFrameScene): string[] {
  const raw = dslFrameRaw(scene.frame);
  const branchRecords = Array.isArray(raw.gitBranches) ? raw.gitBranches as Array<Record<string, unknown>> : [];
  const checkouts = Array.isArray(raw.gitCheckouts) ? raw.gitCheckouts as Array<Record<string, unknown>> : [];
  const events: Array<{ line: number; order: number; text: string }> = [];
  let order = 0;
  for (const record of branchRecords) {
    const name = typeof record.name === 'string' ? record.name : '';
    if (!name || name === 'main') continue;
    events.push({ line: Number(record.line ?? 0), order: order++, text: `branch ${quote(name)}` });
  }
  for (const record of checkouts) {
    if (typeof record.name !== 'string') continue;
    events.push({ line: Number(record.line ?? 0), order: order++, text: `checkout ${quote(record.name)}` });
  }
  for (const node of scene.nodes) {
    const meta = node.metadata.dsl as Record<string, unknown> | undefined;
    if (meta?.gitKind !== 'commit') continue;
    const label = typeof meta.gitLabel === 'string' ? meta.gitLabel : '';
    const attrs: CanonicalAttribute[] = [];
    if (typeof meta.gitTag === 'string' && meta.gitTag) attrs.push({ key: 'tag', value: meta.gitTag });
    if (meta.gitType === 'highlight' || meta.gitType === 'revert') attrs.push({ value: meta.gitType });
    if (Array.isArray(meta.attrs)) attrs.push(...(meta.attrs as CanonicalAttribute[]));
    const line = Number(meta.line ?? 0);
    if (meta.gitOp === 'merge' && typeof meta.gitMerged === 'string') {
      const mergeAttrs: CanonicalAttribute[] = label ? [{ key: 'label', value: label }, ...attrs] : attrs;
      events.push({ line, order: order++, text: `merge ${quote(meta.gitMerged)}${attributeText(sortAttributes(mergeAttrs))}` });
      continue;
    }
    if (meta.gitOp === 'cherry-pick' && typeof meta.gitPicked === 'string') {
      events.push({ line, order: order++, text: `cherry-pick ${quote(meta.gitPicked)}${attributeText(sortAttributes(attrs))}` });
      continue;
    }
    events.push({ line, order: order++, text: `commit${label ? ` ${quote(label)}` : ''}${attributeText(sortAttributes(attrs))}` });
  }
  return events.sort((a, b) => a.line - b.line || a.order - b.order).map((event) => event.text);
}

export const gitgraphFamily: Family = {
  name: 'gitgraph',
  async compile(segments, context) {
    return materialize(parseGitgraph(segments, context), context);
  },
  serialize: gitText,
};
