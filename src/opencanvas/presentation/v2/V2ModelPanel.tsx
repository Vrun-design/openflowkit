import { useMemo, useState } from 'react';
import {
  IconArrowsSplit2, IconCircleDot, IconExternalLink, IconPlayerPlay, IconTrash,
} from '@tabler/icons-react';
import { modelTags } from '../../../dsl/model/predicates';
import { elementDescendantIds, elementPathRef, type ArchIndex } from '../../../dsl/model/model';
import type { ArchElement, ArchFlow, ArchModel, ArchView } from '../../../dsl/model/types';
import { Button, Icon, IconButton, Panel, Tabs } from '../design-system';
import type { ArchitectureCrumb, V2Architecture } from './useV2Architecture';

export interface V2ModelPanelProps {
  readonly architecture: V2Architecture;
  readonly documentPages: readonly { id: string; name: string }[];
  readonly selectedElementId: string | null;
  readonly placedElementIds: ReadonlySet<string>;
  readonly perspectiveTags: readonly string[];
  readonly onPerspectiveChange: (tags: readonly string[]) => void;
  readonly onNavigate: (crumb: { pageId: string; elementId?: string }) => void;
  readonly onSelectElement: (elementId: string) => void;
  /** Double-click an element to open its child view, like double-clicking on canvas. */
  readonly onDrillInto: (elementId: string) => void;
  readonly onEditElement: (elementId: string, patch: { name?: string; tech?: string; desc?: string; tags?: string[]; links?: string[] }) => void;
  readonly onRemoveElement: (elementId: string) => void;
  readonly onPlayFlow: (flow: ArchFlow) => void;
  readonly onClose: () => void;
  readonly onOpenCode: () => void;
  readonly readOnly: boolean;
  /** `adr/*.md` contents from the open workspace folder, matched by link. */
  readonly adrs?: readonly { readonly path: string; readonly text: string }[];
}

type Tab = 'elements' | 'views' | 'flows' | 'tags';

const KIND_LABEL: Readonly<Record<string, string>> = {
  person: 'Person', system: 'System', container: 'Container', component: 'Component',
  store: 'Store', queue: 'Queue', external: 'External', node: 'Node', instance: 'Instance',
};

function elementRows(index: ArchIndex, model: ArchModel): Array<{ element: ArchElement; depth: number }> {
  const rows: Array<{ element: ArchElement; depth: number }> = [];
  const walk = (parent: string | null, depth: number) => {
    for (const element of model.elements) {
      if (element.parent !== parent) continue;
      if (element.env && depth === 0) continue;
      rows.push({ element, depth });
      walk(element.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
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
export function V2ModelPanel(props: V2ModelPanelProps): React.JSX.Element {
  const { architecture, readOnly } = props;
  const model = architecture.model;
  const index = architecture.index;
  const [tab, setTab] = useState<Tab>('elements');
  const rows = useMemo(() => (model && index ? elementRows(index, model) : []), [model, index]);
  const tags = useMemo(() => (model ? modelTags(model) : []), [model]);
  const selected = props.selectedElementId && index ? index.byId.get(props.selectedElementId) ?? null : null;

  if (!model || !index) {
    return (
      <Panel title="Model" onClose={props.onClose} className="ofk-v2-workspace-panel ofk-v2-model-panel">
        <div className="ofk-model-welcome">
          <div className="ofk-model-preview" aria-hidden="true"><span>System</span><div><span>App</span><span>Data</span></div></div>
          <h3>One system. Every view.</h3>
          <p>Define your architecture once. Explore its systems and components across connected diagrams.</p>
          <Button onClick={props.onOpenCode}>Open diagram as code</Button>
          <span className="ofk-model-welcome-note">Start with an architecture model.</span>
        </div>
      </Panel>
    );
  }

  const descendantCount = selected ? elementDescendantIds(index, selected.id).length : 0;

  return (
    <Panel
      title="Model"
      onClose={props.onClose}
      className="ofk-agent-panel ofk-v2-model-panel"
      tools={<span className="ofk-v2-model-count">{model.elements.length} elements</span>}
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
                <ul className="ofk-v2-model-tree" aria-label="Model elements">
                  {rows.map(({ element, depth }) => (
                    <li key={element.id}>
                      <button
                        type="button"
                        className="ofk-v2-model-row"
                        style={{ paddingInlineStart: `${8 + depth * 14}px` }}
                        data-kind={element.kind}
                        data-selected={element.id === props.selectedElementId || undefined}
                        data-placed={props.placedElementIds.has(element.id) || undefined}
                        onClick={() => props.onSelectElement(element.id)}
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
                {selected ? (
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
                    No flows yet. Add a <code>flow &quot;Name&quot; {'{ … }'}</code> block and regenerate.
                  </li>
                ) : null}
              </ul>
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
}

function ElementInspector(props: ElementInspectorProps): React.JSX.Element {
  const { element } = props;
  const [name, setName] = useState(element.name);
  const [tech, setTech] = useState(element.tech ?? '');
  const [desc, setDesc] = useState(element.desc ?? '');
  const [tags, setTags] = useState(element.tags.join(', '));
  const [links, setLinks] = useState(element.links.join('\n'));
  const [confirming, setConfirming] = useState(false);
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
        <input value={name} disabled={props.readOnly} onChange={(event) => setName(event.target.value)} />
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
        {element.links.length > 0 ? (
          <span className="ofk-v2-model-links">
            {element.links.map((link) => (
              <a key={link} href={link} target="_blank" rel="noreferrer">
                <Icon icon={IconExternalLink} />{link.split('/').pop()}
              </a>
            ))}
          </span>
        ) : null}
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
                <summary>{name}</summary>
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
