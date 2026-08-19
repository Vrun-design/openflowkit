# Node content layout

This module owns the renderer-neutral layout contract for content inside a
node. `NodeContentLayoutV1` stores alignment, icon placement, padding, gap,
icon scale, and a normalized free-icon position. `layoutNodeContent` turns that
contract plus measured content into deterministic node-local bounds.

The optional contract lives at `node.content.contentLayout`. Its absence means
the legacy centered, icon-above-label layout. Validation rejects malformed
values without mutating the source document, and the feature flag can make all
adapters ignore authored layout data during rollback.

Renderer adapters may measure text differently, but must consume the same
semantic layout and keep free positions normalized so they survive resize.
Editing must use `setNodeContentLayout` and commit one document command per
completed control action.
