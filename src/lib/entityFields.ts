import type { ErField } from '@/lib/types';

const PRIMARY_KEY_TOKENS = new Set(['PK', 'PRIMARY']);
const FOREIGN_KEY_TOKENS = new Set(['FK', 'FOREIGN']);
const NOT_NULL_TOKENS = new Set(['NN', 'NOTNULL']);
const UNIQUE_TOKENS = new Set(['UNIQUE', 'UQ']);

export function createDefaultErField(): ErField {
  return {
    name: '',
    dataType: '',
    isPrimaryKey: false,
    isForeignKey: false,
    isNotNull: false,
    isUnique: false,
  };
}

function isErField(value: unknown): value is ErField {
  return Boolean(value) && typeof value === 'object' && 'name' in (value as Record<string, unknown>);
}

export function parseErField(input: string): ErField {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return createDefaultErField();
  }

  const [namePart, remainder = ''] = normalizedInput.split(':', 2);
  const tokens = remainder.trim().split(/\s+/).filter(Boolean);
  const dataTypeTokens: string[] = [];
  let isPrimaryKey = false;
  let isForeignKey = false;
  let isNotNull = false;
  let isUnique = false;

  tokens.forEach((token) => {
    const normalizedToken = token.toUpperCase();
    if (PRIMARY_KEY_TOKENS.has(normalizedToken)) {
      isPrimaryKey = true;
      return;
    }
    if (FOREIGN_KEY_TOKENS.has(normalizedToken)) {
      isForeignKey = true;
      return;
    }
    if (NOT_NULL_TOKENS.has(normalizedToken)) {
      isNotNull = true;
      return;
    }
    if (UNIQUE_TOKENS.has(normalizedToken)) {
      isUnique = true;
      return;
    }
    dataTypeTokens.push(token);
  });

  return {
    name: namePart.trim(),
    dataType: dataTypeTokens.join(' ').trim(),
    isPrimaryKey,
    isForeignKey,
    isNotNull,
    isUnique,
  };
}

export function normalizeErField(value: string | ErField): ErField {
  if (isErField(value)) {
    return {
      ...createDefaultErField(),
      ...value,
      name: typeof value.name === 'string' ? value.name : '',
      dataType: typeof value.dataType === 'string' ? value.dataType : '',
    };
  }

  return parseErField(String(value));
}

export function normalizeErFields(values: Array<string | ErField> | undefined): ErField[] {
  return Array.isArray(values) ? values.map(normalizeErField) : [];
}

export function stringifyErField(field: ErField): string {
  const segments: string[] = [];
  const normalizedName = field.name.trim();
  const normalizedType = field.dataType.trim();
  if (normalizedType) {
    segments.push(`${normalizedName || 'field'}: ${normalizedType}`);
  } else {
    segments.push(normalizedName || 'field');
  }
  if (field.isPrimaryKey) segments.push('PK');
  if (field.isForeignKey) segments.push('FK');
  if (field.isNotNull) segments.push('NN');
  if (field.isUnique) segments.push('UNIQUE');
  return segments.join(' ').trim();
}

export function stringifyMermaidErField(field: ErField): string {
  const segments: string[] = [];
  const normalizedName = field.name.trim() || 'field';
  const normalizedType = field.dataType.trim() || 'string';

  segments.push(normalizedType, normalizedName);
  if (field.isPrimaryKey) segments.push('PK');
  if (field.isForeignKey) segments.push('FK');
  if (field.isUnique) segments.push('UK');
  if (field.isNotNull) segments.push('NN');
  if (field.referencesTable?.trim()) {
    segments.push('REFERENCES', field.referencesTable.trim());
  }

  return segments.join(' ').trim();
}

export function formatErFieldLabel(field: ErField): string {
  const parts = [field.name.trim() || 'field'];
  if (field.dataType.trim()) {
    parts.push(field.dataType.trim());
  }
  return parts.join(': ');
}
