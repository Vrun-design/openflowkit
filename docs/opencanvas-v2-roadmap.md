# OpenCanvas v2 — roadmap and rationale

Status: proposal, 2026-09-19. Supersedes the "M1–M7" roadmap for everything
user-facing. Written so a second model can evaluate it cold.

## 1. What we are building

A diagramming + whiteboarding tool that **feels like Excalidraw/tldraw**
(minimal, fast, keyboard-first, everything edited on the canvas) with
**FigJam-grade connectors**, plus what those tools lack and we already have:

- custom icons/logos (AWS/Azure/GCP/CNCF catalog, 2 100+ icons) as first-class shapes;
- AI/agent-native editing (action registry, MCP, WebMCP — built today);
- **Mermaid import that produces a great-looking, fully editable diagram**;
- local-first, free, open.

Explicitly **out of scope**: ER/class/sequence family editors, Miro/FigJam
template libraries, collaboration cursors (later), the current inspector-first UX.

## 2. Why a v2 instead of continuing v1

v1 (current editor, Pixi surface now default) was built as a *parity port* of
the React Flow editor. It reproduces React Flow's model, so it inherits its
feel:

| Concern | v1 (inherited from React Flow) | Target (tldraw/FigJam) |
| --- | --- | --- |
| Shape | node "type" → React component; `content` is an untyped legacy JSON blob | geometry + style + text; one shape system, typed |
| Connector | source-handle → target-handle; curve is a global preset | arrow **bound** to a shape's perimeter at any point; straight/elbow/curved per arrow; re-routes live when shapes move; labels on the arrow |
| Text | `label` field, edited via inspector or overlay | text is a shape; edit in place anywhere; auto-size; wraps |
| Tools | toolbar + context menus | tool system with keys (V select, H hand, R rect, O ellipse, A arrow, T text, P pen, E eraser, F frame) |
| Editing | inspector panel does most work | on-canvas style bar, handles, smart guides, snapping |
| State | zustand store of legacy `nodes/edges`, 13 action files, 121 write sites, projected to/from the canonical document on every edit | store = canonical document + history + selection + camera; nothing else |

The debt is the **model and the interaction layer**, not the renderer. Every
"bridge", "projection" and "adapter" module in `src/opencanvas` exists only
because two models coexist. Porting more features onto v1 makes the debt
permanent.

## 3. What is kept (verified good, zero React Flow dependency)

| Keep | Path | Why |
| --- | --- | --- |
| Canonical document, commands, history, validation, geometry | `src/opencanvas/domain/**` | pure, tested (execute/inverse/batch), renderer-independent — this is the "store + records" layer tldraw has |
| Pixi renderer host, camera, culling, LOD, benchmarks | `src/opencanvas/infrastructure/pixi/**`, `benchmarks/**` | perf work done; hardware gates exist |
| Agent action registry, WebMCP, MCP `diagram_*` tools, agent eval | `src/agent/**`, `mcp-server/**` | built on the kernel; `npm run eval:agent` |
| Storage: canonical persistence (A6 d1), crash recovery, asset store | `src/services/storage/**` | canonical is already written on every save |
| Mermaid parsers, official flowchart import, layout extraction | `src/services/mermaid/**` (40 files) | the hard part of Mermaid import already exists; only its *target* (legacy nodes) changes |
| ELK layout worker, icon catalog, canonical SVG export | `src/services/elk-layout`, `assets/third-party-icons`, `infrastructure/export` | pure services |

## 4. What is rewritten (not ported)

- Legacy zustand store and all `useFlow*` hooks.
- All React Flow components, node families, inspector, toolbar, context menus.
- Node `content` shape: becomes typed per shape kind.
- Connector model: handle-based → binding-based.
- Every `active-document/*Bridge`, `reactflow/*` projection: deleted when v1 is deleted. Legacy JSON survives only as an **import format** through one adapter.

## 5. Principles (the rules that stop v2 becoming v1 again)

1. **Spec before code.** Nothing enters v2 unless it is in an accepted spec with an acceptance check.
2. **Nothing is ported.** If a v1 feature is wanted, it is re-specified against the tldraw/FigJam reference, then built on the v2 model.
3. **On-canvas first.** No inspector panel in v2 until the spec proves a property cannot be edited on the canvas.
4. **One model.** Store holds the canonical document. No second representation in memory.
5. **Every slice ships behind `/v2`** and is dogfooded before the next slice starts.
6. **Renderer-independent domain.** Shape geometry, hit-testing, arrow routing, text measurement live in `domain/`; Pixi only draws.

## 6. Phases

