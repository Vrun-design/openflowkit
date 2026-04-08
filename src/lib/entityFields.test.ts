import { describe, expect, it } from 'vitest';
import { stringifyErField, stringifyMermaidErField } from './entityFields';

describe('entityFields', () => {
  it('keeps the editor field serializer in name-first format', () => {
    const result = stringifyErField({
      name: 'customer_id',
      dataType: 'uuid',
      isPrimaryKey: false,
      isForeignKey: true,
      isNotNull: false,
      isUnique: false,
      referencesTable: 'CUSTOMER',
      referencesField: 'id',
    });

    expect(result).toBe('customer_id: uuid FK');
  });

  it('serializes Mermaid ER fields in Mermaid-compatible type-first format', () => {
    const result = stringifyMermaidErField({
      name: 'customer_id',
      dataType: 'uuid',
      isPrimaryKey: false,
      isForeignKey: true,
      isNotNull: true,
      isUnique: true,
      referencesTable: 'CUSTOMER',
      referencesField: 'id',
    });

    expect(result).toBe('uuid customer_id FK UK NN REFERENCES CUSTOMER');
  });
});
