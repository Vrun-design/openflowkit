import { describe, expect, it } from 'vitest';
import type { SceneConnector } from '../document/types';
import { resolveConnectorLabelStyle } from './labelStyle';

function connector(appearance: SceneConnector['appearance']): SceneConnector {
  return {
    id: 'c', source: { nodeId: 'a', portId: null, anchor: null, point: null },
    target: { nodeId: 'b', portId: null, anchor: null, point: null },
    route: { kind: 'orthogonal', ownership: 'automatic' }, waypoints: [], labels: [],
    appearance, semantics: {}, metadata: {}, extensions: {},
  };
}

describe('resolveConnectorLabelStyle', () => {
  it('defaults to the 11px plate label', () => {
    expect(resolveConnectorLabelStyle(connector({}))).toMatchObject({
      fill: '#ffffff', stroke: '#e2e8f0', textColor: '#334155', fontSize: 11, fontWeight: 600, fontFamily: 'sans',
    });
  });
  it('reads label* keys', () => {
    expect(resolveConnectorLabelStyle(connector({
      labelBackground: 'transparent', labelColor: '#ff0000', labelFontSize: 14, labelFontFamily: 'mono', labelFontStyle: 'italic',
    }))).toMatchObject({ fill: 'transparent', textColor: '#ff0000', fontSize: 14, fontFamily: 'mono', fontStyle: 'italic' });
  });
});