Each phase = one spec (written first, ~10–30 lines per item, acceptance checks)
then vertical slices with the build-loop gates (tsc, lint, vitest, browser spec).

| # | Phase | Deliverable | Done when |
| --- | --- | --- | --- |
| 0 | **Interaction spec** | `docs/v2/interaction-spec.md`: the ~20 interactions that make tldraw feel like tldraw, each with the reference behaviour and a check | you and a second model accept it |
| 1 | **Model spec** (irreversible — slow down) | `docs/v2/model-spec.md`: typed shape content (rect, ellipse, diamond, text, image/icon, frame, draw, arrow), style model, arrow bindings, text measurement contract, migration adapter from legacy content | accepted; schema versioned; adapter spec'd |
| 2 | **Core editing** | `/v2` route: rect/ellipse/diamond/text; select, marquee, move, resize, rotate, duplicate-drag, snap + smart guides, undo/redo, on-canvas style bar, keyboard tools | browser spec for every phase-0 interaction it covers |
| 3 | **Arrows** | bind to perimeter (any point), straight/elbow/curved per arrow, live reroute on move/resize, arrow labels, arrowheads, elbow handles | browser spec: draw, bind, move shape, reroute, label, undo |
| 4 | **Tools** | hand, pen/highlighter, eraser, frames, laser; zoom/pan/fit; minimap optional | spec checks |
| 5 | **Differentiators** | icons/logos as shapes (catalog picker on canvas), image paste/drop, agent actions re-pointed at v2 model, WebMCP/MCP parity | `eval:agent` passes on v2 |
| 6 | **Mermaid import → v2** | flowchart/graph first: parse (exists) → v2 shapes + bound arrows + ELK layout; result is *editable and pretty*; then mindmap, journey, architecture | golden-image spec on a Mermaid corpus; every imported element editable |
| 7 | **Persistence + export** | v2 documents saved canonically (already), legacy import adapter, SVG/PNG/PDF export from canonical (exists), JSON | reload/export browser proof |
| 8 | **Flip and delete** | `/v2` becomes `/`; v1, React Flow, all bridges deleted; bundle budget drops | one release on v2; dependency audit |

Order rationale: 0–1 decide everything; 2–3 are 80% of "feel"; 6 is our
main differentiator and needs 3's arrows to look good; families are gone.

## 7. Open decisions (need a human)

| Decision | Options | Recommendation |
| --- | --- | --- |
| Renderer for v2 | keep Pixi (WebGL, done) / Canvas2D like Excalidraw / SVG-DOM like tldraw | **keep Pixi**; perf work exists; text via Pixi Text + DOM overlay for editing |
| Text measurement | estimate (current `measurePortableText`) / real canvas `measureText` in domain via injected measurer | **injected measurer**: domain stays pure, browser passes canvas measurement, tests pass a deterministic one |
| Arrow routing | own elbow router / port an open one (e.g. libavoid-style) / ELK for arrows | **own simple orthogonal router + obstacle avoidance from `domain/connectors/obstacleRouting.ts`** first; revisit if ugly |
| Style model | tldraw-like (color/fill/dash/size enums) / free CSS-like values | **enums** (small, agent-friendly, consistent) with an escape hatch for custom color |
| Mermaid fidelity target | renderer-exact (current `mermaid_svg` images) / native re-expression | **native**: imported diagrams must be editable; renderer-exact stays as a "paste as image" option |
| Family diagrams (ER/class/sequence) | drop / keep as read-only import / rebuild later | **drop from v2 scope**; Mermaid import of those kinds → "paste as image" until demand |

## 8. Risks

- **Porting creep.** Mitigation: principle 2; every PR names the spec line it implements.
- **Two editors for months.** Mitigation: v1 frozen (bug fixes only), v2 behind a route; flip criteria are the phase-0 spec, not a date.
- **Model spec wrong.** Mitigation: phase 1 gets a review pass by a second model; schema versioned from day one; migration adapter tested on the corpus.
- **Text/arrow quality** is where "feels like tldraw" lives or dies. Mitigation: phases 2–3 get golden-image browser specs against reference screenshots.

## 9. Estimate

Solo + AI, focused: phase 0–1 one week; 2–3 four to six weeks; 4–7 four to
six weeks; 8 one week. ~3 months to a v2 you use daily; v1 stays shippable
throughout. Part-time: double.

## 10. What is needed from you to start

1. Accept/modify §7 decisions.
2. Name the reference for each interaction where tldraw and Excalidraw differ (I will list them in the phase-0 spec; default: tldraw).
3. Approve phase 0 → I write the interaction spec.
