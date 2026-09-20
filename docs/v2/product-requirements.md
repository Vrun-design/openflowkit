# Product requirements and project initiation brief

Status: proposed, 2026-09-19. Constraints confirmed by the owner are listed in
[README](README.md). Scope IDs below map to the delivery roadmap.

## Purpose and audience

Help developers, technical founders, and solution architects turn an idea or
Mermaid snippet into a readable diagram, revise it without fighting connectors,
and retain ownership of the result. The primary session is an individual builder
working through a system or flow, then exporting it for a document or discussion.

North-star task: **paste a real flowchart, apply the existing design system,
restructure part of it by hand or AI, and export without repair work**.
Manual creation must be equally complete. AI is an optional input method, not
the condition for a usable product.

## Product contract

1. Core create/edit/save/import/export stays free, account-free, and independent
   of an application backend. No object limit, watermark, or AI requirement.
2. Documents and assets remain local unless the user explicitly exports them or
   invokes a network feature. BYOK requests disclose provider and context scope.
3. Network failure cannot block manual editing or jeopardize saved documents.
4. Every committed user or AI mutation is reversible and has identical validation.
5. Unsupported content is reported and preserved; it is never silently discarded.
6. No Pro, licensing, billing, hosted inference, or subscription gating in v2 work.
   Revisit monetization only after the core workflow is proven with customers.

## Scope and priority

| ID | Release requirement | Why |
| --- | --- | --- |
| P-01 | Native shape creation, selection, transform, direct text, duplication, clipboard, grouping, frames, layers/ordering, lock/hide, undo/redo | Everyday authoring must feel coherent across tools. |
| P-02 | Straight, elbow, curved and preserved polyline connectors; free/fixed/dynamic/port bindings; reconnect; quick-create; manual segment/curve/waypoint editing; multiple draggable labels; markers; self-loops; parallel/reverse edges; crossing bridges; obstacle routing; insert-node-in-edge; keyboard/touch/agent parity | Connector quality is the primary product promise and must meet the accepted FigJam/Miro reference tasks. |
| P-03 | Native Mermaid flowchart/graph import, fidelity report, theme mapping, subgraph containers, retained source | Fast path from technical text to an attractive editable diagram. |
| P-04 | Existing icon catalog and images as native objects; asset-safe copy/export | Architecture diagrams need real symbols and portable media. |
| P-05 | BYOK generate/extend/rewrite-selection proposals, scoped preview, accept/cancel, one-step undo | AI must help revise work, not merely generate a replacement image or whole document. |
| P-06 | Autosave status, recovery, portable bundle/JSON, SVG/PNG/PDF, multi-page survival, legacy conversion report | Existing customers must be able to trust and leave the tool. |
| P-07 | Offline readiness, keyboard operations, semantic accessibility, touch basics, measured performance | These are release requirements, not a final polish phase. |
| P-08 | Full external-agent authoring parity, discoverable operations, local file and live canvas modes, visual feedback, authorized direct edits | Users can use their own agents, including targeted Claude/Codex integrations, without the built-in chat or an OpenCanvas provider key. |
| P-09 | A completely redesigned editor shell and design system with FigJam-level interaction polish, generous canvas space, contextual editing, task-specific panels, responsive/touch behavior, normalized tokens, complete states, and no visual or implementation dependency on legacy inspector/screen composition | Rebuilding the core must remove accumulated product UX debt; v2 cannot be a reskin of the current interface. |

Launch flowchart shape vocabulary includes rectangle/rounded rectangle, ellipse,
diamond, text, sticky, image/icon, group/frame, and a small set of technical shapes
needed by the agreed Mermaid corpus (for example cylinder and hexagon). Avoid
promising full native fidelity for every Mermaid shape. Basic pen/highlighter is
included after the core loop; eraser, laser, minimap, rich-text formatting,
and advanced connector decoration beyond the P-02 contract can follow measured demand;
the P-02 connector behaviors themselves are required before v2 replaces v1.

Not in this program: new ER/class/sequence family editors, template expansion,
multiplayer, hosted document storage, a generalized plugin platform, tables,
Kanban, video embeds, advanced presentation, or full bidirectional Mermaid source
synchronization. Existing assets/templates may remain accessible in v1; exclusion
from new work is not permission to delete customer content.

## Four release-defining journeys

