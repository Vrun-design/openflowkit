# FlowMind AI — Node UX Master Spec
> Goal: Best-in-class diagramming experience — FigJam-level ease, Lucidchart-level power, and better than everything else for technical diagrams.

---

## Table of Contents
1. [Current State Audit](#1-current-state-audit)
2. [What the Best Tools Do](#2-what-the-best-tools-do)
3. [The Core Bugs (Fix These First)](#3-the-core-bugs-fix-these-first)
4. [Node-by-Node Spec](#4-node-by-node-spec)
5. [Properties Panel Spec](#5-properties-panel-spec)
6. [Connector & Edge UX Spec](#6-connector--edge-ux-spec)
7. [Keyboard Shortcut System](#7-keyboard-shortcut-system)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Current State Audit

### Node Inventory

| Node Type | Component File | Inline Edit Works | Properties Panel | Connector Creates Right Type |
|-----------|---------------|-------------------|-----------------|------------------------------|
| `process` | CustomNode.tsx | ✅ | ✅ Full | ✅ (is default) |
| `start` | CustomNode.tsx | ✅ | ✅ | ❌ → creates process |
| `end` | CustomNode.tsx | ✅ | ✅ | ❌ → creates process |
| `decision` | CustomNode.tsx | ✅ | ✅ | ❌ → creates process |
| `custom` | CustomNode.tsx | ✅ | ✅ | ❌ → creates process |
| `class` | ClassNode.tsx | ⚠️ Partial (attrs inline only) | ❌ No class fields in panel | ❌ → creates process |
| `er_entity` | EntityNode.tsx | ⚠️ Partial (fields inline only) | ❌ No ER fields in panel | ❌ → creates process |
| `architecture` | ArchitectureNode.tsx | ⚠️ Label only | ⚠️ No search, bad grouping | ❌ → creates process |
| `journey` | JourneyNode.tsx | ✅ | ⚠️ No score picker, no rating | ❌ → creates process |
| `mindmap` | MindmapNode.tsx | ✅ | ⚠️ No color per branch | ✅ Correct |
| `annotation` | (CustomNode) | ✅ | ⚠️ Yellow only, no variants | ❌ → creates process |
| `section` | (CustomNode) | ✅ | ⚠️ No click-through to children | N/A |
| `text` | (CustomNode) | ✅ | ⚠️ No rich text formatting | N/A |
| `group` | (CustomNode) | ✅ | ⚠️ Collapse state lost on export | N/A |
| `swimlane` | (CustomNode) | ✅ | ⚠️ Basic | N/A |
| `browser` | BrowserNode.tsx | ⚠️ Label as URL only | ⚠️ Variant picker only | ❌ → creates process |
| `mobile` | MobileNode.tsx | ⚠️ Label hidden | ⚠️ Variant picker only | ❌ → creates process |
| `image` | ImageNode.tsx | N/A | ⚠️ No crop/frame/caption | N/A |

### Root Cause of the Connector Bug

In `src/lib/connectCreationPolicy.ts`, line 18:
```ts
// Current — WRONG for all non-mindmap types
return { type: 'process', shape: 'rounded' };
```

This single line causes every `class`, `er_entity`, `architecture`, `journey` connector drag to create a generic shape instead of the contextually correct node type.

### Properties Panel — Cross-Cutting Bugs

1. **`Ctrl+A` / `Cmd+A` inside any text input** → triggers canvas select-all. The `stopPropagation()` call in `useInlineNodeTextEdit.ts:79` only runs on `handleKeyDown`, not inside properties panel `<textarea>` elements which directly bubble keyboard events.

2. **Enter key in properties panel** → does nothing for text areas in `NodeProperties.tsx`. Changes are `onChange`-based (fire on every keystroke), but users still expect Enter to "commit" and dismiss focus. There's no visual signal that changes were saved.

3. **Class and ER nodes have zero specialized sections** in the properties panel — attributes, methods, and fields are only editable by clicking directly on the canvas node. If the panel is open, there's no way to manage them there.

4. **Tab through attributes** in ClassNode and EntityNode: pressing Tab inside an attribute input currently defocuses (browser default). It should move to the next attribute/field row, and `Shift+Tab` should go back.

5. **`Ctrl+Enter` to add new row** doesn't exist. draw.io implements this and it's the best-in-class pattern for adding rows to structured nodes.

---

## 2. What the Best Tools Do

### FigJam — Why It Feels Easy

FigJam removes the problem entirely by having almost no properties. The key lesson is **contextual toolbars over persistent sidebars**.

- **`Cmd+Return`** = instantly create a connected node to the right, drop into text-edit mode. Zero clicks, one shortcut, done.
- **Hover `+` buttons** appear at edge midpoints on any selected shape. Clicking creates a new connected shape of the same type.
- **No properties panel to navigate**. Color, connector style — all accessible from a 4-button floating toolbar.
- **Double-click** to enter text edit anywhere. Start typing after single-click also works.
- The insight: **reduce the surface area of things that need configuration**.

### draw.io — Best for Technical Diagrams

- **Click directional blue arrow** on any shape → clones it (same type + same content structure) with a connector. This is different from connector drag.
- **Drag connector to canvas** → no new node (just a dangling connector).
- **UML Class node:** click row → double-click → in edit mode. `Ctrl+Enter` = add new row below selected row. `Tab` moves between rows inside the container. `F2` starts editing the selected row.
- **ER Table node:** same as class. Format panel (Arrange tab) shows "Insert Row After" / "Insert Row Above" buttons.
- **Edit Style** (`E` key) = raw CSS-like style string editor — power user escape hatch.
- **Tab** globally cycles between shapes (and into container children).

### Lucidchart — Best Collaborative Diagramming

- Click shape → click specific row → type to edit. Second click required for structured shapes.
- Adding rows: Advanced Shape Menu dropdown (not keyboard accessible — a documented pain point in their community forums).
- **Tab between ER entity rows** works — confirmed by community docs.
- Connector drag to empty canvas = nothing (only connectors to existing shapes).
- Copy/paste style: no keyboard shortcut. Manual "copy format" tool in toolbar.

### Miro — Best Whiteboard

- Hover shape → **creates same-type node via proximity** when dragging connector near empty space.
- Two connector types: **Fixed** (anchored to a specific edge point, doesn't reflow) vs **Dynamic** (center-linked, reflows when shapes move). This is a meaningful distinction we should steal.
- **`Ctrl+Alt+C` / `Cmd+Alt+C`** = copy style. **`Ctrl+Alt+V` / `Cmd+Alt+V`** = paste style. This is the right shortcut for style copy-paste.
- Sticky notes: 6 color variants (yellow, green, blue, pink, purple, orange). Keys `1-6` to switch color.

### Whimsical — Best Keyboard-Driven

- **`Alt+Arrow` (Option+Arrow on Mac)** = create connected same-type node in that direction. Works for all 4 cardinal directions. Drops into text-edit mode immediately.
- Left-hand keyboard optimization — all common operations reachable without moving mouse hand.
- Shape type can be changed inline after creation (rectangle → diamond) without re-creating.
- No connector drag to empty canvas = no node creation (same as most tools).

### Notion / Airtable — Best List/Table Editing Patterns

- **Ghost row**: a faint `+ Add row` row always visible at bottom of any list. Clicking it creates a new row and enters edit mode on the first field.
- **Tab between cells**: Tab moves right, Shift+Tab moves left, Enter confirms and moves down, Escape cancels.
- **Inline editing**: click to edit, typing replaces selection, Escape to cancel.
- **Type-ahead dropdowns**: for field types, a search input is always available.

### Eraser.io — AI-First Diagramming

- Code-first: diagrams are edited as text (their own DSL) and rendered live.
- **Entity diagrams** in their DSL: `table User { id: UUID [pk] email: VARCHAR }` — the visual representation is generated from code.
- Their insight: structured nodes (ER, class) are better edited as text than as visual click-targets.
- We could offer a **"code mode"** for ER and class nodes that lets power users type the DSL.

### Framer / Sketch / Penpot — Property Panel Patterns

- **Framer**: Inspector organized as Code | Design tabs. Design tab: Layout → Appearance → Text → Effects. Each section auto-expands when relevant.
- **Sketch**: Inspector always visible on right. Organized as: Alignment → Style (fill, border, shadow, blur) → Text → Prototyping. Sections never collapse — they just hide irrelevant fields.
- **Penpot**: Design panel with Fill, Stroke, Shadow, Blur, Typography all as expandable rows. Each row has a `+` button to add an instance of that property.
- **Key pattern**: show all sections simultaneously (never force user to open an accordion to find Color). Collapse only the least-used sections by default.

---

## 3. The Core Bugs (Fix These First)

### BUG-1: Smart Connector Creation (CRITICAL)
**File:** `src/lib/connectCreationPolicy.ts`

**Current:**
```ts
export function getDefaultConnectedNodeSpec(sourceNodeType?: string | null): ConnectedNodeSpec {
  if (isMindmapConnectorSource(sourceNodeType)) {
    return { type: 'mindmap' };
  }
  return { type: 'process', shape: 'rounded' }; // ← THIS IS THE BUG
}
```

**Fix:**
```ts
const SELF_PROPAGATING_TYPES: Record<string, ConnectedNodeSpec> = {
  class:        { type: 'class' },
  er_entity:    { type: 'er_entity' },
  architecture: { type: 'architecture' },
  journey:      { type: 'journey' },
  annotation:   { type: 'annotation' },
  start:        { type: 'process', shape: 'rounded' }, // start→process is intentional
  end:          { type: 'process', shape: 'rounded' }, // end→process is intentional
  decision:     { type: 'process', shape: 'rounded' }, // but show decision in menu too
};

export function getDefaultConnectedNodeSpec(sourceNodeType?: string | null): ConnectedNodeSpec {
  if (isMindmapConnectorSource(sourceNodeType)) {
    return { type: 'mindmap' };
  }
  return SELF_PROPAGATING_TYPES[sourceNodeType ?? ''] ?? { type: 'process', shape: 'rounded' };
}
```

**Also update ConnectMenu.tsx** to show context-aware options first:
- Source is `class` → first option: "Class Node"
- Source is `er_entity` → first option: "Entity"
- Source is `architecture` → first option: "Architecture Node"
- Source is `journey` → first option: "Journey Step"
- Source is `decision` → first 2 options: "Yes branch" (process), "No branch" (process) — auto-label the edge

---

### BUG-2: Keyboard Events in Text Inputs (CRITICAL)
**Problem:** `Ctrl+A`/`Cmd+A` inside properties panel textareas bubbles up and triggers canvas select-all. Also, `Enter` in properties panel inputs doesn't trigger any action.

**Fix locations:**
- `src/components/properties/NodeContentSection.tsx` — the label and subLabel textarea elements need `onKeyDown` to call `event.stopPropagation()` for `Ctrl+A`, `Cmd+A`.
- All `<textarea>` and `<input>` elements in properties panel need: `onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'a') e.stopPropagation(); }}`
- Properties panel textareas should commit on `Cmd+Enter` / `Ctrl+Enter` and blur.

---

### BUG-3: No Class/ER Sections in Properties Panel (CRITICAL)
**Problem:** Selecting a ClassNode shows shape/color panels but no way to edit attributes or methods from the panel. Same for EntityNode (erFields).

**Fix:** Add node-type-specific sections to `NodeProperties.tsx`:
- When `selectedNode.type === 'class'` → render `<ClassNodeSection>` with attributes list + methods list, each with add/remove/reorder
- When `selectedNode.type === 'er_entity'` → render `<EntityNodeSection>` with fields list including PK/FK/type
- When `selectedNode.type === 'architecture'` → render `<ArchitectureNodeSection>` with quick-search service picker
- When `selectedNode.type === 'journey'` → render `<JourneyNodeSection>` with star-rating score picker

---

### BUG-4: Tab Key in Structured Node Lists (HIGH)
**Problem:** Tab inside a ClassNode attribute input defocuses (browser default). Should move to next attribute.

**Fix:** In ClassNode.tsx and EntityNode.tsx, inside attribute/field `onKeyDown`:
```ts
if (event.key === 'Tab' && !event.shiftKey) {
  event.preventDefault();
  commitCurrentEdit();
  beginEditAtIndex(currentIndex + 1); // wraps to "add new" if at last
}
if (event.key === 'Tab' && event.shiftKey) {
  event.preventDefault();
  commitCurrentEdit();
  beginEditAtIndex(currentIndex - 1); // wraps to last if at first
}
if (event.key === 'Enter') {
  event.preventDefault();
  commitCurrentEdit();
  beginEditAtIndex(currentIndex + 1); // same as Tab (draw.io pattern)
}
```

---

### BUG-5: Score Field in JourneyNode (HIGH)
**Problem:** `journeyScore` is stored as a number (0-5) but there's no visual rating UI — users can only see `"3/5"` text. No way to change it without the properties panel.

**Fix:** Replace score display with clickable stars (★★★☆☆) directly on the node:
```tsx
// Inline on JourneyNode
<div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
  {[1, 2, 3, 4, 5].map(star => (
    <button key={star} onClick={() => updateScore(star)}>
      {star <= (score || 0) ? '★' : '☆'}
    </button>
  ))}
</div>
```

---

## 4. Node-by-Node Spec

### 4.1 ClassNode (UML Class Diagram)

**Current state:** Inline editing of label, attributes, methods. No stereotype editing unless already set. No reordering. Properties panel shows only generic shape/color sections.

**Target state:**

#### Visual Design
```
┌─────────────────────────────┐
│ <<interface>>               │  ← stereotype, editable on click
│ ClassName                   │  ← label, double-click to edit
├─────────────────────────────┤
│ + id: UUID                  │  ← attribute rows with visibility prefix
│ + name: String              │     click to edit, Enter to confirm
│ # email: String             │     Tab to move to next
│ - password: String          │
│ ⋯ Add attribute             │  ← ghost row (always visible)
├─────────────────────────────┤
│ + getName(): String         │  ← method rows
│ + setName(name: String): void│
│ ⋯ Add method                │  ← ghost row
└─────────────────────────────┘
```

#### Keyboard Behavior
- `Enter` → commit current field, move to next field in same section
- `Ctrl+Enter` → commit + add new row below
- `Tab` → commit + move to next row
- `Shift+Tab` → commit + move to previous row
- `Escape` → cancel edit, revert to previous value
- `Backspace` on empty field → delete the row
- `⌥+↑` / `⌥+↓` → reorder row within section (Option+Arrow = move row)

#### Visibility Prefix Helper
When editing an attribute that starts with a recognized UML visibility prefix, show inline autocomplete:
- `+` → public
- `-` → private
- `#` → protected
- `~` → package

#### "Ghost Row" Pattern (Notion/Airtable)
Always show a faint "+ Add attribute" and "+ Add method" row at the bottom of each section. It's visible but visually de-emphasized (slate-300, not slate-700). Clicking it starts a new edit at a new empty row.

#### Stereotype
If `classStereotype` is empty, show a `<<Add stereotype>>` ghost above the class name (visible on hover/select). Clicking it starts editing.

#### Properties Panel — ClassNode Section
When a ClassNode is selected, the panel should show:
```
▸ Class Definition
  Stereotype: [<<interface>>    ]

  Attributes             [+]
  ┌─────────────────────────────┐
  │ ≡ + id: UUID          [✕]  │
  │ ≡ + name: String      [✕]  │
  └─────────────────────────────┘

  Methods                [+]
  ┌─────────────────────────────┐
  │ ≡ + getName(): String [✕]  │
  └─────────────────────────────┘
```
Where `≡` is a drag handle for reordering. Panel and inline node stay in sync.

#### ConnectMenu when source is ClassNode
First option: "Class Node" (same type)
Second option: "Interface" (class with `classStereotype: 'interface'` pre-set)
Third option: "Process" (generic fallback)

---

### 4.2 EntityNode (ER Diagram)

**Current state:** Inline field editing (text only), no field types, no PK/FK indicators, properties panel has nothing ER-specific.

**Target state:**

#### Visual Design
```
┌─────────────────────────────┐
│ 🔑 users                    │  ← table name, editable
├─────────────────────────────┤
│ 🔑 id          UUID         │  ← PK row (key icon, bold)
│    email       VARCHAR(255) │  ← field name + type
│    name        VARCHAR(100) │
│    created_at  TIMESTAMP    │
│ FK user_role_id INT         │  ← FK row
│ ⋯ Add field                 │  ← ghost row
└─────────────────────────────┘
```

#### Field Format
Each field has:
- **Visibility/constraint prefix icon:** 🔑 (PK), FK (foreign key), NN (not null), UQ (unique)
- **Field name** (editable inline)
- **Data type** (editable inline, with type dropdown on click)

#### Type Dropdown
When clicking the data type portion, show a searchable dropdown:
```
VARCHAR | INT | BIGINT | UUID | BOOLEAN | TIMESTAMP | TEXT | JSON | FLOAT | DATE | ENUM
```
With a search input at top. Common types shown first based on what's already in the table.

#### PK/FK/NN/UQ Toggles
Right side of each row (visible on hover/select of row):
```
[PK] [FK] [NN] [UQ]
```
Each is a toggleable pill. PK = auto-selects NN. FK shows a link icon and a field to specify referenced table.

#### Keyboard Behavior
Same as ClassNode:
- `Tab` / `Enter` = commit + next field
- `Ctrl+Enter` = commit + add new field below
- `Escape` = cancel
- `Backspace` on empty = delete row

#### Properties Panel — EntityNode Section
```
▸ Entity Definition
  Table Name: [users          ]

  Fields                  [+]
  ┌──────────────────────────────────┐
  │ ≡ [🔑] id       [UUID       ▾] [✕] │
  │ ≡ [  ] email    [VARCHAR(255)▾] [✕] │
  └──────────────────────────────────┘

  [Generate sample fields for "users"]  ← AI assist button
```

#### Crow's Foot Notation on Edges
When an edge connects two ER entities, the edge properties panel should show:
```
Relationship:  [one  ▾] ──── [many ▾]
Source:        ◇────        Mandatory/Optional
Target:              ────<  Mandatory/Optional
```
This controls the visual endpoints (crow's foot vs. single line vs. open circle).

#### ConnectMenu when source is EntityNode
First option: "Entity" (er_entity, same type)
Second option: "Weak Entity" (er_entity with `erEntityType: 'weak'`)
Third option: "Process" (generic)

---

### 4.3 ArchitectureNode (Cloud Architecture)

**Current state:** Shows provider/resourceType/environment/zone/trustDomain as metadata badges. Icon from shape library or emoji fallback. Properties panel works but has no search, no quick provider switch.

**Target state:**

#### Visual Design
```
┌─────────────────────────────────┐
│ [AWS Lambda]  service           │  ← provider icon + badge, resource type
│                                 │
│   [Lambda icon]                 │  ← large, clear icon
│   processPayment                │  ← label, double-click to edit
│                                 │
│ production  us-east-1  PCI      │  ← environment, zone, trust domain
└─────────────────────────────────┘
```

#### Quick Service Search
On the node itself (when selected), show a `🔍` icon in the top-right corner. Clicking it opens an inline search input that searches the shape library:
```
[🔍 Search AWS services...     ]
  Lambda
  S3
  DynamoDB
  RDS
  ...
```
Typing immediately filters. Enter selects. This is the single biggest UX win for arch nodes.

#### Provider Switcher
In properties panel: pill tabs at top of Architecture section:
```
[AWS] [Azure] [GCP] [K8s] [Custom]
```
Switching provider shows that provider's service catalog.

#### Environment / Zone / Trust Domain
Convert from free-text inputs to:
- Environment: Dropdown with presets (production, staging, development, testing) + custom
- Zone: Dropdown with common values (us-east-1, eu-west-1, etc.) + custom
- Trust Domain: Free text (stays as is)

#### Group vs Service vs Junction
The `archResourceType` selector should be visually prominent:
- **service** → individual service card (current default)
- **group** → a container/boundary box (visually distinct, larger, dashed border)
- **junction** → a small router/hub node (compact, circular)

#### ConnectMenu when source is ArchitectureNode
First option: Same provider, same resource type ("Another Lambda" / "Another S3...")
Second option: Same provider, any service (show provider search)
Third option: Generic "Service"

---

### 4.4 JourneyNode (User Journey)

**Current state:** Title, actor, section (inline editable). Score shown as "3/5" text. Properties panel shows generic sections.

**Target state:**

#### Visual Design
```
┌─────────────────────────────────┐
│ [DISCOVERY]                  ①  │  ← section (editable), step number
├─────────────────────────────────┤
│  Click "Get Started" button     │  ← task/label, click to edit
│                                 │
│  👤 New Visitor                 │  ← actor, click to edit
│                                 │
│  ★★★☆☆           😊           │  ← star rating + emotion icon
└─────────────────────────────────┘
```

#### Star Rating
Replace `3/5` number badge with 5 clickable stars directly on the node. Click a star to set score. Stars change color based on score:
- 1-2: red/rose
- 3: amber
- 4-5: emerald

#### Emotion Mapping (auto from score)
Add an emotion icon that maps from score:
- 1: 😞 (score 1)
- 2: 😕 (score 2)
- 3: 😐 (score 3)
- 4: 😊 (score 4)
- 5: 🤩 (score 5)

#### Step Number
Auto-numbered based on position in the flow (left to right). Shown as a small circle in top-right corner. Non-editable (derived from graph order).

#### Section as Phase Swimlane
When multiple journey nodes have the same `journeySection`, group them visually under a shared header band. This gives the swimlane feel without needing a separate SwimlaneNode.

#### ConnectMenu when source is JourneyNode
First option: "Journey Step" (same type)
Second option: "Decision Point" (decision node)
Third option: "Annotation / Note"

---

### 4.5 MindmapNode

**Current state:** Good UX. Root node has `+` buttons on left/right. Child nodes have `+` for sibling (top) and `+` for child (outward side). Tab creates sibling. Enter commits.

**Target state (improvements only):**

#### Per-Branch Colors
Allow setting color per branch (all descendants of a node inherit its color). Color picker in properties panel applies to "this branch and all children".

#### Collapse/Expand Subtree
Add a `▶` / `▼` toggle button on any node that has children. When collapsed, all descendants are hidden and edges are hidden. The node shows a badge like `(+3)` indicating hidden children count.

#### `Alt+Arrow` for Sibling Creation
Following Whimsical: `Alt+↓` = create sibling below. `Alt+→` = create child to the right. `Alt+←` = create child to the left. Drops into text-edit mode immediately.

#### Multi-line Labels
Already supported. But add visual hint: on hover of a multiline mindmap node, show a resize handle at the bottom.

---

### 4.6 AnnotationNode (Sticky Note)

**Current state:** Yellow sticky note with multiline text. No color variants.

**Target state:**

#### 6 Color Variants
```
Yellow   Green   Blue   Pink   Purple   Orange
  1        2      3      4       5        6
```
Press `1-6` when annotation is selected to cycle colors.

Color tokens (matching Tailwind):
- Yellow: `bg-amber-50 border-amber-200`
- Green: `bg-emerald-50 border-emerald-200`
- Blue: `bg-blue-50 border-blue-200`
- Pink: `bg-pink-50 border-pink-200`
- Purple: `bg-violet-50 border-violet-200`
- Orange: `bg-orange-50 border-orange-200`

#### Auto-Resize to Content
The node should auto-grow vertically as text is typed. Set a minimum height (e.g. 80px) and no maximum — the node expands as content grows.

#### Floating Color Picker
When annotation is selected, a small color dot row appears above the node (like FigJam's sticky color picker). 6 colored dots in a row. Clicking one changes color immediately.

---

### 4.7 Decision Node

**Current state:** Diamond shape with generic handles. Connector creates a `process` node.

**Target state:**

#### Auto-Label Branches
When an edge is created FROM a decision node, automatically prompt to label it or auto-assign:
- First edge created: defaults to "Yes"
- Second edge created: defaults to "No"
- Third+ edges: defaults to "Case N"

#### Visual Branch Indicator
Show faint "Yes" and "No" labels on the two primary output handles (bottom and right) of the diamond when the node is selected. These are ghost labels that become real edge labels when a connection is made.

#### ConnectMenu for Decision
First option: "Yes branch → Process"
Second option: "No branch → Process"
Third option: "Yes branch → Decision" (nested decision)
Fourth option: "Annotation"

---

### 4.8 BrowserNode & MobileNode (Wireframes)

**Current state:** Browser has 5 variants (landing, dashboard, form, cookie, pricing, modal). Mobile has 5 variants (login, social, chat, product, list/profile). Static SVG-like illustrations. Label shows as URL bar text in browser.

**Target state:**

#### Additional Browser Variants
Add to the existing set:
- `onboarding` — stepped wizard UI
- `error` — 404 / error page
- `settings` — settings panel with left nav + content area
- `checkout` — payment form with order summary sidebar
- `blog` — article layout with sidebar

#### Additional Mobile Variants
Add:
- `onboarding` — swipeable onboarding slides
- `notifications` — notification center
- `map` — map view with pins
- `settings` — settings list with toggles
- `empty-state` — empty state illustration

#### Editable URL Bar (Browser)
The browser URL bar currently shows `data.label`. Make it properly editable: click the URL bar area → enters edit mode for the label. The label IS the URL.

#### Annotation Layer
Allow placing sticky notes and text nodes "inside" a wireframe node (children). These would overlay on top of the wireframe illustration.

#### ConnectMenu for Browser/Mobile
First option: "Same screen" (same type + same variant)
Second option: "Different screen" (same type, opens variant picker)
Third option: "Flow step" (process node)

---

### 4.9 SectionNode

**Current state:** Dashed border container. 5 color options. Children can be dragged in/out.

**Target state:**

#### Click-Through Behavior
Clicking on the background of a section should NOT select the section if there are children. Instead it should click-through to select whatever is underneath. To select the section itself, click the border/edge or the header label area.

Implementation: Add `pointerEvents: 'none'` to the section body, keep `pointerEvents: 'auto'` only on the border and label.

#### Collapsible Sections
Double-click the section header → collapses to just the header bar. Children are hidden (opacity 0, not removed). Shows child count badge.

#### Nested Sections
Allow sections inside sections. The inner section should have a slightly different visual style (lighter dashed border, smaller padding).

---

### 4.10 ImageNode

**Current state:** Displays uploaded image with aspect ratio preservation. No crop, no frame.

**Target state:**

#### Caption
Add `data.caption` field: a small text label below the image. Editable by clicking below the image.

#### Frame Styles
In properties panel, add frame style options:
- None (current)
- Shadow
- Rounded (already default)
- Square corners
- Border (thin 1px stroke in chosen color)

#### Object Fit
Properties panel toggle: Fill / Fit / Actual size

---

## 5. Properties Panel Spec

### Organization Principles (from Sketch/Framer research)

**DON'T** hide everything behind accordions. **DO** show the most relevant section expanded by default based on node type. Hide only the least-used sections.

**Default expansion by node type:**

| Node Type | Default open section |
|-----------|---------------------|
| `process`, `custom`, `start`, `end`, `decision` | Shape + Content |
| `class` | Class Definition |
| `er_entity` | Entity Definition |
| `architecture` | Architecture |
| `journey` | Journey |
| `mindmap` | Content + Color |
| `annotation` | Content |
| `text` | Content + Typography |
| `browser`, `mobile` | Variant |
| `image` | Image Settings |
| `section` | Content |

### Section Order (top to bottom)

1. **Node-specific section** (ClassNode → "Class Definition", EntityNode → "Entity Definition", etc.)
2. **Content** (label, subLabel) — always shown unless wireframe/image
3. **Shape** (shape selector) — only for generic shapes
4. **Color & Style** (color palette + color mode)
5. **Typography** (font, size, weight, style, alignment)
6. **Icon** (icon picker + custom icon upload)
7. **Image** (image upload + settings)
8. **Layer** (layer assignment)

### Keyboard Behavior in Panel

All text inputs in the properties panel must:
- `Cmd/Ctrl + A` → select all text within the input only (stopPropagation, not select all canvas nodes)
- `Escape` → blur the input (clear focus, don't close panel)
- `Cmd+Enter` / `Ctrl+Enter` → blur the input (commit and dismiss focus)
- `Tab` → move to next input in the panel

### Multi-Node Editing

When 2+ nodes are selected:
- Show a simplified panel with only the properties common to all (color, font size, font weight)
- Fields that differ across selection show "Mixed" placeholder and `—` as value
- Changing any field applies to ALL selected nodes
- Count badge: "3 nodes selected"

### Copy Style / Paste Style

- `Cmd+Shift+C` → copies the visual style of the selected node (color, shape, font, colorMode) to a clipboard buffer
- `Cmd+Shift+V` when node(s) selected → pastes the style (color, shape, font) to all selected nodes
- Visual indicator: a small "Style copied" toast after Cmd+Shift+C

### Node Type Switcher

Right-click any node → context menu shows "Change type" submenu:
```
Change type
  ├── Process (rounded)     [current ✓]
  ├── Decision (diamond)
  ├── Database (cylinder)
  ├── Callout (rounded)
  └── Custom...
```
Changing type preserves: label, subLabel, connections, position, size.
Loses: type-specific data (classAttributes when switching from class → process).
Shows a warning if type-specific data would be lost.

---

## 6. Connector & Edge UX Spec

### Connector Drag to Empty Canvas

**Target behavior:**

1. User starts dragging from any node's handle
2. A live connector appears, following the cursor
3. If dropped on another node → connects to that node (current behavior, works)
4. If dropped on empty canvas → shows ConnectMenu at drop position

ConnectMenu options should be **context-aware** based on the source node type:

| Source Type | ConnectMenu First Option |
|-------------|--------------------------|
| `class` | Class Node |
| `er_entity` | Entity |
| `architecture` | Architecture Node (same provider) |
| `journey` | Journey Step |
| `decision` | Yes → Process / No → Process |
| `mindmap` | Topic (already correct) |
| `process`, `custom` | Process (generic, current behavior) |
| `annotation` | Annotation (same color) |
| `browser` / `mobile` | Same screen |

### Hover `+` Quick Create Buttons

On any selected node, show small `+` pills at the 4 cardinal positions (top, right, bottom, left):
```
         [+]
          ↑
[+] ← [  NODE  ] → [+]
          ↓
         [+]
```

These are separate from the connector handles. Clicking a `+` pill:
1. Creates a new node of the same type as the source (using `getDefaultConnectedNodeSpec`)
2. Positions it in that direction (right = x+300, down = y+200, etc.)
3. Creates a connector between them
4. Immediately enters text-edit mode on the new node label

This is the FigJam / draw.io "click the directional arrow" pattern — the fastest way to build a diagram.

**Note:** These should NOT show when the node is in text-edit mode. They should appear only when the node is selected but not editing.

### `Alt+Arrow` Keyboard Shortcut

Following Whimsical: when a node is selected (not editing):
- `Alt+→` / `Option+→` → create same-type node to the right, connect it, enter text-edit mode
- `Alt+↓` / `Option+↓` → create same-type node below, connect it, enter text-edit mode
- `Alt+←` / `Option+←` → create same-type node to the left, connect it, enter text-edit mode
- `Alt+↑` / `Option+↑` → create same-type node above, connect it, enter text-edit mode

For mindmap nodes specifically, `Alt+→` = add child topic to the right, `Alt+←` = add child to the left, `Alt+↓` = add sibling below.

### Edge Labels

**Current:** No standard way to add labels to edges.

**Target:**
- Double-click any edge → enter text edit mode on the edge label
- Edge label appears as a small pill centered on the edge
- `Escape` → cancel, `Enter` → confirm
- Edge label is styled with a white background, thin border, matching the edge color

### Edge Properties Panel

When an edge is selected, show a simplified properties panel:
```
▸ Connection
  Style:  [─────] [– – –] [·····]   ← solid / dashed / dotted
  Weight: [1px] [2px] [3px]
  Color:  [●●●●●]

▸ Endpoints
  Source:  [→ Arrow] [○ Circle] [◇ Diamond] [■ Square] [None]
  Target:  [→ Arrow] [○ Circle] [◇ Diamond] [■ Square] [None]

▸ Routing
  [Straight] [Bezier] [Step] [Smoothstep]

▸ ER Relationship (shown only when connecting er_entity nodes)
  Source cardinality: [1 ▾] [0 or 1 ▾]
  Target cardinality: [many ▾] [1 ▾]
  Notation: [Crow's foot ▾]
```

### Fixed vs Dynamic Connections (Miro pattern)

Show a toggle in the edge properties panel:
- **Dynamic** (default): connector attaches to the nearest edge point and reflows when shapes move
- **Fixed**: connector stays attached to a specific handle point, doesn't reflow

---

## 7. Keyboard Shortcut System

### Node Creation & Connection

| Shortcut | Action |
|----------|--------|
| `Alt+→` | Create same-type node to the right, connect |
| `Alt+↓` | Create same-type node below, connect |
| `Alt+←` | Create same-type node to the left, connect |
| `Alt+↑` | Create same-type node above, connect |
| `Tab` (on selected node) | Create connected sibling (existing) |
| `Enter` (on selected node, not editing) | Enter text-edit mode |
| `F2` (on selected node) | Enter text-edit mode (draw.io pattern) |
| `Escape` (while editing) | Cancel edit, restore original |
| `Escape` (while selecting) | Deselect |

### Inline List Editing (Class, ER)

| Shortcut | Action |
|----------|--------|
| `Enter` | Commit row + move to next row |
| `Tab` | Commit row + move to next row |
| `Shift+Tab` | Commit row + move to previous row |
| `Ctrl+Enter` | Commit row + add new row below |
| `Escape` | Cancel edit, revert row |
| `Backspace` (on empty row) | Delete row + move up |
| `Alt+↑` | Move row up within section |
| `Alt+↓` | Move row down within section |

### Style & Formatting

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+C` | Copy node style |
| `Cmd+Shift+V` | Paste node style |
| `1`-`6` (annotation selected) | Change sticky note color |
| `Cmd+D` | Duplicate selected node(s) |
| `Cmd+G` | Group selected nodes |
| `Cmd+Shift+G` | Ungroup |
| `[` | Send backward |
| `]` | Bring forward |

### Canvas & Navigation

| Shortcut | Action |
|----------|--------|
| `Cmd+A` | Select all (when no input focused) |
| `Ctrl+A` inside input | Select all text in input only |
| `Space+drag` | Pan canvas |
| `Cmd+Shift+F` | Fit to screen |
| `Cmd+=` / `Cmd+-` | Zoom in / out |
| `Cmd+0` | Reset zoom to 100% |

### Mindmap-Specific

| Shortcut | Action |
|----------|--------|
| `Tab` | Create child topic |
| `Enter` | Create sibling topic |
| `Alt+→` | Create child to right |
| `Alt+←` | Create child to left |
| `Alt+↓` | Create sibling below |
| `Cmd+.` | Collapse subtree |
| `Cmd+,` | Expand subtree |

---

## 8. Implementation Roadmap

### Phase 1 — Fix the Breaks (Week 1-2)
*These are bugs, not features. Ship ASAP.*

| Task | File(s) | Effort |
|------|---------|--------|
| BUG-1: Smart connector creation policy | `connectCreationPolicy.ts`, `ConnectMenu.tsx` | S |
| BUG-2: Keyboard events in text inputs | `NodeProperties.tsx`, `NodeContentSection.tsx` | S |
| BUG-3a: ClassNode section in properties panel | `NodeProperties.tsx` + new `ClassNodeSection.tsx` | M |
| BUG-3b: EntityNode section in properties panel | `NodeProperties.tsx` + new `EntityNodeSection.tsx` | M |
| BUG-4: Tab between rows in ClassNode | `ClassNode.tsx`, `EntityNode.tsx` | S |
| BUG-5: Journey star rating on node | `JourneyNode.tsx` | S |

### Phase 2 — Properties Panel Lift (Week 3-4)

| Task | File(s) | Effort |
|------|---------|--------|
| ArchitectureNode panel with search | `NodeProperties.tsx` + new `ArchitectureNodeSection.tsx` | M |
| JourneyNode panel section | `NodeProperties.tsx` + new `JourneyNodeSection.tsx` | S |
| Multi-node selection editing | `NodeProperties.tsx`, `StudioPanel.tsx` | M |
| Copy style / Paste style | New `useStyleClipboard.ts`, keyboard handler | M |
| Node type switcher in right-click menu | `ContextMenu.tsx` | M |
| Panel section default expansion by type | `NodeProperties.tsx` | S |

### Phase 3 — Creation UX (Week 5-6)

| Task | File(s) | Effort |
|------|---------|--------|
| Hover `+` quick-create buttons on nodes | New `NodeQuickCreateButtons.tsx` | M |
| `Alt+Arrow` keyboard shortcut | `useFlowEditorCallbacks.ts` or new hook | M |
| Context-aware ConnectMenu by source type | `ConnectMenu.tsx`, `connectCreationPolicy.ts` | M |
| Decision node Yes/No auto-labeling | Edge creation logic | S |
| `F2` to start editing label | Canvas keyboard handler | S |

### Phase 4 — Node Polish (Week 7-9)

| Task | File(s) | Effort |
|------|---------|--------|
| ER field type dropdown + PK/FK toggles | `EntityNode.tsx`, `EntityNodeSection.tsx` | L |
| Class visibility prefix helper + reorder | `ClassNode.tsx`, `ClassNodeSection.tsx` | M |
| Annotation 6 color variants + color picker pill | `CustomNode.tsx` (annotation branch) | S |
| AnnotationNode auto-resize to content | `CustomNode.tsx` (annotation branch) | S |
| Mindmap collapse/expand subtree | `MindmapNode.tsx`, store actions | M |
| Mindmap per-branch colors | `MindmapNode.tsx`, properties panel | S |
| Architecture service quick search on node | `ArchitectureNode.tsx` | M |
| SectionNode click-through behavior | `CustomNode.tsx` (section branch) | M |

### Phase 5 — Edge & Connector Polish (Week 10-12)

| Task | File(s) | Effort |
|------|---------|--------|
| Edge labels (double-click to add) | `CustomEdgeWrapper.tsx` | M |
| Edge properties panel | New `EdgeProperties.tsx` in StudioPanel | L |
| ER crow's foot notation on edges | `CustomEdgeWrapper.tsx`, edge data | L |
| Fixed vs Dynamic connector toggle | Edge properties panel | M |
| `Ctrl+Enter` new row below in structured nodes | `ClassNode.tsx`, `EntityNode.tsx` | S |

### Phase 6 — World-Class Differentiators (Week 13+)

| Task | Description | Effort |
|------|-------------|--------|
| AI field generation for EntityNode | "Generate fields for 'users' table" button calls AI | L |
| AI service suggestion for ArchitectureNode | Context-aware service suggestions | L |
| ER → Class conversion | Select ER entities → "Generate Class Diagram" | L |
| Code mode for ER/Class | Toggle to DSL text editor for power users (Eraser.io style) | XL |
| Browser/Mobile additional variants | +5 browser, +5 mobile variants | M |
| Diagram templates from Architecture node | "3-tier web", "microservices", "event-driven" starter layouts | L |

---

## Appendix A: What NOT to Build

Lessons from research on what creates UX debt:

1. **Don't add a persistent modal for every action.** FigJam's genius is in-canvas editing. Every action that forces a modal is a friction point.
2. **Don't make Tab do two things.** Tab = "move to next thing" everywhere. Don't make it "create sibling" in some contexts and "move to next field" in others. (Current Tab behavior for mindmap siblings is good — but it's an exception, not a rule.)
3. **Don't put everything in the properties panel.** The best tools (Whimsical, FigJam) keep the canvas as the primary editing surface. The panel is for power user overrides.
4. **Don't add keyboard shortcuts for rare actions.** Only actions that users do 10+ times per session warrant keyboard shortcuts. Rare actions should be accessible but don't need shortcuts.
5. **Don't clone implementation between panels and nodes.** The ClassNode and its panel section should share a single source of truth for attribute data, with the panel being a different view of the same data, not a duplicate.

---

## Appendix B: Data Model Changes Needed

### EntityNode — Add Field Metadata
Current:
```ts
erFields: string[] // just an array of strings like "id: UUID"
```

Target:
```ts
erFields: ErField[]

interface ErField {
  name: string;
  dataType: string; // "UUID", "VARCHAR(255)", "INT", etc.
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  referencesTable?: string; // for FK
  referencesField?: string; // for FK
}
```

**Migration strategy:** Parse existing string fields to extract name + type. PK/FK defaults to false. Non-breaking — old string format falls back to `{ name: field, dataType: '', isPrimaryKey: false, ... }`.

### ClassNode — Add Visibility Metadata (Optional)
Current:
```ts
classAttributes: string[] // like "+ id: UUID" (visibility embedded in string)
classMethods: string[]    // like "+ getName(): String"
```

The current approach (embed visibility in string) is fine and compatible with UML DSL. Keep as is but add smart parsing in the UI to colorize/bold the visibility prefix. No schema change needed.

### AnnotationNode — Add Color Variant
Current:
```ts
color: string // preset color key
```

The `color` field already exists. Annotation currently ignores it and always uses yellow. Fix: annotation should respect `data.color` with these mappings:
- `'yellow'` or default → amber-50
- `'green'` → emerald-50
- `'blue'` → blue-50
- `'pink'` → pink-50
- `'violet'` → violet-50
- `'orange'` → orange-50

No schema change needed.

### Edge — Add Label + Relationship Data
Current: ReactFlow edge data has `label?: string` already.

Target: Add to edge data:
```ts
interface EdgeData {
  label?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  sourceMarker?: 'arrow' | 'circle' | 'diamond' | 'square' | 'none';
  targetMarker?: 'arrow' | 'circle' | 'diamond' | 'square' | 'none';
  erSourceCardinality?: 'one' | 'zero-or-one' | 'many' | 'one-or-many' | 'zero-or-many';
  erTargetCardinality?: 'one' | 'zero-or-one' | 'many' | 'one-or-many' | 'zero-or-many';
  connectionType?: 'fixed' | 'dynamic';
}
```

---

*Last updated: 2026-03-22. Based on codebase audit of src/components/custom-nodes/, src/components/properties/, src/lib/connectCreationPolicy.ts, and competitive research across FigJam, draw.io, Lucidchart, Miro, Whimsical, Eraser.io, Notion, Framer, Sketch.*
