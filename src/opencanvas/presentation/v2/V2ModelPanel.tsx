import { V2FlowComposer } from './V2FlowComposer';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowsSplit2, IconChevronDown, IconCircleDot, IconExternalLink, IconPlayerPlay, IconPlus, IconTrash,
} from '@tabler/icons-react';
import { modelTags } from '../../../dsl/model/predicates';
import { elementAncestors, elementDescendantIds, elementPathRef, type ArchIndex } from '../../../dsl/model/model';
import { safeHttpsUrl } from '../../../dsl/model/relationSource';
import type { ArchElement, ArchFlow, ArchRelation, ArchView, ElementKind } from '../../../dsl/model/types';
import { defaultChildKind } from '../../application/dsl/architectureCommands';
import { Button, Icon, IconButton, Panel, Tabs } from '../design-system';
import { MapArrowDetails, type MapArrow } from './map/MapArrowDetails';
import { MapArrowEvidence, type MapRepoArrow } from './map/MapArrowEvidence';
import { MapBoxPanel, type MapBoxData } from './map/MapBoxPanel';
import { MapOverview, type MapOverviewData } from './map/MapOverview';
import type { ArchitectureCrumb, V2Architecture } from './useV2Architecture';

export interface V2ModelPanelProps {
  readonly architecture: V2Architecture;
  readonly elementPageIds: ReadonlyMap<string, string>;
  readonly selectedElementId: string | null;
  readonly placedElementIds: ReadonlySet<string>;
  readonly perspectiveTags: readonly string[];
  readonly onPerspectiveChange: (tags: readonly string[]) => void;
  readonly onNavigate: (crumb: { pageId: string; elementId?: string }) => void;
  readonly onSelectElement: (elementId: string) => void;
  /** Double-click an element to open its child view, like double-clicking on canvas. */
  readonly onCreateChildView: (elementId: string) => void;
  readonly onDrillInto: (elementId: string) => void;
  readonly onEditElement: (elementId: string, patch: { name?: string; tech?: string; desc?: string; tags?: string[]; links?: string[] }) => void;
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
}

type Tab = 'elements' | 'views' | 'flows' | 'tags';

const KIND_LABEL: Readonly<Record<string, string>> = {
  person: 'Person', system: 'System', container: 'Container', component: 'Component',
  store: 'Store', queue: 'Queue', external: 'External', node: 'Node', instance: 'Instance',
};

function elementRows(index: ArchIndex, collapsed: ReadonlySet<string>, query: string): Array<{ element: ArchElement; depth: number }> {
  const rows: Array<{ element: ArchElement; depth: number }> = [];
  const visible = new Set<string>();
  const search = query.trim().toLowerCase();
  if (search) for (const element of index.model.elements) {
    if ([element.name, element.id, element.kind, element.tech, element.desc, element.env, ...element.tags].some((value) => value?.toLowerCase().includes(search))) {
      visible.add(element.id);
      for (const ancestor of elementAncestors(index, element.id)) visible.add(ancestor);
    }
  }
  const walk = (ids: readonly string[], depth: number) => {
    for (const id of ids) {
      const element = index.byId.get(id)!;
      if (search && !visible.has(id)) continue;
      rows.push({element, depth});
      if (search || !collapsed.has(id)) walk(index.childIds.get(id) ?? [], depth + 1);
    }
  };
  walk(index.model.elements.filter((element) => !element.parent).map((element) => element.id), 0);
  return rows;
}

export function ElementLinks({ links }: { readonly links: readonly string[] }): React.JSX.Element {
  return (
    <span className="ofk-v2-model-links">
      {links.map((link) => safeHttpsUrl(link)
        ? <a key={link} href={link} target="_blank" rel="noopener noreferrer"><Icon icon={IconExternalLink} />{link.split('/').pop()}</a>
        : <span key={link}>{link}</span>)}
    </span>
  );
}

