export interface ParsedColumn {
  name: string;
  type: string;
  primaryKey: boolean;
  nullable: boolean;
  unique: boolean;
}

export interface ParsedForeignKey {
  column: string;
  refTable: string;
  refColumn: string;
}

export interface ParsedTable {
  name: string;
  columns: ParsedColumn[];
  foreignKeys: ParsedForeignKey[];
}

export interface ParsedSchema {
  tables: ParsedTable[];
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function unquoteIdentifier(s: string): string {
  return s.replace(/^[`"[\]]|[`"[\]]$/g, '').trim();
}

function parseColumnDefs(body: string): {
  columns: ParsedColumn[];
  foreignKeys: ParsedForeignKey[];
} {
  const columns: ParsedColumn[] = [];
  const foreignKeys: ParsedForeignKey[] = [];
  const tablePKs = new Set<string>();

  const defs: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '(') depth++;
    else if (body[i] === ')') depth--;
    else if (body[i] === ',' && depth === 0) {
      defs.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  defs.push(body.slice(start).trim());

  for (const def of defs) {
    if (!def) continue;
    const upper = def.toUpperCase();

    if (/^(CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*\(/.test(upper)) {
      const match = def.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (match) {
        match[1]
          .split(',')
          .map((c) => unquoteIdentifier(c.trim()))
          .forEach((c) => tablePKs.add(c));
      }
      continue;
    }

    if (/^(CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(/.test(upper)) {
      const match = def.match(
        /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i
      );
      if (match) {
        foreignKeys.push({
          column: unquoteIdentifier(match[1].trim()),
          refTable: unquoteIdentifier(match[2].trim()),
          refColumn: unquoteIdentifier(match[3].trim()),
        });
      }
      continue;
    }

    if (/^(UNIQUE\s+)?INDEX\b|^CHECK\s*\(|^KEY\s+/.test(upper)) continue;

    const parts = def.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const colName = unquoteIdentifier(parts[0]);
    const isEnum = /^ENUM/i.test(parts[1]);
    const colType = isEnum ? parts[1] : parts[1].replace(/\([^)]*\)/, '');

    const isPK = upper.includes('PRIMARY KEY');
    const isNotNull = upper.includes('NOT NULL');
    const isUnique = upper.includes('UNIQUE') && !isPK;

    const refMatch = def.match(/REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
    if (refMatch) {
      foreignKeys.push({
        column: colName,
        refTable: unquoteIdentifier(refMatch[1].trim()),
        refColumn: unquoteIdentifier(refMatch[2].trim()),
      });
    }

    columns.push({
      name: colName,
      type: colType.toUpperCase(),
      primaryKey: isPK,
      nullable: !isNotNull && !isPK,
      unique: isUnique,
    });
  }

  for (const col of columns) {
    if (tablePKs.has(col.name)) col.primaryKey = true;
  }

  return { columns, foreignKeys };
}

function parseAlterTableForeignKeys(sql: string, tables: ParsedTable[]): void {
  const tableByName = new Map(tables.map((t) => [t.name.toLowerCase(), t]));
  const alterRegex =
    /ALTER\s+TABLE\s+([^\s(]+)\s+ADD\s+(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = alterRegex.exec(sql)) !== null) {
    const tableName = unquoteIdentifier(match[1]).toLowerCase();
    const table = tableByName.get(tableName);
    if (table) {
      table.foreignKeys.push({
        column: unquoteIdentifier(match[2].trim()),
        refTable: unquoteIdentifier(match[3].trim()),
        refColumn: unquoteIdentifier(match[4].trim()),
      });
    }
  }
}

export function parseSqlDdl(sql: string): ParsedSchema {
  const clean = stripComments(sql);
  const tables: ParsedTable[] = [];

  const tableRegex = /CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(clean)) !== null) {
    const tableName = unquoteIdentifier(match[1]);
    const bodyStart = match.index + match[0].length;

    let depth = 1;
    let i = bodyStart;
    while (i < clean.length && depth > 0) {
      if (clean[i] === '(') depth++;
      else if (clean[i] === ')') depth--;
      i++;
    }
    const body = clean.slice(bodyStart, i - 1);
    const { columns, foreignKeys } = parseColumnDefs(body);

    tables.push({ name: tableName, columns, foreignKeys });
  }

  parseAlterTableForeignKeys(clean, tables);

  return { tables };
}

export function formatSchemaForPrompt(schema: ParsedSchema): string {
  if (schema.tables.length === 0) return '';

  const lines: string[] = [
    'SCHEMA (parsed — use this exactly, do not invent columns or relationships):',
  ];

  for (const table of schema.tables) {
    const cols = table.columns
      .map((c) => {
        const tags: string[] = [];
        if (c.primaryKey) tags.push('PK');
        if (c.unique) tags.push('UNIQUE');
        if (!c.nullable && !c.primaryKey) tags.push('NOT NULL');
        return tags.length > 0 ? `${c.name} ${c.type} [${tags.join(', ')}]` : `${c.name} ${c.type}`;
      })
      .join(', ');
    lines.push(`TABLE ${table.name}: ${cols}`);
  }

  if (schema.tables.some((t) => t.foreignKeys.length > 0)) {
    lines.push('');
    lines.push('RELATIONSHIPS:');
    for (const table of schema.tables) {
      for (const fk of table.foreignKeys) {
        lines.push(`  ${table.name}.${fk.column} → ${fk.refTable}.${fk.refColumn}`);
      }
    }
  }

  return lines.join('\n');
}
