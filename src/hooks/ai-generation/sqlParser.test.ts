import { describe, expect, it } from 'vitest';
import { formatSchemaForPrompt, parseSqlDdl } from './sqlParser';

describe('parseSqlDdl', () => {
  it('parses a basic CREATE TABLE with column types', () => {
    const sql = `
      CREATE TABLE users (
        id INT NOT NULL,
        name VARCHAR(100),
        email VARCHAR(255) NOT NULL UNIQUE
      );
    `;
    const schema = parseSqlDdl(sql);
    expect(schema.tables).toHaveLength(1);
    const [users] = schema.tables;
    expect(users.name).toBe('users');
    expect(users.columns).toHaveLength(3);
    expect(users.columns[0]).toMatchObject({ name: 'id', type: 'INT', nullable: false });
    expect(users.columns[1]).toMatchObject({ name: 'name', nullable: true });
    expect(users.columns[2]).toMatchObject({ name: 'email', unique: true, nullable: false });
  });

  it('detects inline PRIMARY KEY', () => {
    const sql = `CREATE TABLE orders (id BIGINT PRIMARY KEY, total DECIMAL);`;
    const schema = parseSqlDdl(sql);
    const [orders] = schema.tables;
    expect(orders.columns[0]).toMatchObject({ name: 'id', primaryKey: true });
  });

  it('detects table-level PRIMARY KEY constraint', () => {
    const sql = `
      CREATE TABLE products (
        product_id INT,
        name VARCHAR(50),
        CONSTRAINT pk_products PRIMARY KEY (product_id)
      );
    `;
    const schema = parseSqlDdl(sql);
    const [products] = schema.tables;
    const pk = products.columns.find((c) => c.name === 'product_id');
    expect(pk?.primaryKey).toBe(true);
  });

  it('parses inline REFERENCES as foreign key', () => {
    const sql = `
      CREATE TABLE order_items (
        id INT PRIMARY KEY,
        order_id INT REFERENCES orders(id),
        product_id INT REFERENCES products(product_id)
      );
    `;
    const schema = parseSqlDdl(sql);
    const [items] = schema.tables;
    expect(items.foreignKeys).toHaveLength(2);
    expect(items.foreignKeys[0]).toEqual({
      column: 'order_id',
      refTable: 'orders',
      refColumn: 'id',
    });
  });

  it('parses FOREIGN KEY ... REFERENCES constraint syntax', () => {
    const sql = `
      CREATE TABLE order_items (
        id INT,
        order_id INT,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );
    `;
    const schema = parseSqlDdl(sql);
    expect(schema.tables[0].foreignKeys).toHaveLength(1);
    expect(schema.tables[0].foreignKeys[0]).toEqual({
      column: 'order_id',
      refTable: 'orders',
      refColumn: 'id',
    });
  });

  it('strips SQL comments before parsing', () => {
    const sql = `
      -- users table
      CREATE TABLE users (
        id INT, /* surrogate key */
        name VARCHAR(100)
      );
    `;
    const schema = parseSqlDdl(sql);
    expect(schema.tables).toHaveLength(1);
    expect(schema.tables[0].columns).toHaveLength(2);
  });

  it('handles quoted identifiers', () => {
    const sql = 'CREATE TABLE `my_table` (`id` INT PRIMARY KEY, `value` VARCHAR(50));';
    const schema = parseSqlDdl(sql);
    expect(schema.tables[0].name).toBe('my_table');
    expect(schema.tables[0].columns[0].name).toBe('id');
  });

  it('handles CREATE TABLE IF NOT EXISTS', () => {
    const sql = 'CREATE TABLE IF NOT EXISTS sessions (token VARCHAR(255), user_id INT);';
    const schema = parseSqlDdl(sql);
    expect(schema.tables[0].name).toBe('sessions');
  });

  it('parses multiple tables', () => {
    const sql = `
      CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));
      CREATE TABLE posts (id INT PRIMARY KEY, user_id INT REFERENCES users(id), body TEXT);
    `;
    const schema = parseSqlDdl(sql);
    expect(schema.tables).toHaveLength(2);
    expect(schema.tables.map((t) => t.name)).toEqual(['users', 'posts']);
  });

  it('returns empty tables for empty input', () => {
    expect(parseSqlDdl('').tables).toHaveLength(0);
    expect(parseSqlDdl('-- just a comment').tables).toHaveLength(0);
  });

  it('parses ALTER TABLE ADD FOREIGN KEY', () => {
    const sql = `
      CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));
      CREATE TABLE posts (id INT PRIMARY KEY, user_id INT, body TEXT);
      ALTER TABLE posts ADD FOREIGN KEY (user_id) REFERENCES users(id);
    `;
    const schema = parseSqlDdl(sql);
    const posts = schema.tables.find((t) => t.name === 'posts');
    expect(posts?.foreignKeys).toHaveLength(1);
    expect(posts?.foreignKeys[0]).toEqual({
      column: 'user_id',
      refTable: 'users',
      refColumn: 'id',
    });
  });

  it('parses ALTER TABLE with CONSTRAINT name', () => {
    const sql = `
      CREATE TABLE orders (id INT PRIMARY KEY);
      CREATE TABLE items (id INT PRIMARY KEY, order_id INT);
      ALTER TABLE items ADD CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id);
    `;
    const schema = parseSqlDdl(sql);
    const items = schema.tables.find((t) => t.name === 'items');
    expect(items?.foreignKeys).toHaveLength(1);
    expect(items?.foreignKeys[0]).toEqual({
      column: 'order_id',
      refTable: 'orders',
      refColumn: 'id',
    });
  });

  it('preserves ENUM type values', () => {
    const sql = `CREATE TABLE orders (status ENUM('pending', 'shipped', 'delivered'), priority INT);`;
    const schema = parseSqlDdl(sql);
    const status = schema.tables[0].columns[0];
    expect(status.name).toBe('status');
    expect(status.type).toContain('ENUM');
    expect(status.type).toContain('PENDING');
  });
});

describe('formatSchemaForPrompt', () => {
  it('returns empty string for empty schema', () => {
    expect(formatSchemaForPrompt({ tables: [] })).toBe('');
  });

  it('includes table names and PK markers', () => {
    const schema = parseSqlDdl('CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));');
    const output = formatSchemaForPrompt(schema);
    expect(output).toContain('TABLE users');
    expect(output).toContain('id');
    expect(output).toContain('PK');
  });

  it('includes RELATIONSHIPS section when foreign keys exist', () => {
    const sql = `
      CREATE TABLE users (id INT PRIMARY KEY);
      CREATE TABLE posts (id INT PRIMARY KEY, user_id INT REFERENCES users(id));
    `;
    const schema = parseSqlDdl(sql);
    const output = formatSchemaForPrompt(schema);
    expect(output).toContain('RELATIONSHIPS');
    expect(output).toContain('posts.user_id → users.id');
  });

  it('omits RELATIONSHIPS section when no foreign keys exist', () => {
    const schema = parseSqlDdl('CREATE TABLE users (id INT, name VARCHAR(100));');
    const output = formatSchemaForPrompt(schema);
    expect(output).not.toContain('RELATIONSHIPS');
  });
});
