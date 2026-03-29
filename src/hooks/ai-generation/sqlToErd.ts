import { formatSchemaForPrompt, parseSqlDdl, type ParsedSchema } from './sqlParser';

export function sqlSchemaToDsl(schema: ParsedSchema, title = 'ERD'): string {
  if (schema.tables.length === 0) return '';

  const lines: string[] = [];
  lines.push(`flow: "${title}"`);
  lines.push('direction: TB');
  lines.push('');

  for (const table of schema.tables) {
    const id = table.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const keyCols = table.columns
      .filter((c) => c.primaryKey || table.foreignKeys.some((fk) => fk.column === c.name))
      .slice(0, 5);
    const label =
      keyCols.length > 0
        ? `${table.name}: ${keyCols.map((c) => (c.primaryKey ? `*${c.name}` : c.name)).join(', ')}`
        : table.name;
    lines.push(`[entity] ${id}: ${label}`);
  }

  lines.push('');

  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      const fromId = table.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const toId = fk.refTable.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`${fromId} -> ${toId} |${fk.column}|`);
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
- Group related tables into [section] containers where it makes semantic sense (e.g. "User Domain", "Commerce")
- Do NOT invent tables, columns, or relationships that are not in the schema above
- Keep labels concise — table names as-is, column names as-is`;
}
