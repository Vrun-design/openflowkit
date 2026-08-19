import { describe, expect, it } from 'vitest';
import type { JsonObject } from '../document/json';
import type { SceneNode } from '../document/types';
import { createPixiSpikePage } from '../../infrastructure/pixi/spikeFixture';
import { resolveClassEntityNodePresentation } from './classEntityNodePresentation';

function node(kind: string, content: JsonObject): SceneNode {
  return { ...createPixiSpikePage(1).nodes[0], kind, content };
}

describe('class and entity node presentation', () => {
  it('normalizes class compartments without discarding visibility', () => {
    expect(
      resolveClassEntityNodePresentation(
        node('class', {
          label: 'Order',
          classStereotype: 'aggregate',
          classAttributes: ['- id: UUID', 'status: Status'],
          classMethods: ['# validate(): boolean'],
        })
      )
    ).toEqual({
      kind: 'class',
      label: 'Order',
      stereotype: 'aggregate',
      attributes: [
        { visibility: 'private', symbol: '-', signature: 'id: UUID' },
        { visibility: 'public', symbol: '+', signature: 'status: Status' },
      ],
      methods: [{ visibility: 'protected', symbol: '#', signature: 'validate(): boolean' }],
      colorKey: 'slate',
      colorMode: 'subtle',
    });
  });

  it('normalizes legacy and structured ER fields with key and reference metadata', () => {
    expect(
      resolveClassEntityNodePresentation(
        node('er_entity', {
          label: 'orders',
          erFields: [
            'legacy_id: UUID PK NN',
            {
              name: 'customer_id',
              dataType: 'UUID',
              isForeignKey: true,
              isUnique: true,
              referencesTable: 'customers',
              referencesField: 'id',
            },
          ],
        })
      )
    ).toMatchObject({
      kind: 'er_entity',
      fields: [
        { name: 'legacy_id', dataType: 'UUID', isPrimaryKey: true, isNotNull: true },
        {
          name: 'customer_id',
          dataType: 'UUID',
          isForeignKey: true,
          isUnique: true,
          reference: 'customers.id',
        },
      ],
    });
  });

  it('rejects unrelated families', () => {
    expect(resolveClassEntityNodePresentation(node('process', {}))).toBeNull();
  });
});
