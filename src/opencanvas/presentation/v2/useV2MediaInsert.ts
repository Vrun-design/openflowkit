import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { Point2d, Size2d } from '../../domain/geometry/types';
import { createImageNode, fitImageSize, MAX_IMAGE_SIDE } from '../../domain/nodes/imageNode';
import { createShapeNode } from '../../domain/nodes/shapeNode';
import { isImageFile, putImageAsset, readFileAsDataUrl } from '../../../services/storage/assets';
import { replaceSelection, type CanvasSelection } from '../../application/selection/selection';

// Every way an image or emoji reaches the canvas: the rail's picker, a drop,
// a pasted file and a pasted URL. One node per insert, one undo step.
export const IMAGE_URL_PATTERN = /^https?:\/\/\S+\.(?:png|jpe?g|svg|webp|gif)(?:\?\S*)?$/i;

export interface V2MediaInsertOptions {
  readonly pageRef: RefObject<ScenePage | null>;
  readonly commit: (command: DocumentCommand) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorIds: readonly string[]) => void;
  readonly announce: (message: string) => void;
  readonly mintId: (prefix: string) => string;
  /** Viewport centre in world space: where a picker-inserted image lands. */
  readonly centreWorld: () => Point2d;
  readonly readOnlyRef: RefObject<boolean>;
}

export function useV2MediaInsert(options: V2MediaInsertOptions) {
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const insertNode = useCallback((node: ReturnType<typeof createImageNode>) => {
    const opts = optionsRef.current;
    const page = opts.pageRef.current;
    if (!page) return;
    opts.commit({
      kind: 'insert-node',
      id: `create-node:${node.id}`,
      label: node.kind === 'image' ? 'Add image' : 'Add emoji',
      pageId: page.id,
      index: page.nodes.length,
      node,
    });
    opts.applyConnectorSelection([]);
    opts.applySelection(replaceSelection([node.id]));
  }, []);

  const insertImageBytes = useCallback(async (
    file: File, at?: Point2d, natural?: Size2d
  ): Promise<void> => {
    const opts = optionsRef.current;
    const page = opts.pageRef.current;
    if (!page || opts.readOnlyRef.current) return;
    if (!isImageFile(file)) {
      opts.announce('That file is not an image.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const assetId = await putImageAsset(dataUrl, file.name, file.type);
      const size = natural ? fitImageSize(natural) : { width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE };
      const centre = at ?? opts.centreWorld();
      insertNode(createImageNode(page, {
        id: opts.mintId('node'), size,
        at: { x: centre.x - size.width / 2, y: centre.y - size.height / 2 },
        label: file.name.replace(/\.[a-z0-9]+$/i, '') || 'Image',
        assetId, url: dataUrl,
      }));
      opts.announce('Image added.');
    } catch (error) {
      opts.announce(error instanceof Error ? error.message : 'Could not add that image.');
    }
  }, [insertNode]);

  const insertImageUrl = useCallback((url: string, at?: Point2d, natural?: Size2d): void => {
    const opts = optionsRef.current;
    const page = opts.pageRef.current;
    if (!page || opts.readOnlyRef.current) return;
    const size = natural ? fitImageSize(natural) : { width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE };
    const centre = at ?? opts.centreWorld();
    insertNode(createImageNode(page, {
      id: opts.mintId('node'), size,
      at: { x: centre.x - size.width / 2, y: centre.y - size.height / 2 },
      url,
    }));
    opts.announce('Image added.');
  }, [insertNode]);

  const insertEmoji = useCallback((glyph: string, at?: Point2d): void => {
    const opts = optionsRef.current;
    const page = opts.pageRef.current;
    if (!page || opts.readOnlyRef.current) return;
    const size = { width: 64, height: 64 };
    const centre = at ?? opts.centreWorld();
    const node = createShapeNode(page, {
      kind: 'text',
      id: opts.mintId('node'),
      label: glyph,
      size,
      at: { x: centre.x - size.width / 2, y: centre.y - size.height / 2 },
    });
    insertNode({ ...node, appearance: { ...node.appearance, fontSize: 48, textAlign: 'center' } });
    opts.announce('Emoji added.');
  }, [insertNode]);

  /** A dropped or pasted file: images only, sized from their natural pixels. */
  const insertImageFile = useCallback(async (file: File, at?: Point2d): Promise<void> => {
    const natural = await naturalSizeOf(file);
    await insertImageBytes(file, at, natural ?? undefined);
  }, [insertImageBytes]);

  return { insertImageFile, insertImageUrl, insertEmoji, centreWorld: () => optionsRef.current.centreWorld() };
}

function naturalSizeOf(file: File): Promise<Size2d | null> {
  if (typeof createImageBitmap !== 'function') return Promise.resolve(null);
  return createImageBitmap(file).then((bitmap) => {
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }).catch(() => null);
}
