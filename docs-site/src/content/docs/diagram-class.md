---
title: Class diagrams
description: The class family — classes with stereotype blocks, attributes, methods and UML relations in OpenFlow DSL.
---

Class diagrams describe structure with behaviour: types, their members, and how they relate.
Use it for domain models, API schemas and refactoring plans.

## Header

```openflow
class
Order [interface] {
  +id: int
  -items: Item[]
  ---
  +total(): Money
  +save()$
}

Item {
  +sku: string
}

Order --|> Base : extends
Order *-- Item
Order ..> Money : totals
```

`class` defaults to `down`. The block is the class body: a member line is an attribute, and a
line containing `(` is a method. `---` separates compartments and is emitted only when a class
has both.

## Statements

| Statement | Example | Notes |
| --- | --- | --- |
| Class | `Order { … }` | block body holds the members |
| Stereotype | `Order [interface]` | also `abstract`, `enum` |
| Attribute | `+id: int` | visibility prefix is text, not validated |
| Method | `+total(): Money` | `(` makes it a method |
| Static / abstract | `+save()$`, `+reset()*` | `$` static, `*` abstract |
| Inheritance | `Order --|> Base` | solid triangle |
| Realisation | `Order ..|> Serializable` | dashed triangle |
| Composition | `Order *-- Item` | filled diamond |
| Aggregation | `Order o-- Tag` | hollow diamond |
| Dependency | `Order ..> Money` | dashed open arrow |
| Association | `Order --> Customer` | solid open arrow |
| Multiplicity | `Order "1" --> "*" Item : has` | quoted beside the arrow |

Reversed relations normalise: `Order <|-- Base` is rewritten to `Base --|> Order`, so the
serializer can round-trip either spelling to the same canonical line.

## What it does not do

- **No type checking.** `Item[]`, `Money` and `int` are text; nothing resolves them.
- **No generics or stereotypes beyond the three words.** An unknown attribute is warning W131.
- **No self-relations.** A class relating to itself is dropped with warning W170.
- Members are one per line; there is no multi-line signature syntax.

## Where to go next

- [ER diagrams](/diagram-erd/) — when the model is data, not behaviour.
- [Architecture diagrams](/diagram-architecture/) — when the unit is a deployed service.
