# Groups & Sections — Audit & Fix Plan
**Date:** 2026-04-07

---

## The Three Problems

1. **Nodes can't escape groups** — once inside a group, you're trapped
2. **Nodes overlap inside groups** — layout doesn't space children properly
3. **Groups don't resize correctly** — wrong padding, too small, floating header ignored

All three have clear root causes in the code. None require architectural changes.

---

## Root Causes

### Problem 1: Can't Escape Groups

**File:** `src/lib/nodeParent.ts:15-21`

`setNodeParent()` unconditionally sets `extent: 'parent'` on every parented node:

```typescript
export function setNodeParent<T extends Node>(node: T, parentId: string): T {
  return {
    ...node,
    parentId,
    extent: 'parent' as const,  // always set — physically locks node in React Flow
  } as T;
}
```

React Flow enforces `extent: 'parent'` at the DOM level during drag. There's no escape hatch. `clearNodeParent()` exists but is only called in specific delete/ungroup scenarios — not when a user drags to the boundary.

The drag-stop handler (`useNodeDragOperations.ts:98-180`) calls `applySectionParenting()` which re-parents nodes when they land inside a section, but never un-parents them when they land outside. So moving outward just snaps back.

**Also:** Mermaid-parsed subgraph children get `extent: 'parent'` immediately at parse time (`mermaidParser.ts:273`) — before the user ever interacts.

---

### Problem 2: Nodes Overlap Inside Groups

**Three compounding causes:**

**2A. ELK doesn't lay out children of parent nodes**

`src/services/elkLayout.ts:104-112` — `buildElkNode()` sets `width` and `height` to `undefined` for nodes that have children:

```typescript
return {
  id: node.id,
  width: children.length === 0 ? width : undefined,   // undefined for groups
  height: children.length === 0 ? height : undefined,  // undefined for groups
  children: children.map(...),
  layoutOptions: { 'elk.padding': '[top=40,left=20,bottom=20,right=20]' },
};
```

ELK receives a group node with `width/height = undefined` and children that also have their own positions. ELK auto-sizes the group to wrap the children, but it **doesn't re-layout the children** — it just wraps around wherever they are. If children have positions from a previous pass or default to 0,0, they all stack at the top-left.

**2B. ELK outputs absolute coordinates, React Flow expects relative**

`src/services/elkLayout.ts:164-196` — `buildPositionMap()` collects positions as **absolute canvas coordinates** from ELK. But React Flow requires child nodes to have **positions relative to their parent's top-left corner**.

The apply step (`elkLayout.ts:482`) uses these coordinates as-is:
```typescript
position: { x: position.x, y: position.y },  // absolute, not relative to parent
```

So a child at absolute position (500, 300) inside a parent at (400, 200) gets placed at (500, 300) relative to the parent — which puts it at absolute position (900, 500) on the canvas. Completely wrong.

**2C. No compound layout options in ELK**

`src/services/elk-layout/options.ts:91-144` — ELK config has no hierarchical layout options:
- No `elk.hierarchyHandling`
- No per-group layout direction
- No `elk.separateConnectedComponents`

ELK is configured as a flat graph layouter, not a compound graph layouter.

---

### Problem 3: Groups Don't Resize Correctly

**3A. Padding mismatch**

ELK padding (set in `elkLayout.ts:110`): `top=40, left=20, bottom=20, right=20`  
Section rendering padding (`sectionBounds.ts:5-11`): `SECTION_PADDING_X = 32`, `SECTION_PADDING_BOTTOM = 32`  
Global ELK padding (`options.ts:190`): `top=50, left=50, bottom=50, right=50`

Three different values in three different places. ELK sizes the group with 20px padding, the UI renders with 32px padding, and the hit-testing uses 32px. Every calculation is off.

**3B. Floating header not in ELK's model**

`src/components/SectionNode.tsx:46-97` — the section title floats **above** the border with `top: -36`. ELK doesn't know about this. Children get positioned without the 36px header offset, so they render under the title.

