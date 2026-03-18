---
draft: false
title: Node Types
---

OpenFlowKit supports both generic and family-specific nodes. The actual node model in the app covers flow, architecture, mind map, journey, class, ER, annotation, grouping, and media use cases.

## Core node families

### Flow nodes

These are the default building blocks for most workflows:

- `start`
- `process`
- `decision`
- `end`
- `custom`

Typical properties include:

- label and sublabel
- icon
- color preset or custom color
- shape
- typography
- dimensions and rotation

### Mind map nodes

`mindmap` nodes track extra structure such as:

- depth
- parent id
- left/right side
- branch style

Keyboard helpers:

- `Tab` adds a child
- `Enter` adds a sibling

### Journey nodes

`journey` nodes include journey-specific metadata such as:

- actor
- section
- task
- score

These are useful for service blueprints and UX journey maps.

### Architecture nodes

`architecture` and icon-backed `custom` nodes are designed for system diagrams. They can carry:

- provider metadata
- resource type
- environment and trust domain fields
- provider icon pack references
- architecture boundary relationships

### Structural and content nodes

These support organization and annotation:

- `annotation`
- `section`
- `group`
- `swimlane`
- `image`

Use them to explain or frame diagrams rather than only to model system entities.

## Shapes

The node data model supports these shape variants:

- rectangle
- rounded
- capsule
- diamond
- hexagon
- cylinder
- ellipse
- parallelogram
- circle

Not every family exposes every shape in the same way. General flow nodes are the most flexible.

## Wireframe surfaces

The asset browser can create browser and mobile wireframe nodes. These are useful when you need UI flow context inside the same canvas as process logic.

## Provider-backed icon nodes

The assets panel can load icon catalogs for:

- general icons
- AWS
- Azure
- GCP
- CNCF

These are inserted as icon-presented nodes rather than plain boxes, which makes them better suited for infrastructure maps.

## Which node should you use?

Use this rule of thumb:

- choose **process/start/decision/end** for classic workflows
- choose **mindmap** for branching idea trees
- choose **journey** for actor and stage-based experiences
- choose **architecture** or provider icons for cloud/system diagrams
- choose **annotation**, **text**, and **section** for explanation and grouping

## Related reading

- [Properties Panel](/properties-panel/)
- [AWS Architecture](/aws-architecture/)
- [Payment Flow](/payment-flow/)
*   **Best for**: Process steps, services, database tables, or general entities.
*   **Features**: Resizable, editable label, support for icons.

## 2. Text Node / Annotation

A lightweight, borderless node used for adding comments or labels to the canvas without affecting the flow structure.
*   **Best for**: Adding sticky notes, section headers, or explanatory text.
*   **Usage**: Select "Text" from the toolbar or press \`T\`.

## 3. Group Node

Container nodes that visually group other nodes together. Moving a group moves all nodes inside it.
*   **Best for**: Visualizing sub-systems, VPCs, or logical boundaries.
*   **Usage**: Select nodes -> Right Click -> "Group Selection".

## 4. Swimlane Node

Vertical or horizontal lanes to organize processes by actor or department.
*   **Best for**: Cross-functional flowcharts.

## 5. Image Node

Embed arbitrary images directly onto the canvas.
*   **Best for**: Adding logos, screenshots, or reference diagrams.
*   **Usage**: Drag and drop an image file directly onto the canvas.
