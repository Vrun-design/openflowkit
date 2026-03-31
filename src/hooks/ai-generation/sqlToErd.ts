import {
  formatSchemaForPrompt,
  parseSqlDdl,
  type ParsedSchema,
  type ParsedTable,
} from './sqlParser';

type Cardinality = '1:1' | '1:N' | 'N:M';

function isJunctionTable(table: ParsedTable): boolean {
  const fkColumns = new Set(table.foreignKeys.map((fk) => fk.column));
  const nonKeyColumns = table.columns.filter((c) => !c.primaryKey && !fkColumns.has(c.name));
  return table.foreignKeys.length >= 2 && nonKeyColumns.length === 0;
}

function getCardinality(table: ParsedTable, fkColumn: string): Cardinality {
  if (isJunctionTable(table)) return 'N:M';
  const col = table.columns.find((c) => c.name === fkColumn);
  return col?.unique || col?.primaryKey ? '1:1' : '1:N';
}

export function sqlSchemaToDsl(schema: ParsedSchema, title = 'ERD'): string {
  if (schema.tables.length === 0) return '';

  const lines: string[] = [];
  lines.push(`flow: "${title}"`);
  lines.push('direction: TB');
  lines.push('');

  for (const table of schema.tables) {
    const id = table.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const pkCols = table.columns.filter((c) => c.primaryKey);
    const fkCols = table.columns.filter(
      (c) => !c.primaryKey && table.foreignKeys.some((fk) => fk.column === c.name)
    );
    const regularCols = table.columns.filter(
      (c) => !c.primaryKey && !table.foreignKeys.some((fk) => fk.column === c.name)
    );
    const displayCols = [...pkCols, ...fkCols, ...regularCols].slice(0, 8);
    const colLines = displayCols.map((c) => {
      const tags: string[] = [];
      if (c.primaryKey) tags.push('PK');
      if (!c.nullable && !c.primaryKey) tags.push('NOT NULL');
      if (c.unique) tags.push('UNIQUE');
      const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
      return `${c.name} ${c.type}${tagStr}`;
    });
    const remaining = table.columns.length - displayCols.length;
    if (remaining > 0) colLines.push(`... +${remaining} more`);
    const label = `${table.name}: ${colLines.join('\\n')}`;
    lines.push(`[entity] ${id}: "${label}"`);
  }

  lines.push('');

  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      const fromId = table.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const toId = fk.refTable.replace(/[^a-zA-Z0-9_]/g, '_');
      const cardinality = getCardinality(table, fk.column);
      lines.push(`${fromId} -> ${toId} |${fk.column} ${cardinality}|`);
    }
  }

  return lines.join('\n').trimEnd();
}

export function buildSqlToErdPrompt(sql: string): string {
  const schema = parseSqlDdl(sql);
  const structuredSchema = formatSchemaForPrompt(schema);

  const schemaSection = structuredSchema
    ? structuredSchema
    : `SQL DDL (parse directly):\n\`\`\`sql\n${sql}\n\`\`\``;

  return `Generate a clean Entity-Relationship Diagram from the following schema.

${schemaSection}

Rules:
- Create exactly one [entity] node per table — use the exact table name as the label
- List the key columns inside the node body (PK first, then FKs, then up to 3 other columns — omit the rest)
- Draw one directed edge per foreign key relationship; label it with the FK column and cardinality (1:1, 1:N, or N:M)
- Do not use section or group containers; keep related tables adjacent and use labels to imply domains such as User or Commerce
- Do NOT invent tables, columns, or relationships that are not in the schema above
- Keep labels concise — table names as-is, column names as-is`;
}