**3C. Mermaid-parsed sections start undersized**

`src/lib/mermaidParser.ts:267`: sections created with `style: { width: 400, height: 300 }`.  
`src/hooks/node-operations/sectionBounds.ts`: `SECTION_MIN_WIDTH = 500`, `SECTION_MIN_HEIGHT = 400`.

Parsed sections start smaller than the minimum. The first render always looks cramped.

**3D. `fitSectionToChildren()` is reactive, not automatic**

`sectionOperations.ts:25-85` — `fitSectionToChildren()` only runs when explicitly called (after drag-drop). It doesn't run after ELK layout. So after a Mermaid import, sections aren't fitted — children sit inside an undersized parent.

---

## Fix Plan

### Fix 1 — Allow Nodes to Escape Groups (drag to boundary = exit)

**File:** `src/hooks/node-operations/useNodeDragOperations.ts` + `sectionOperations.ts`

In `onNodeDragStop()`, after the drag ends:
1. Check if the dragged node's **drop position is outside its current parent's bounds**
2. If yes → call `clearNodeParent(node)` to remove `parentId` and `extent`
3. If no → current `applySectionParenting()` logic stays the same

The check: use `getSectionContentBounds(parentSection, allNodes)` and test if the node's center is outside it. If outside → un-parent.

Also fix mermaid-parsed nodes: don't set `extent: 'parent'` at parse time. Set it only when the node is actually placed inside a section during layout (`mermaidParser.ts:273`). Let ELK position them, then apply parenting after layout positions are resolved.

**What this enables:** drag a node to the edge of a group and release → it pops out. The group auto-resizes to exclude it.

---

### Fix 2 — Fix Child Positioning (absolute → relative conversion)

**File:** `src/services/elkLayout.ts` — `buildPositionMap()` and the apply step

ELK outputs absolute coordinates. React Flow needs relative. The fix is to subtract the parent's absolute position from each child's position:

```typescript
// After collecting positionMap from ELK:
for (const node of nodes) {
  if (node.parentId) {
    const parentPos = positionMap.get(node.parentId);
    const childPos = positionMap.get(node.id);
    if (parentPos && childPos) {
      positionMap.set(node.id, {
        ...childPos,
        x: childPos.x - parentPos.x,
        y: childPos.y - parentPos.y,
      });
    }
  }
}
```

This needs to handle nested parents recursively (grandchild positions need both parent and grandparent subtracted). Use a depth-first traversal: process parents before children, accumulate offset.

---

### Fix 3 — Enable ELK Compound Layout for Groups

**File:** `src/services/elkLayout.ts` — `buildElkNode()`

Add ELK hierarchical layout options to group nodes:

```typescript
// For nodes with children:
layoutOptions: {
  'elk.padding': `[top=${SECTION_HEADER_HEIGHT + SECTION_PADDING_TOP},left=${SECTION_PADDING_X},bottom=${SECTION_PADDING_BOTTOM},right=${SECTION_PADDING_X}]`,
  'elk.algorithm': 'layered',           // lay out children with layered algorithm
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',  // treat group as compound node
  'elk.direction': resolvedDirection,   // inherit diagram direction
},
```

With `elk.hierarchyHandling: INCLUDE_CHILDREN`, ELK will actually space children inside the group instead of wrapping around their existing positions.

---

### Fix 4 — Unify Padding Constants

**Files:** `src/services/elkLayout.ts`, `src/services/elk-layout/options.ts`, `src/hooks/node-operations/sectionBounds.ts`

Import `SECTION_PADDING_X`, `SECTION_PADDING_BOTTOM`, `SECTION_HEADER_HEIGHT` from `sectionBounds.ts` into the ELK layout files. Use these constants everywhere instead of hardcoded numbers.

