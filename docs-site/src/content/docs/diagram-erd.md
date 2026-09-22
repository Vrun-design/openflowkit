---
title: ER diagrams
description: The ERD family — entities, typed columns with pk/fk/unique flags and crow's-foot cardinality in OpenFlow DSL.
---

Entity-relationship diagrams describe a schema: tables, columns and the relations between
them. Use it to keep a data model reviewable in text next to the migrations.

## Header

```openflow
erd
users [blue] {
  id uuid pk
  email text unique
  "full name" text
}

orders {
  id uuid pk
  user_id uuid fk
}

users ||--o{ orders : places
```

`erd` defaults to `right`, which reads like a schema spread. A column with spaces in its name
is quoted.

## Statements

| Statement | Example | Notes |
| --- | --- | --- |
| Entity | `users { … }` | the block is the table; the header row is the name |
| Column | `email text unique` | `name [type] [flags]` |
| Column flags | `pk`, `fk`, `unique`, `null`, `not-null` | canonical flag order |
| Uncarded relation | `users -> orders : has` | canonicalises to `--` |
| Word cardinality | `users 1:N orders` | accepted, canonicalised to crow's-foot glyphs |

Cardinality is written crow's-foot style beside the arrow:

```text
users ||--o{ orders : places      one to zero-or-many, identifying
users ||..o{ drafts : saves       one to zero-or-many, non-identifying
```

Column types are free text on purpose: the diagram documents the schema, it does not validate
it against a database.

## What it does not do

- **No SQL.** Types and constraints are labels; nothing is parsed into a real schema.
- **No self-relations.** An entity that relates to itself is dropped with warning W170.
- **No indexes, triggers or views.** The entity block is columns only.
- Relations are drawn as straight connectors between entity boxes; there are no junction
  tables implied or created.

## Where to go next

- [Class diagrams](/diagram-class/) — when the model has behaviour, not just data.
- [Architecture diagrams](/diagram-architecture/) — when the unit is a service, not a table.
