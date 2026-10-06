import { describe, expect, it } from 'vitest';
import { inspectCode, inspectSelection } from './inspect';
import { createProductionSceneNode } from '../../application/active-document/productionNodeCatalog';
import type { SceneConnector, ScenePage } from '../document/types';

const SOURCE = '%% ofk 1\nflowchart down\ntitle: Auth\n\n  Start -> Login : credentials\n';

function page(): ScenePage {
  const frame = { ...createProductionSceneNode('section', 'f', { x: 100, y: 50 }, 'default'), kind: 'frame' };
  const start = createProductionSceneNode('process', 'start', { x: 10, y: 20 }, 'default');
  const login = createProductionSceneNode('process', 'login', { x: 10, y: 200 }, 'default');
  const edge: SceneConnector = {
    id: 'e', source: { nodeId: 'start', portId: null, anchor: null, point: null },
    target: { nodeId: 'login', portId: null, anchor: null, point: null },
    route: { kind: 'orthogonal', ownership: 'automatic' }, waypoints: [],
    labels: [{ id: 'l', text: 'credentials', pathRatio: 0.5, offset: { x: 0, y: 0 }, metadata: {} }],
    appearance: { markerEnd: 'arrow' }, semantics: {}, metadata: { dsl: { line: 5 } }, extensions: {},
  };
  return {
    id: 'p', name: 'p', diagramKind: 'flowchart',
    layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
    nodes: [
      { ...frame, content: { label: 'Auth' }, metadata: { dsl: { family: 'flowchart', source: SOURCE } } },
      { ...start, parentId: 'f', content: { label: 'Start', shape: 'ellipse' }, appearance: { fill: '#ecfdf5', stroke: '#34d399' },
        metadata: { dsl: { id: 'start', line: 5 } } },
      { ...login, parentId: 'f', content: { label: 'Login', subLabel: 'form' }, metadata: { model: { elementId: 'login' } } },
    ],
    connectors: [edge], metadata: {}, extensions: {},
  };
}

const row = (report: ReturnType<typeof inspectSelection>, section: string, label: string) =>
  report.kind === 'node' || report.kind === 'connector'
    ? report.sections.find((entry) => entry.title === section)?.rows.find((entry) => entry.label === label)?.value
    : undefined;

describe('inspectSelection', () => {
  it('reports a DSL node: world position, resolved style, connections and its source line', () => {
    const report = inspectSelection(page(), ['start'], []);
    expect(report).toMatchObject({ kind: 'node', title: 'Start', subtitle: 'Ellipse', elementId: null });
    expect(row(report, 'Layout', 'X')).toBe('110');
    expect(row(report, 'Layout', 'Y')).toBe('70');
    expect(row(report, 'Layout', 'Parent')).toBe('Auth');
    expect(row(report, 'Layout', 'Locked')).toBe('No');
    expect(row(report, 'Style', 'Fill')).toBe('#ecfdf5');
    expect(row(report, 'Style', 'Stroke')).toMatch(/^#34d399 · /);
    if (report.kind !== 'node') throw new Error('node expected');
    expect(report.connections).toEqual([{ direction: 'out', nodeId: 'login', name: 'Login', label: 'credentials' }]);
    expect(report.code).toEqual({ frameId: 'f', line: 5, text: 'Start -> Login : credentials' });
  });

  it('marks a C4 placement and says nothing about code it did not come from', () => {
    const report = inspectSelection(page(), ['login'], []);
    expect(report).toMatchObject({ kind: 'node', subtitle: 'Process · C4 element', elementId: 'login', code: null });
    expect(row(report, 'Content', 'Description')).toBe('form');
    if (report.kind === 'node') expect(report.connections[0]).toMatchObject({ direction: 'in', name: 'Start' });
  });

  it('reports a connector with its ends, route, arrows and line', () => {
    const report = inspectSelection(page(), [], ['e']);
    expect(report).toMatchObject({ kind: 'connector', title: 'credentials' });
    expect(row(report, 'Connector', 'From')).toBe('Start');
    expect(row(report, 'Connector', 'Route')).toBe('Elbow');
    expect(row(report, 'Connector', 'Arrows')).toBe('none → arrow');
    if (report.kind === 'connector') expect(report.code?.line).toBe(5);
  });

  it('lists several, and is empty for nothing or ids that are gone', () => {
    expect(inspectSelection(page(), ['start', 'login'], ['e'])).toEqual({
      kind: 'many', items: [{ id: 'start', name: 'Start' }, { id: 'login', name: 'Login' }, { id: 'e', name: 'Start → Login' }],
    });
    expect(inspectSelection(page(), [], [])).toEqual({ kind: 'empty' });
    expect(inspectSelection(page(), ['deleted'], [])).toEqual({ kind: 'empty' });
  });
});

describe('inspectCode', () => {
  it('rejects lines the source does not have and survives a parent cycle', () => {
    expect(inspectCode(page(), 99, 'f')).toBeNull();
    expect(inspectCode(page(), 0, 'f')).toBeNull();
    expect(inspectCode(page(), '5', 'f')).toBeNull();
    const looped = page();
    const cyclic = { ...looped, nodes: looped.nodes.map((node) => node.id === 'f' ? node : { ...node, parentId: node.id === 'start' ? 'login' : 'start' }) };
    expect(inspectCode(cyclic, 5, 'start')).toBeNull();
  });
});