```typescript
// In elkLayout.ts, replace:
'elk.padding': '[top=40,left=20,bottom=20,right=20]'

// With:
import { SECTION_PADDING_X, SECTION_PADDING_BOTTOM, SECTION_HEADER_HEIGHT } from '@/hooks/node-operations/sectionBounds';
// top = header height (36) + content top padding (16)
`'elk.padding': '[top=${SECTION_HEADER_HEIGHT + 16},left=${SECTION_PADDING_X},bottom=${SECTION_PADDING_BOTTOM},right=${SECTION_PADDING_X}]'`
```

Single source of truth. Change it once, applies everywhere.

---

### Fix 5 — Fix Initial Section Size from Mermaid

**File:** `src/lib/mermaidParser.ts:267`

Change initial section dimensions to match the actual minimums:

```typescript
// Before:
style: { width: 400, height: 300 }

// After:
style: { width: SECTION_MIN_WIDTH, height: SECTION_MIN_HEIGHT }
```

Import `SECTION_MIN_WIDTH`, `SECTION_MIN_HEIGHT` from `sectionBounds.ts`.

---

### Fix 6 — Auto-fit Sections After ELK Layout

**File:** wherever `getElkLayout()` result is applied (likely `useFlowCanvasPaste.ts` or equivalent)

After ELK positions are applied to nodes, call `autoFitSectionsToChildren()` automatically. This resizes each section to wrap its children with correct padding — regardless of whether ELK got the size exactly right.

```typescript
const { nodes: laidOutNodes, edges: laidOutEdges } = await getElkLayout(enrichedNodes, edges, options);
const fittedNodes = autoFitSectionsToChildren(laidOutNodes);  // add this
setNodes(fittedNodes);
setEdges(laidOutEdges);
```

This is a safety net — even if ELK's group sizing is slightly off, the final result is always correctly fitted.

---

## Fix Priority & Order

Do in this order — each fix makes the next one safer:

| # | Fix | File(s) | Risk | Impact |
|---|-----|---------|------|--------|
| 1 | Unify padding constants (Fix 4) | `elkLayout.ts`, `options.ts` | Low | Foundation for all sizing fixes |
| 2 | Fix initial mermaid section size (Fix 5) | `mermaidParser.ts` | Low | Sections no longer start undersized |
| 3 | Auto-fit after layout (Fix 6) | Import orchestration | Low | Sections always wrap children correctly |
| 4 | Absolute → relative coordinate conversion (Fix 2) | `elkLayout.ts` | Medium | Fixes overlap completely |
| 5 | ELK compound layout options (Fix 3) | `elkLayout.ts` | Medium | ELK properly spaces children |
| 6 | Allow escaping groups (Fix 1) | `useNodeDragOperations.ts`, `sectionOperations.ts`, `mermaidParser.ts` | Medium | Drag-out-of-group works |

---

## Expected Result After All Fixes

- Paste a mermaid diagram with subgraphs → children are spaced correctly inside groups, no overlap
- Drag a node to the edge of a group → it escapes, group shrinks to fit remaining children
- Groups always show the correct size — header visible, no children hidden under title
- Padding is consistent: ELK, hit-testing, and rendering all use the same numbers
- Section node titles never overlap with children

---

## Files Touch Map

| File | What Changes |
|---|---|
| `src/lib/nodeParent.ts` | Don't set `extent: 'parent'` at parse time; set only post-layout |
| `src/lib/mermaidParser.ts` | Use `SECTION_MIN_WIDTH/HEIGHT` for initial sizes; remove `extent` from parse |
| `src/services/elkLayout.ts` | Absolute→relative coordinate fix; compound layout options; import shared padding |
| `src/services/elk-layout/options.ts` | Use shared padding constants |
| `src/hooks/node-operations/useNodeDragOperations.ts` | Detect drag-outside-parent, call `clearNodeParent` |
| `src/hooks/node-operations/sectionOperations.ts` | Call `autoFitSectionsToChildren` after layout |
| `src/hooks/node-operations/sectionBounds.ts` | Export constants for reuse (may already export) |
