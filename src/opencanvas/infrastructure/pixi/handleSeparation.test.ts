import { describe, expect, it } from 'vitest';
import { connectHandlePoints, pickConnectHandle } from '../../domain/connectors/connectHandles';
import { pickTransformHandle, transformHandlePoints } from './PixiTransformOverlay';

describe('rotate and connect handles', () => {
  it('never share a pick target at any zoom', () => {
    const bounds = { x: 100, y: 100, width: 120, height: 60 };
    for (const zoom of [0.5, 1, 2]) {
      const camera = { x: 0, y: 0, zoom };
      const rotate = transformHandlePoints(bounds, zoom).find(({ handle }) => handle === 'rotate')!.point;
      const top = connectHandlePoints(bounds, zoom).find(({ side }) => side === 'top')!.point;
      const toScreen = (point: { x: number; y: number }) => ({ x: point.x * zoom, y: point.y * zoom });
      expect(pickConnectHandle(bounds, toScreen(rotate), camera)).toBeNull();
      expect(pickTransformHandle(bounds, toScreen(top), camera)).toBeNull();
    }
  });
});
