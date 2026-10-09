import { V2FlowComposer } from './V2FlowComposer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowLeft, IconCircleDot, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import type { ArchElementPatch } from '../../application/dsl/architectureCommands';
import { modelTags } from '../../../dsl/model/predicates';
import { elementAncestors, type ArchIndex } from '../../../dsl/model/model';
import { ELEMENT_KIND_LABEL, type ArchFlow, type ElementKind } from '../../../dsl/model/types';
import { Button, EmptyState, Icon, IconButton, Panel, Tabs, Tree, type TreeNode } from '../design-system';
import { MapArrowDetails, type MapArrow } from './map/MapArrowDetails';
import { MapArrowEvidence, type MapRepoArrow } from './map/MapArrowEvidence';
import { MapBoxPanel, type MapBoxData } from './map/MapBoxPanel';
import { MapOverview, type MapOverviewData } from './map/MapOverview';
import { ElementKindIcon } from './V2ElementKindIcon';
import { V2ModelElementCard } from './V2ModelElementCard';
import type { V2Architecture } from './useV2Architecture';

export interface V2ModelPanelProps {
  readonly architecture: V2Architecture;
  readonly elementPageIds: ReadonlyMap<string, string>;
  readonly selectedElementId: string | null;
  /** "Edit in model" (a Map double-click, the context menu): open this element's card with its name ready to type. A new object each time. */
  readonly renameRequest?: { readonly id: string } | null;
  readonly placedElementIds: ReadonlySet<string>;
  readonly perspectiveTags: readonly string[];
  readonly onPerspectiveChange: (tags: readonly string[]) => void;
  readonly onNavigate: (crumb: { pageId: string; elementId?: string }) => void;
  readonly onSelectElement: (elementId: string) => void;
  readonly onCreateChildView: (elementId: string) => void;
  readonly onDrillInto: (elementId: string) => void;
  readonly onEditElement: (elementId: string, patch: ArchElementPatch) => void;
  readonly onRemoveElement: (elementId: string) => void;
  /** Adds an element at the top level (`null`) or under a parent; returns the new id. */
  readonly onAddElement: (parentId: string | null, kind: ElementKind) => string | null;
  readonly onCreateFlow: (flow: ArchFlow) => void;
  readonly onPlayFlow: (flow: ArchFlow) => void;
  readonly onClose: () => void;
  readonly onOpenCode: () => void;
  readonly onCreateWorkspace: () => void;
  readonly readOnly: boolean;
  /** `adr/*.md` contents from the open workspace folder, matched by link. */
  readonly adrs?: readonly { readonly path: string; readonly text: string }[];
  /** A clicked Map arrow: the Elements tab lists every relation behind it instead of the element inspector. */
  readonly mapArrow?: MapArrow | MapRepoArrow | null;
  /** Map mode: with nothing selected, the Elements tab opens with a short overview of the map. */
  readonly mapOverview?: MapOverviewData;
  /** A repo map: the selected box's details. */
  readonly mapBox?: MapBoxData | null;
  /** Drops the editor's selection (nodes and connectors): "All elements" returns to the outline. */
  readonly onClearSelection: () => void;
  /** Canvas with a Map available: open the element in Map. */
  readonly onOpenInMap?: (elementId: string) => void;
  /** Map mode: go back to the canvas page that draws the element. */
  readonly onShowOnCanvas?: (elementId: string) => void;
  /** Elements the canvas pages draw, so Map mode knows whether "Show on canvas" has somewhere to go. */
  readonly canvasElementIds?: ReadonlySet<string>;
}


type Tab = 'elements' | 'flows' | 'tags';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Ids to show for a search: every match plus the ancestors that lead to it; null when not searching. */
function searchVisible(index: ArchIndex, query: string): ReadonlySet<string> | null {
  const search = query.trim().toLowerCase();
  if (!search) return null;
  const visible = new Set<string>();
  for (const element of index.model.elements) {
    if ([element.name, element.id, element.kind, element.tech, element.desc, element.env, ...element.tags].some((value) => value?.toLowerCase().includes(search))) {
      visible.add(element.id);
      for (const ancestor of elementAncestors(index, element.id)) visible.add(ancestor);
    }
  }
  return visible;
}

// ponytail: plain label, no flag — drop it when the C4 workspace leaves beta.
const BETA = <span className="ofk-v2-beta">Beta</span>;