**J1 — Build and revise manually.** Create a six-step branching flow; quick-create
the next node; label connections; insert a step into an edge; move a group;
reconnect and adjust an elbow; undo and redo; reload offline and export.
Completion requires no inspector for the common steps and no detached bindings.

**J2 — Mermaid to designed diagram.** Paste a flowchart with subgraphs, long
labels, and repeated edges. Inspect any conversion warnings. Apply an existing
theme; move a node; restyle one branch; export. Source text and provenance remain
available. The result consists of editable objects, not a single SVG image.

**J3 — Revise a selected subsystem with AI.** Select a branch and request a retry
and failure path. See the proposed additions, deletions, and context sent to the
configured provider. Accept once; undo once. Other branches keep geometry and IDs.
Cancel, provider failure, or a stale response produces no committed mutation.

**J4 — Bring your own agent.** An external agent discovers capabilities, opens a
file or pairs with the live canvas, imports/edits/styles/layouts the diagram,
inspects a render, corrects it, and saves/exports. Human and agent edits can
alternate safely. See [the external-agent contract](agent-native-spec.md) for
coverage, permissions, transport limits, and real-client acceptance gates.

## Experience direction

Preserve the recognizable OpenFlowKit identity, including the orange product accent,
while replacing the legacy white-label/theme-management implementation with a small
internal v2 visual foundation. The blue/emerald/red colors below describe diagram
semantics, not replacement chrome branding. Preserve migrated document appearance;
do not carry forward the old customer-facing design-system UI.

Intent: let a builder think through relationships with the calm and spatial ease
of FigJam and the precision of a technical diagram. Preserve recognizable brand
identity, not the shipped UI composition, scale, density, or component system.

- Domain: flows, branches, dependencies, ports, boundaries, labels, revisions.
- Color world: existing white canvas, slate text/borders, blue emphasis, emerald
  success, red failure, and existing theme colors for semantic categories. These
  describe the shipped palette, not a request to introduce new colors.
- Signature: the same designed, bound, editable diagram whether it starts from
  hand drawing, Mermaid, or an AI proposal. Carry this through import previews,
  native icon nodes, connector editing, selection proposals, and matching exports.
- Replace three common defaults: permanent properties sidebar → contextual bar
  and optional details; permanent chat sidebar → selection action with dismissible
  proposal panel; template wall → immediately usable canvas with paste/create entry.
- Migration evidence: `src/theme.ts`, `src/theme/{palettes,resolvers}.ts`,
  `src/store/designSystemHooks.ts`, `src/components/ui/`, and the existing branding
  docs show what current documents and controls may depend on. Extract only the
  appearance values and useful primitives required by v2, then retire the legacy
  design-system/white-label surfaces. `NODE_UX_SPEC.md` referenced by the local
  design skill was absent during inspection.

Keep a compact primary tool strip, document/save controls, and camera controls.
Selection reveals relevant actions. A details popover supports numeric geometry
and uncommon properties. Tooltips, visible focus, touch targets, shortcut help,
empty states, and actionable errors are part of this design, not extra chrome.
The complete shell, component-state, responsive, and debt-retirement requirements
are defined in [the UI and debt plan](ui-and-debt-plan.md).

## Definition of success

These are proposed targets, not measurements of the current product.

| Measure | Gate |
| --- | --- |
| Customer task success | Recruit 5–8 existing customers across hand-authoring and Mermaid use. At least 80% complete J1/J2 without facilitator rescue; no unresolved data-loss or binding-corruption issue. Small-sample directional evidence, not statistical proof. |
| Perceived quality | Review reference tasks side by side with the chosen reference tool; document friction and manual repairs. Resolve critical connector/text problems before expansion. |
| Fidelity | All agreed supported corpus cases preserve IDs/relationships/labels and are editable; every unsupported case yields a correct report and retained source. No average score may hide silent loss. |
| AI safety | Every deterministic failure/stale/scope/undo evaluation passes. Model task success is tracked separately with provider/model/date; no dependency on live paid calls in normal CI. |
| Durability | Recovery, quota failure, reload, asset bundle restore, and multi-page migration gates pass. |
| Responsiveness | Establish 100/300/1,000-node workloads with representative edges and text. Initial target: p95 input-to-next-frame ≤50ms on agreed hardware; no >10% regression beyond measured noise. Calibrate in V2-00 and record any approved budget change. |

Validate in local sessions and CI. Product telemetry is not required. Any customer
research recordings, fixtures, or optional diagnostics require appropriate consent
and must exclude keys and private document contents by default.
