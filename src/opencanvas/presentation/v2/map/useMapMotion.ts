import { useEffect, useRef, useState, type RefObject } from 'react';
import type { LaidRect } from '../../../../dsl/map/elk';
import type { MapModel } from '../../../../dsl/map/types';
import { MOVE_MS } from '../../../application/map/geometry';
import { absoluteRects } from '../../../application/map/motionFrame';
import { cullMotion, movedView } from '../../../application/map/motionCull';
import { MapMotionPlayer } from '../../../application/map/motionPlayer';
import { planMotion } from '../../../application/map/planMotion';
import type { CanvasCamera } from '../../../domain/camera/types';
import type { SceneNode, ScenePage } from '../../../domain/document/types';
import type { PixiRendererHost } from '../../../infrastructure/pixi/PixiRendererHost';
import { clearance, landOn, mapCamera, sceneExtent, type TaggedScene } from './mapMode';

interface Options {
  readonly mapPage: ScenePage | null;
  /** What the canvas draws while no map is laid out yet; it is never moved to or from. */
  readonly emptyPage: ScenePage;
  readonly scene: TaggedScene<unknown> | null;
  readonly model: MapModel | null;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly updateCamera: (camera: CanvasCamera) => void;
  /** Tells the hook which layout the host now shows: the latest one asked for (nothing to draw) or the one that landed. */
  readonly markShown: (layout: 'asked' | 'landed') => void;
  /** The box a click just opened or closed: the camera brings it into view when its layout arrives; `id: null` re-fits the whole map like entering it (a depth preset). */
  readonly focusRef: RefObject<{ id: string | null } | null>;
}

const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Drives what the canvas shows of a map: the host has already taken the new scene (the canvas effect runs first), so its
 * index is the target and clicks land on it. From here only the picture moves, from where each box is drawn to where it
 * now belongs, and the camera lands (a new map) or follows the focus (a box just opened).
 */
export function useMapMotion({ mapPage, emptyPage, scene, model, hostRef, cameraRef, updateCamera, markShown, focusRef }: Options) {
  // How often the editor page rendered: a move must not add one per frame (counted for the test hook).
  const renders = useRef(0);
  useEffect(() => { renders.current += 1; });
  const updateRef = useRef(updateCamera);
  useEffect(() => { updateRef.current = updateCamera; });
  const mine = useRef<CanvasCamera | null>(null);
  // The sink reads the refs when a frame runs, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [player] = useState(() => {
    const self: MapMotionPlayer = new MapMotionPlayer({
      frame: (frame, camera) => {
        const host = hostRef.current;
        if (!host) return;
        if (camera) {
          // The reader moved the camera mid-move (wheel, drag, buttons): it is theirs now.
          if (cameraRef.current !== mine.current) self.releaseCam();
          else { mine.current = camera; cameraRef.current = camera; host.setCamera(camera); }
        }
        host.drawMotionFrame(frame);
      },
      end: (settled, camera) => {
        hostRef.current?.endMotion(settled);
        // Cut short mid-move: React still has to learn where the camera was left.
        if (!settled && camera) updateRef.current(camera);
      },
    });
    return self;
  });
  useEffect(() => () => player.stop(), [player]);
  const shown = useRef<{ page: ScenePage; rects: Map<string, LaidRect>; chain: number | undefined } | null>(null);
  // Every box drawn now or still folding away, by id: the leaving ones are no longer in the scene.
  const drawn = useRef(new Map<string, SceneNode>());

  useEffect(() => {
    // Map off, or no scene for this page (another page's model, a layout error): nothing of an earlier map may keep moving or draw.
    if (!mapPage || mapPage === emptyPage) { player.stop(); shown.current = null; player.cur.clear(); drawn.current.clear(); focusRef.current = null; markShown('asked'); return; }
    const host = hostRef.current;
    const before = shown.current;
    if (!host || before?.page === mapPage) return;
    // This effect is where a landed layout starts moving, or lands at once: from here the motion state tells the truth.
    markShown('landed');
    const extent = sceneExtent(mapPage);
    const rects = absoluteRects(mapPage);
    const settle = () => { player.cur.clear(); drawn.current.clear(); rects.forEach((rect, id) => player.cur.set(id, rect)); mapPage.nodes.forEach((node) => drawn.current.set(node.id, node)); };
    shown.current = { page: mapPage, rects, chain: scene?.chain };
    if (!before || before.chain !== scene?.chain || !extent || !model) {
      player.stop();
      settle();
      if (!extent) return;
      updateCamera(mapCamera(extent, clearance(host)));
      return;
    }
    const { items, gone } = planMotion(model, mapPage.nodes.map((node) => node.id), rects, before.rects, player.cur);
    for (const id of gone) { player.cur.delete(id); drawn.current.delete(id); }
    mapPage.nodes.forEach((node) => drawn.current.set(node.id, node));
    const focus = focusRef.current;
    focusRef.current = null;
    const camTo = !focus ? null : focus.id === null ? mapCamera(extent, clearance(host)) : rects.has(focus.id) ? landOn(extent, rects.get(focus.id), clearance(host), cameraRef.current) : null;
    const moving = items.some((item) => item.fade || (['x', 'y', 'width', 'height'] as const).some((key) => item.from[key] !== item.to[key]));
    if (reducedMotion() || !moving) {
      // End state in one frame, arrows visible at once.
      player.stop();
      settle();
      if (camTo) updateCamera(camTo);
      return;
    }
    // Labels wrap to the width each box ends with (a leaving box, to the one it had), so they are laid out once.
    const widths = new Map([...before.page.nodes, ...mapPage.nodes].map((node) => [node.id, node.size.width] as const));
    mine.current = cameraRef.current;
    // Only boxes someone can see are tweened; the rest jump to where they end (the host draws them at the end of the move).
    const { live, jumped } = cullMotion(items, movedView(cameraRef.current, camTo, host.getViewportSize()));
    for (const item of jumped) { if (item.fade === 'out') player.cur.delete(item.id); else player.cur.set(item.id, item.to); }
    player.play({ items: live, nodeOf: (id) => drawn.current.get(id), widths, camFrom: cameraRef.current, camTo }, MOVE_MS, () => {
      for (const id of [...drawn.current.keys()]) if (!rects.has(id)) drawn.current.delete(id);
      // React learns the camera once, here, not once per frame.
      if (player.camera) updateCamera(player.camera);
    }, () => renders.current);
  }, [mapPage, emptyPage, scene, model, hostRef, cameraRef, updateCamera, player, markShown, focusRef]);

  return { player, shown };
}
