import { describe, expect, it } from 'vitest';
import { NodeType, type NodeData } from '@/lib/types';
import type { Node } from '@/lib/reactflowCompat';
import {
  getAvailableBulkSections,
  getBulkCapabilityCounts,
  INITIAL_BULK_NODE_PROPERTIES_FORM_STATE,
  resetBulkLabelTransformFields,
} from './bulkNodePropertiesModel';

function createNode(type: string, data: Partial<NodeData> = {}): Node<NodeData> {
  return {
    id: `${type}-${Object.keys(data).length}`,
    type,
    position: { x: 0, y: 0 },
    data: {
      label: 'Node',
      ...data,
    },
  } as Node<NodeData>;
}

describe('bulkNodePropertiesModel', () => {
  it('derives capability counts from a mixed selection', () => {
    const counts = getBulkCapabilityCounts([
      createNode(NodeType.CUSTOM),
      createNode(NodeType.TEXT),
      createNode(NodeType.BROWSER),
      createNode(NodeType.ARCHITECTURE),
    ]);

    expect(counts.shape).toBe(1);
    expect(counts.color).toBe(3);
    expect(counts.icon).toBe(1);
    expect(counts.variant).toBe(1);
    expect(counts.architecture).toBe(1);
  });

  it('keeps shared label sections available even when family-specific sections are absent', () => {
    expect(
      getAvailableBulkSections({
        shape: 0,
        color: 0,
        icon: 0,
        variant: 0,
        architecture: 0,
        journey: 0,
        class: 0,
        sequence: 0,
        labels: 2,
        findReplace: 2,
      })
    ).toEqual(['labels', 'findReplace']);
  });

  it('resets only label transform fields after apply', () => {
    const nextForm = resetBulkLabelTransformFields({
      ...INITIAL_BULK_NODE_PROPERTIES_FORM_STATE,
      color: 'blue',
      labelPrefix: 'Pre',
      labelSuffix: 'Post',
      labelFind: 'old',
      labelReplace: 'new',
    });

    expect(nextForm.color).toBe('blue');
    expect(nextForm.labelPrefix).toBe('');
    expect(nextForm.labelSuffix).toBe('');
    expect(nextForm.labelFind).toBe('');
    expect(nextForm.labelReplace).toBe('');
  });
});
