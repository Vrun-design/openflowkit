# Basic node families

This module owns renderer-neutral presentation semantics for the first node
parity slice: process, start, decision, end, and custom.

`resolveBasicNodePresentation` maps a canonical node to a supported shape and
semantic color choice while preserving authored basic shape/color fields.
`basicNodeOutlinePoints` creates deterministic node-local outline geometry that
survives translation, scale, rotation, resize, and renderer replacement.

Theme colors remain adapter-owned. Unknown and later node families return
`null`, so each later parity change set can add its own focused registry without
growing one renderer switch statement.

`resolveFreeformNodePresentation` owns text typography, image references, and
folded-note content. It validates directly renderable image URLs while
preserving content-addressed asset IDs for a future asset-resolver port;
adapters show a non-blocking placeholder until that port resolves.

`resolveArchitectureNodePresentation` owns the distinction between composed
architecture cards and provider icon-first nodes. It preserves provider pack,
shape, upload, and asset references while keeping catalog loading outside the
domain.

`resolveContainerNodePresentation` owns group, section, and swimlane labels,
shared colors, and structural status. Renderer layering and interaction state
remain outside the domain.

`resolveClassEntityNodePresentation` owns UML class compartments and ER field
semantics. It normalizes legacy strings and structured records for read
rendering while leaving canonical content untouched for exact recovery.

`resolveMindmapNodePresentation` owns topic depth, semantic parentage, aliases,
wrappers, branch direction, and collapse state. Its hierarchy snapshot derives
cycle-safe child and descendant counts without renderer dependencies.

`resolveJourneyNodePresentation` owns journey title, section, task, actor, and
bounded score semantics while preserving authored shared colors.