/** The relation's label and tech, then its `link` attribute: DSL is user-editable, so only an https URL becomes an anchor. */
export function RelationNote({ relation }: { readonly relation: Pick<ArchRelation, 'label' | 'tech' | 'link'> }): React.JSX.Element {
  const { link } = relation;
  return (
    <span className="ofk-v2-model-hint">
      {relation.label ?? 'Unlabelled relationship'}{relation.tech ? ` · ${relation.tech}` : ''}
      {link ? <>{' · '}{safeHttpsUrl(link)
        ? <a href={link} target="_blank" rel="noopener noreferrer">Source<Icon icon={IconExternalLink} /></a> : link}</> : null}
    </span>
  );
}

function viewKindLabel(view: ArchView): string {
  switch (view.kind) {
    case 'landscape': return 'Landscape';
    case 'context': return 'Context';
    case 'container': return 'Container';
    case 'component': return 'Component';
    case 'deployment': return 'Deployment';
    default: return 'Custom';
  }
}

/**
 * The model side of the canvas: one object, many views. Elements drive the
 * inspector; views and flows navigate and play; tags become perspectives.
 */
// ponytail: plain label, no flag — drop it when the C4 workspace leaves beta.
const BETA = <span className="ofk-v2-beta">Beta</span>;

export function V2ModelPanel(props: V2ModelPanelProps): React.JSX.Element {
  const { architecture, readOnly } = props;
  const model = architecture.model;
  const index = architecture.index;
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [composingFlow, setComposingFlow] = useState(false);
  const [tab, setTab] = useState<Tab>('elements');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [inspection, setInspection] = useState<{id: string; selectedAtClick: string | null} | null>(null);
  const inspectedId = inspection && (!props.selectedElementId || props.selectedElementId === inspection.selectedAtClick) ? inspection.id : props.selectedElementId;
  const rows = useMemo(() => index ? elementRows(index, collapsed, query) : [], [index, collapsed, query]);
  const tags = useMemo(() => (model ? modelTags(model) : []), [model]);
  const selected = inspectedId && index ? index.byId.get(inspectedId) ?? null : null;

  // A repo map has no C4 model: the panel is its overview, or the evidence behind the arrow you clicked.
  if (!model && (props.mapOverview || (props.mapArrow && 'edge' in props.mapArrow))) {
    return (
      <Panel title="Map" onClose={props.onClose} className="ofk-v2-workspace-panel ofk-v2-model-panel">
        {props.mapArrow && 'edge' in props.mapArrow ? <MapArrowEvidence arrow={props.mapArrow} /> : props.mapBox ? <MapBoxPanel {...props.mapBox} /> : props.mapOverview ? <MapOverview {...props.mapOverview} /> : null}
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
    setJustAdded(id);
    setInspection({id, selectedAtClick: props.selectedElementId});
    props.onSelectElement(id);
  };
  const childKind = selected ? defaultChildKind(selected.kind) : null;
  const descendantCount = selected ? elementDescendantIds(index, selected.id).length : 0;

  return (
    <Panel
      title="Architecture model"
      onClose={props.onClose}
      className="ofk-agent-panel ofk-v2-model-panel"
      tools={<>{BETA}<span className="ofk-v2-model-count">{model.elements.length} elements</span></>}
    >
      <Tabs
        label="Model sections"
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        tabs={[
          {
            value: 'elements',
            label: 'Elements',
            panel: (
              <>
                {props.mapOverview && !props.mapArrow && !selected ? <MapOverview {...props.mapOverview} /> : null}
                {readOnly ? null : <Button variant="quiet" onClick={() => addElement(null, 'system')}><Icon icon={IconPlus} /> Add element</Button>}
                <label className="ofk-v2-model-field"><span>Search architecture</span>
                  <input type="search" value={query} placeholder="Name, technology, tag or environment" onChange={(event) => setQuery(event.target.value)} />
                </label>
                <ul className="ofk-v2-model-tree" aria-label="Model elements">
                  {rows.map(({ element, depth }) => (
                    <li key={element.id} className="ofk-v2-model-tree-item">
                      {(index.childIds.get(element.id)?.length ?? 0) > 0 ? <button type="button" className="ofk-v2-model-expand"
                        aria-label={`${collapsed.has(element.id) ? 'Expand' : 'Collapse'} ${element.name}`}
                        aria-expanded={!collapsed.has(element.id) || Boolean(query.trim())}
                        disabled={Boolean(query.trim())}
                        onClick={() => setCollapsed((previous) => {
                          const next = new Set(previous);
                          if (next.has(element.id)) next.delete(element.id); else next.add(element.id);
                          return next;
                        })}>{collapsed.has(element.id) && !query.trim() ? '›' : '⌄'}</button> : <span className="ofk-v2-model-expand" aria-hidden="true" />}
                      <button
                        type="button"
                        className="ofk-v2-model-row"
                        style={{ paddingInlineStart: `${8 + depth * 14}px` }}
                        data-kind={element.kind}
                        data-selected={element.id === selected?.id || undefined}
                        aria-pressed={element.id === selected?.id}
                        data-placed={props.placedElementIds.has(element.id) || undefined}
                        onClick={() => { setInspection({id: element.id, selectedAtClick: props.selectedElementId}); props.onSelectElement(element.id); }}
                        onDoubleClick={() => props.onDrillInto(element.id)}
                        title={element.id}
                      >
                        <span className="ofk-v2-model-kind">{KIND_LABEL[element.kind] ?? element.kind}</span>
                        <span className="ofk-v2-model-name">{element.name}</span>
                        {element.tech ? <span className="ofk-v2-model-tech">{element.tech}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
                {rows.length === 0 ? <p role="status" className="ofk-v2-model-hint">No matching elements. Try another name, technology or tag.</p> : null}
                {props.mapArrow ? ('edge' in props.mapArrow ? <MapArrowEvidence arrow={props.mapArrow} /> : <MapArrowDetails model={model} arrow={props.mapArrow}
                  onSelectElement={(id) => { setInspection({id, selectedAtClick: props.selectedElementId}); props.onSelectElement(id); }} />) : null}
                {!props.mapArrow && selected ? <div className="ofk-v2-model-detail">
                  {architecture.childViewOf(selected.id) ? <Button variant="quiet" onClick={() => props.onDrillInto(selected.id)}>Open {viewKindLabel(architecture.childViewOf(selected.id)!)} view</Button> : null}
                  {!architecture.childViewOf(selected.id) && !readOnly && ['system', 'container'].includes(selected.kind) ? <Button variant="quiet" onClick={() => props.onCreateChildView(selected.id)}>Create {selected.kind === 'system' ? 'Container' : 'Component'} view</Button> : null}
                  {readOnly ? null : <Button variant="quiet" disabled={!childKind}
                    title={childKind ? undefined : `A ${KIND_LABEL[selected.kind] ?? selected.kind} cannot contain other elements.`}
                    onClick={() => childKind && addElement(selected.id, childKind)}><Icon icon={IconPlus} /> Add child</Button>}
                  {!props.placedElementIds.has(selected.id) && props.elementPageIds.has(selected.id) ? <Button variant="quiet" onClick={() => props.onNavigate({pageId: props.elementPageIds.get(selected.id)!, elementId: selected.id})}>Show in view</Button> : null}
                  <details open className="ofk-v2-model-relationships"><summary>Relationships</summary>
                    <ul className="ofk-v2-model-list" aria-label={`Relationships of ${selected.name}`}>
                      {model.relations.filter((relation) => relation.from === selected.id || relation.to === selected.id).map((relation) => <li key={relation.id}>
                        <span>{[relation.from, relation.to].map((id, at) => <span key={`${id}:${at}`}>
                          {at ? ' → ' : ''}<button type="button" className="ofk-v2-model-relation-link" aria-label={`Inspect ${index.byId.get(id)?.name ?? id}`}
                            onClick={() => { setInspection({id, selectedAtClick: props.selectedElementId}); props.onSelectElement(id); }}>{index.byId.get(id)?.name ?? id}</button>
                        </span>)}</span>
                        <RelationNote relation={relation} />
                      </li>)}
                    </ul>
                    {!model.relations.some((relation) => relation.from === selected.id || relation.to === selected.id) ? <p className="ofk-v2-model-hint">No incoming or outgoing relationships.</p> : null}
                  </details>
                </div> : null}
                {props.mapArrow ? null : selected ? (
                  <ElementInspector
                    key={selected.id}
                    element={selected}
                    path={elementPathRef(index, selected.id)}
                    descendantCount={descendantCount}
                    readOnly={readOnly}
                    onEdit={props.onEditElement}
                    onRemove={props.onRemoveElement}
                    onNavigate={props.onNavigate}
                    crumbs={architecture.breadcrumb}
                    inCurrentView={props.placedElementIds.has(selected.id)}
                    adrs={props.adrs ?? []}
                    focusName={justAdded === selected.id}
                  />
                ) : (
                  <p className="ofk-v2-model-hint">Select an element to inspect it. Edits propagate to every view.</p>
                )}
              </>
            ),
          },
          {
            value: 'views',
            label: `Views (${model.views.length})`,
            panel: (
              <ul className="ofk-v2-model-list" aria-label="Views">
                {model.views.map((view) => (
                  <li key={view.id}>
                    <button
                      type="button"
                      className="ofk-v2-model-row ofk-v2-model-view"
                      data-current={view.id === architecture.view?.id || undefined}
                      aria-current={view.id === architecture.view?.id ? 'page' : undefined}
                      onClick={() => props.onNavigate({ pageId: architecture.pageForView(view.id)?.id ?? '' })}
                      disabled={!architecture.pageForView(view.id)}
                    >
                      <span className="ofk-v2-model-kind">{viewKindLabel(view)}</span>
                      <span className="ofk-v2-model-name">{view.name}</span>
                      <span className="ofk-v2-model-tech">
                        {view.of && index.byId.get(view.of) ? index.byId.get(view.of)!.name : view.env ?? ''}
                      </span>
                    </button>
                  </li>
                ))}
                {model.views.length === 0 ? <li className="ofk-v2-model-hint">No views in this model.</li> : null}
              </ul>
            ),
          },
          {
            value: 'flows',
            label: `Flows (${model.flows.length})`,
            panel: (
              <>
              {!readOnly && !composingFlow ? <Button variant="quiet" onClick={() => setComposingFlow(true)}>Create flow</Button> : null}
              {composingFlow && !readOnly ? <V2FlowComposer model={model} onSave={(flow) => { props.onCreateFlow(flow); setComposingFlow(false); }} onCancel={() => setComposingFlow(false)} /> : null}
              <ul className="ofk-v2-model-list" aria-label="Flows">
                {model.flows.map((flow) => (
                  <li key={flow.id} className="ofk-v2-model-flow">
                    <button type="button" className="ofk-v2-model-row ofk-v2-model-flow-name" onClick={() => props.onPlayFlow(flow)}>
                      <span className="ofk-v2-model-name">{flow.name}</span>
                      <span className="ofk-v2-model-tech">{flow.steps.length} steps</span>
                    </button>
                    <IconButton label={`Play ${flow.name}`} variant="quiet" onClick={() => props.onPlayFlow(flow)}
                      icon={<Icon icon={IconPlayerPlay} />} />
                  </li>
                ))}
                {model.flows.length === 0 ? (
                  <li className="ofk-v2-model-hint">
                    No flows yet. Create a message sequence, or add a flow in diagram source.
                  </li>
                ) : null}
              </ul>
              </>
            ),
          },
          {
            value: 'tags',
            label: 'Tags',
            panel: (
              <div className="ofk-v2-model-tags">
                <p className="ofk-v2-model-hint">
                  Perspectives dim everything that does not carry a selected tag. Tags come from <code>@tag</code> or{' '}
                  <code>[tags: …]</code>.
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

interface ElementInspectorProps {
  readonly element: ArchElement;
  readonly path: string;
  readonly descendantCount: number;
  readonly readOnly: boolean;
  readonly inCurrentView: boolean;
  readonly crumbs: readonly ArchitectureCrumb[];
  readonly onEdit: V2ModelPanelProps['onEditElement'];
  readonly onRemove: (elementId: string) => void;
  readonly onNavigate: V2ModelPanelProps['onNavigate'];
  readonly adrs: readonly { readonly path: string; readonly text: string }[];
  /** A just-added element: its Name takes focus, selected, ready to be typed over. */
  readonly focusName: boolean;
}

function ElementInspector(props: ElementInspectorProps): React.JSX.Element {
  const { element } = props;
  const [name, setName] = useState(element.name);
  const [tech, setTech] = useState(element.tech ?? '');
  const [desc, setDesc] = useState(element.desc ?? '');
  const [tags, setTags] = useState(element.tags.join(', '));
  const [links, setLinks] = useState(element.links.join('\n'));
  const [confirming, setConfirming] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (props.focusName) { nameRef.current?.focus(); nameRef.current?.select(); } }, [props.focusName]);
  const commit = (patch: Parameters<V2ModelPanelProps['onEditElement']>[1]) => props.onEdit(element.id, patch);

  return (
    <form
      className="ofk-v2-model-inspector"
      onSubmit={(event) => {
        event.preventDefault();
        commit({
          name,
          tech,
          desc,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          links: links.split('\n').map((link) => link.trim()).filter(Boolean),
        });
      }}
    >
      <header className="ofk-v2-model-inspector-head">
        <span className="ofk-v2-model-kind">{KIND_LABEL[element.kind] ?? element.kind}</span>
        <code className="ofk-v2-model-path">{props.path}</code>
        {props.descendantCount > 0 ? <span className="ofk-v2-model-tech">{props.descendantCount} inside</span> : null}
        {element.instanceOf ? <span className="ofk-v2-model-tech">instance of {element.instanceOf}</span> : null}
      </header>
      <label className="ofk-v2-model-field">
        <span>Name</span>
        <input ref={nameRef} value={name} disabled={props.readOnly} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="ofk-v2-model-field">
        <span>Technology</span>
        <input value={tech} placeholder="React, Go, Postgres…" disabled={props.readOnly}
          onChange={(event) => setTech(event.target.value)} />
      </label>
      <label className="ofk-v2-model-field">
        <span>Description</span>
        <textarea value={desc} rows={2} disabled={props.readOnly} onChange={(event) => setDesc(event.target.value)} />
      </label>
      <label className="ofk-v2-model-field">
        <span>Tags</span>
        <input value={tags} placeholder="core, payments" disabled={props.readOnly}
          onChange={(event) => setTags(event.target.value)} />
      </label>
      <label className="ofk-v2-model-field">
        <span>Links (one per line)</span>
        <textarea value={links} rows={2} placeholder="adr/0001-choose-postgres.md" disabled={props.readOnly}
          onChange={(event) => setLinks(event.target.value)} />
      </label>
      <div className="ofk-v2-model-inspector-actions">
        <Button type="submit" variant="primary" disabled={props.readOnly}>Apply</Button>
        {element.links.length > 0 ? <ElementLinks links={element.links} /> : null}
      </div>
      <div className="ofk-v2-model-danger">
        {confirming ? (
          <>
            <span role="alert">Remove {element.name}{props.descendantCount > 0 ? ` and ${props.descendantCount} inside` : ''} from every view?</span>
            <Button variant="danger" onClick={() => { setConfirming(false); props.onRemove(element.id); }}>
              Remove from model
            </Button>
            <Button variant="quiet" onClick={() => setConfirming(false)}>Cancel</Button>
          </>
        ) : (
          <Button variant="quiet" disabled={props.readOnly} onClick={() => setConfirming(true)}>
            <Icon icon={IconTrash} /> Remove from model
          </Button>
        )}
      </div>
      {props.element.links.length > 0 ? (
        <div className="ofk-v2-model-adrs">
          {props.element.links.flatMap((link) => {
            const name = link.split('/').pop() ?? link;
            const adr = props.adrs.find((candidate) => candidate.path.endsWith(name));
            if (!adr) return [];
            return [
              <details key={adr.path} className="ofk-v2-model-adr">
                <summary>{name}<Icon icon={IconChevronDown} /></summary>
                <pre>{adr.text}</pre>
              </details>,
            ];
          })}
        </div>
      ) : null}
      {!props.inCurrentView ? (
        <p className="ofk-v2-model-hint">
          <Icon icon={IconArrowsSplit2} /> Not shown in this view.
          {props.crumbs.length > 0 ? ' Use Views to open the view that shows it.' : ''}
        </p>
      ) : null}
    </form>
  );
}