/** The same back row as an element card, for the repo map's selected box or arrow. */
function MapBack({ label, onBack }: { readonly label: string; readonly onBack: () => void }): React.JSX.Element {
  return <nav className="ofk-v2-card-nav"><button type="button" className="ofk-v2-card-back" onClick={onBack}><Icon icon={IconArrowLeft} />{label}</button></nav>;
}

/**
 * The model side of the canvas: one object, many views. An outline of elements (or one element, opened as a
 * card); flows play; tags become perspectives.
 */
export function V2ModelPanel(props: V2ModelPanelProps): React.JSX.Element {
  const { architecture, readOnly } = props;
  const model = architecture.model;
  const index = architecture.index;
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [composingFlow, setComposingFlow] = useState(false);
  const [tab, setTab] = useState<Tab>('elements');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  // `expects` is the canvas selection this inspection's own click produces; any other change means the reader moved on.
  const [inspection, setInspection] = useState<{ id: string; expects: string | null; fromOutline: boolean } | null>(null);
  const [lastSelected, setLastSelected] = useState(props.selectedElementId);
  if (lastSelected !== props.selectedElementId) {
    setLastSelected(props.selectedElementId);
    if (inspection && props.selectedElementId !== inspection.expects) { setInspection(null); setJustAdded(null); }
  }
  // Starts empty, so a request that opened the panel is seen on its first render.
  const [lastRename, setLastRename] = useState<V2ModelPanelProps['renameRequest']>(null);
  if (lastRename !== props.renameRequest) {
    setLastRename(props.renameRequest);
    if (props.renameRequest) { setTab('elements'); setInspection(null); setJustAdded(props.renameRequest.id); }
  }
  // Where you were in the outline: marked and refocused when you come back.
  const [lastId, setLastId] = useState<string | null>(null);
  const treeHost = useRef<HTMLDivElement>(null);
  const inspectedId = inspection?.id ?? props.selectedElementId;
  const selected = inspectedId && index ? index.byId.get(inspectedId) ?? null : null;
  const tags = useMemo(() => (model ? modelTags(model) : []), [model]);
  const visible = useMemo(() => (index ? searchVisible(index, query) : null), [index, query]);
  const searching = visible !== null;
  const nodes = useMemo((): TreeNode[] => {
    if (!index) return [];
    const placedAny = props.placedElementIds.size > 0;
    const build = (ids: readonly string[]): TreeNode[] => ids.flatMap((id) => {
      const element = index.byId.get(id);
      if (!element || (visible && !visible.has(id))) return [];
      const kids = build(index.childIds.get(id) ?? []);
      return [{
        id, label: element.name, icon: <ElementKindIcon kind={element.kind} />, meta: element.tech ?? ELEMENT_KIND_LABEL[element.kind],
        muted: placedAny && !props.placedElementIds.has(id), ...(kids.length ? { children: kids } : {}),
      }];
    });
    return build(index.model.elements.filter((element) => !element.parent).map((element) => element.id));
  }, [index, visible, props.placedElementIds]);
  const expandedIds = useMemo(() => {
    const open = new Set<string>();
    const walk = (list: readonly TreeNode[]) => list.forEach((node) => {
      if (node.children && (searching || !collapsed.has(node.id))) open.add(node.id);
      if (node.children) walk(node.children);
    });
    walk(nodes);
    return open;
  }, [nodes, collapsed, searching]);

  // Back in the outline, focus lands on the row you left, so the keyboard keeps its place.
  const returning = useRef(false);
  useEffect(() => {
    if (selected || !returning.current) return;
    returning.current = false;
    if (lastId) treeHost.current?.querySelector<HTMLElement>(`[role="treeitem"][data-id="${CSS.escape(lastId)}"]`)?.focus();
  });

  const inspect = (id: string, fromOutline = false) => {
    setJustAdded(null);
    setInspection({ id, expects: props.placedElementIds.has(id) ? id : null, fromOutline });
    props.onSelectElement(id);
  };
  const back = () => {
    if (selected) { setLastId(selected.id); returning.current = true; }
    setJustAdded(null);
    setInspection(null);
    props.onClearSelection();
  };

  // A repo map has no C4 model: the panel is its overview, or the evidence behind the box or arrow you clicked.
  const repoArrow = props.mapArrow && 'edge' in props.mapArrow ? props.mapArrow : null;
  const c4Arrow = props.mapArrow && !('edge' in props.mapArrow) ? props.mapArrow : null;
  if (!model && (props.mapOverview || repoArrow)) {
    const detail = repoArrow ? <MapArrowEvidence arrow={repoArrow} /> : props.mapBox ? <MapBoxPanel {...props.mapBox} /> : null;
    return (
      <Panel title="Map" onClose={props.onClose} className="ofk-v2-workspace-panel ofk-v2-model-panel ofk-v2-map-panel">
        {detail ? <div className="ofk-v2-card"><MapBack label="Overview" onBack={props.onClearSelection} />{detail}</div>
          : props.mapOverview ? <div className="ofk-v2-card"><MapOverview {...props.mapOverview} /></div> : null}
      </Panel>
    );
  }

  if (!model || !index) {
    return (
      <Panel title="Architecture model" onClose={props.onClose} className="ofk-v2-workspace-panel ofk-v2-model-panel" tools={BETA}>
        <div className="ofk-model-welcome">
          <div className="ofk-model-preview" aria-hidden="true"><span>System</span><div><span>App</span><span>Data</span></div></div>
          <h3>One system. Every view.</h3>
          <p>Define your architecture once. Explore its systems and components across connected diagrams.</p>
          <Button variant="primary" disabled={readOnly} onClick={props.onCreateWorkspace}>Create C4 workspace</Button>
          <Button variant="quiet" onClick={props.onOpenCode}>Open diagram as code</Button>
          <span className="ofk-model-welcome-note">Start with an architecture model.</span>
        </div>
      </Panel>
    );
  }

  const addElement = (parentId: string | null, kind: ElementKind) => {
    const id = props.onAddElement(parentId, kind);
    if (!id) return;
    setQuery('');
    inspect(id);
    setJustAdded(id);
  };
  const relationCount = model.relations.length;
  const header = { title: 'Architecture model', onClose: props.onClose, className: 'ofk-agent-panel ofk-v2-model-panel', tools: BETA };
  const showCard = tab === 'elements';

  if (showCard && c4Arrow) {
    return (
      <Panel {...header}>
        <div className="ofk-v2-card">
          <MapBack label="All elements" onBack={back} />
          <MapArrowDetails model={model} arrow={c4Arrow} onSelectElement={(id) => inspect(id)} />
        </div>
      </Panel>
    );
  }
  if (showCard && repoArrow) {
    return <Panel {...header}><div className="ofk-v2-card"><MapBack label="All elements" onBack={back} /><MapArrowEvidence arrow={repoArrow} /></div></Panel>;
  }
  if (showCard && selected) {
    const placed = props.placedElementIds.has(selected.id);
    const pageId = props.elementPageIds.get(selected.id);
    return (
      <Panel {...header}>
        <V2ModelElementCard
            key={selected.id}
            element={selected}
            index={index}
            readOnly={readOnly}
            inCurrentView={placed}
            childView={architecture.childViewOf(selected.id)}
            adrs={props.adrs ?? []}
            focusName={justAdded === selected.id && (props.renameRequest?.id === selected.id ? props.renameRequest : true)}
            focusBack={inspection?.fromOutline === true && inspection.id === selected.id}
            mapAction={props.onShowOnCanvas && props.canvasElementIds?.has(selected.id)
              ? { label: 'Show on canvas', run: () => props.onShowOnCanvas!(selected.id) }
              : props.onOpenInMap ? { label: 'Open in Map', run: () => props.onOpenInMap!(selected.id) } : undefined}
            onShowInView={!placed && pageId ? () => props.onNavigate({ pageId, elementId: selected.id }) : undefined}
            onBack={back}
            onInspect={(id) => inspect(id)}
            onEdit={(patch) => props.onEditElement(selected.id, patch)}
            onRemove={() => props.onRemoveElement(selected.id)}
            onAddInside={(kind) => addElement(selected.id, kind)}
            onOpenView={() => props.onDrillInto(selected.id)}
            onCreateView={() => props.onCreateChildView(selected.id)}
          />
      </Panel>
    );
  }

  return (
    <Panel {...header}>
      <Tabs
        label="Model sections"
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        tabs={[
          {
            value: 'elements',
            label: <>Elements<span className="ofk-v2-tab-count">{model.elements.length}</span></>,
            panel: (
              <>
                <label className="ofk-v2-model-search"><span className="ofk-visually-hidden">Search architecture</span>
                  <input type="search" value={query} placeholder="Name, technology, tag or environment" onChange={(event) => setQuery(event.target.value)} />
                </label>
                <div className="ofk-v2-model-scroll" ref={treeHost}>
                  {props.mapOverview && !query ? <MapOverview {...props.mapOverview} /> : null}
                  {model.elements.length === 0 ? (
                    <EmptyState icon={<Icon icon={IconPlus} />} title="No elements yet" description="Add a person or a system to start the model."
                      action={readOnly ? undefined : <Button variant="primary" onClick={() => addElement(null, 'system')}>Add element</Button>} />
                  ) : nodes.length === 0 ? (
                    <p role="status" className="ofk-v2-model-hint">No matching elements. Try another name, technology or tag.</p>
                  ) : (
                    <Tree
                      label="Model elements"
                      nodes={nodes}
                      selectedId={lastId}
                      expandedIds={expandedIds}
                      onSelect={(id) => { setLastId(id); inspect(id, true); }}
                      onToggle={(id) => { if (!searching) setCollapsed((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }}
                    />
                  )}
                </div>
                <footer className="ofk-v2-model-foot">
                  <span>{plural(model.elements.length, 'element')} · {plural(relationCount, 'relationship')}</span>
                  {readOnly || model.elements.length === 0 ? null : <Button variant="quiet" onClick={() => addElement(null, 'system')}><Icon icon={IconPlus} />Add element</Button>}
                </footer>
              </>
            ),
          },
          {
            value: 'flows',
            label: <>Flows<span className="ofk-v2-tab-count">{model.flows.length}</span></>,
            panel: (
              <div className="ofk-v2-model-scroll">
                {!readOnly && !composingFlow ? <Button className="ofk-v2-model-create" onClick={() => setComposingFlow(true)}><Icon icon={IconPlus} />Create flow</Button> : null}
                {composingFlow && !readOnly ? <V2FlowComposer model={model} onSave={(flow) => { props.onCreateFlow(flow); setComposingFlow(false); }} onCancel={() => setComposingFlow(false)} /> : null}
                <ul className="ofk-v2-model-list" aria-label="Flows">
                  {model.flows.map((flow) => (
                    <li key={flow.id} className="ofk-v2-model-flow">
                      <button type="button" className="ofk-v2-model-row ofk-v2-model-flow-name" onClick={() => props.onPlayFlow(flow)}>
                        <span className="ofk-v2-model-name">{flow.name}</span>
                        <span className="ofk-v2-model-tech">{plural(flow.steps.length, 'step')}</span>
                      </button>
                      <IconButton label={`Play ${flow.name}`} variant="quiet" onClick={() => props.onPlayFlow(flow)} icon={<Icon icon={IconPlayerPlay} />} />
                    </li>
                  ))}
                  {model.flows.length === 0 ? (
                    <li className="ofk-v2-model-hint">No flows yet. A flow is a sequence of messages between elements. Create one, or write it in the diagram code.</li>
                  ) : null}
                </ul>
              </div>
            ),
          },
          {
            value: 'tags',
            label: <>Tags{tags.length > 0 ? <span className="ofk-v2-tab-count">{tags.length}</span> : null}</>,
            panel: (
              <div className="ofk-v2-model-tags ofk-v2-model-scroll">
                <p className="ofk-v2-model-hint">
                  Pick tags to spotlight the elements that carry them; everything else dims. Give an element tags from its card, or write <code>@tag</code> in the diagram code.
                </p>
                <div className="ofk-v2-model-tag-grid">
                  {tags.map((tag) => {
                    const active = props.perspectiveTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className="ofk-v2-model-tag"
                        data-active={active || undefined}
                        aria-pressed={active}
                        onClick={() => props.onPerspectiveChange(
                          active ? props.perspectiveTags.filter((candidate) => candidate !== tag) : [...props.perspectiveTags, tag],
                        )}
                      >
                        <Icon icon={IconCircleDot} />
                        {tag}
                      </button>
                    );
                  })}
                  {tags.length === 0 ? <span className="ofk-v2-model-hint">No tags in this model.</span> : null}
                </div>
                {props.perspectiveTags.length > 0 ? (
                  <Button variant="quiet" onClick={() => props.onPerspectiveChange([])}>Clear perspective</Button>
                ) : null}
                <ul className="ofk-v2-model-list" aria-label="Tagged elements">
                  {props.perspectiveTags.map((tag) => {
                    const tagged = model.elements.filter((element) => element.tags.includes(tag));
                    return (
                      <li key={tag} className="ofk-v2-model-hint">
                        <strong>@{tag}</strong>: {tagged.map((element) => element.name).join(', ') || 'no elements'}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
          },
        ]}
      />
    </Panel>
  );
}
