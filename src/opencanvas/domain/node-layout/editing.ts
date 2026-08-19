import type { SceneNode } from '../document/types';
import { validateNodeContentLayout } from './model';
import type { NodeContentLayoutV1 } from './types';

export function setNodeContentLayout(node: SceneNode, layout: NodeContentLayoutV1): SceneNode {
  const validation = validateNodeContentLayout(layout);
  if (!validation.success) {
    throw new TypeError(`Invalid node content layout: ${validation.issues.join(' ')}`);
  }
  return {
    ...node,
    content: {
      ...node.content,
      contentLayout: {
        version: validation.value.version,
        horizontal: validation.value.horizontal,
        vertical: validation.value.vertical,
        iconPlacement: validation.value.iconPlacement,
        labelAlignment: validation.value.labelAlignment,
        padding: { ...validation.value.padding },
        gap: validation.value.gap,
        iconScale: validation.value.iconScale,
        freeIconPosition: { ...validation.value.freeIconPosition },
      },
    },
  };
}
