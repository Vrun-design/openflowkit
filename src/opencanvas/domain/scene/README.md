# OpenCanvas Scene Domain

Pure derived queries over one canonical page.

- parent transforms compose into deterministic world matrices;
- node and connector world bounds are stored in a uniform spatial hash;
- exact bounds intersection filters cell candidates;
- huge objects use an overflow set rather than allocating unbounded cells;
- query order is stable by layer, render kind, z-index, document order, and ID;
- hidden-layer objects are excluded unless explicitly requested.

The index is disposable derived state. It is never persisted or placed in
document history. Incremental invalidation is deferred until a renderer consumes
the index and profiling identifies the correct update granularity.
