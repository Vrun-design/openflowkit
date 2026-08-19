# React Flow Infrastructure Adapter

Bidirectional compatibility boundary between persisted React Flow-shaped graph
records and the renderer-independent OpenCanvas document.

- transient renderer state is removed before canonical projection;
- unchanged persisted JSON round-trips exactly;
- canonical edits overlay only changed legacy fields;
- unknown JSON fields remain preserved;
- the default-off bridge returns original arrays by reference when disabled;
- no application runtime consumes this bridge in CS-004.

Renderer components, hooks, DOM APIs, and store logic do not belong here.
