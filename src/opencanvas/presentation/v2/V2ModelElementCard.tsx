import {
  useCallback, useEffect, useRef, useState,
  type ChangeEvent, type KeyboardEvent, type ReactNode,
} from 'react';
import {
  IconArrowLeft, IconArrowsSplit2, IconChevronDown, IconDots, IconExternalLink, IconEye, IconPlus, IconTrash,
} from '@tabler/icons-react';
import { defaultChildKind, type ArchElementPatch } from '../../application/dsl/architectureCommands';
import { crossingRelations, elementAncestors, elementDescendantIds, elementPathRef, modelKindLabel, type ArchIndex, type CrossingRelation } from '../../../dsl/model/model';
import { safeHttpsUrl } from '../../../dsl/model/relationSource';
import type { ArchElement, ArchRelation, ArchView, ElementKind } from '../../../dsl/model/types';
import { Button, Icon, IconButton, Menu, MenuItem } from '../design-system';
import { ElementKindIcon } from './V2ElementKindIcon';


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

const normalizeText = (raw: string) => raw.trim();
const normalizeTags = (raw: string) => raw.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean).join(', ');
const normalizeLinks = (raw: string) => raw.split('\n').map((link) => link.trim()).filter(Boolean).join('\n');

/**
 * A field that saves when you leave it. `value` is what the model holds: it replaces the draft whenever the
 * field is not being edited (undo, AI and code edits land), and the draft commits once on blur, Enter or unmount.
 */
function useDraft(value: string, normalize: (raw: string) => string, commit: (next: string) => void, opts: { multiline?: boolean; required?: boolean } = {}) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  // Only what the reader typed is theirs: an untouched field follows the model, focused or not.
  const [dirty, setDirty] = useState(false);
  const sent = useRef(normalize(value));
  if (value !== seen) {
    setSeen(value);
    if (!dirty) setDraft(value);
  }
  useEffect(() => { sent.current = normalize(value); }, [value, normalize]);
  const latest = useRef({ draft, value, dirty, normalize, commit, required: opts.required });
  useEffect(() => { latest.current = { draft, value, dirty, normalize, commit, required: opts.required }; });
  const flush = useCallback(() => {
    const { draft: text, value: held, dirty: typed, normalize: clean, commit: save, required } = latest.current;
    if (!typed) return;
    latest.current.dirty = false;
    setDirty(false);
    const next = clean(text);
    if (required && !next) { setDraft(held); return; }
    if (next !== sent.current) { sent.current = next; save(next); }
    setDraft(next);
  }, []);
  useEffect(() => flush, [flush]);
  return {
    value: draft,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setDirty(true); setDraft(event.target.value); },
    onBlur: flush,
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === 'Escape' && dirty) { event.preventDefault(); event.stopPropagation(); setDirty(false); setDraft(value); return; }
      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
      if (!opts.multiline || event.metaKey || event.ctrlKey) { event.preventDefault(); flush(); }
    },
  };
}

export interface ElementCardProps {
  readonly element: ArchElement;
  readonly index: ArchIndex;
  readonly readOnly: boolean;
  readonly inCurrentView: boolean;
  readonly childView: ArchView | null;
  readonly adrs: readonly { readonly path: string; readonly text: string }[];
  /** A just-added element or "Edit in model": its Name takes focus, selected, ready to be typed over. A new request object focuses it again. */
  readonly focusName: boolean | { readonly id: string };
  /** Opened from the outline: focus moves to the back link so the keyboard stays in the panel. */
  readonly focusBack: boolean;
  /** Opens the element in the other surface (Map from Canvas, Canvas from Map), when that is possible. */
  readonly mapAction?: { readonly label: string; readonly run: () => void } | undefined;
  readonly onShowInView?: (() => void) | undefined;
  /** Includes the element in the current view's rules, when the page has a view. */
  readonly onAddToView?: (() => void) | undefined;
  readonly onBack: () => void;
  readonly onInspect: (elementId: string) => void;
  readonly onEdit: (patch: ArchElementPatch) => void;
  readonly onRemove: () => void;
  readonly onAddInside: (kind: ElementKind) => void;
  readonly onOpenView: () => void;
  readonly onCreateView: () => void;
}

function Section({ title, count, children }: { readonly title: string; readonly count?: number; readonly children: ReactNode }): React.JSX.Element {
  return (
    <section className="ofk-v2-card-sec">
      <h3 className="ofk-v2-card-sec-title">{title}{count === undefined ? null : <span>{count}</span>}</h3>
      {children}
    </section>
  );
}

/** One element, opened: identity, actions, the fields that save as you leave them, and what it connects to. */
export function V2ModelElementCard(props: ElementCardProps): React.JSX.Element {
  const { element, index, readOnly } = props;
  const [confirming, setConfirming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchor = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (props.focusName) { nameRef.current?.focus(); nameRef.current?.select(); } else if (props.focusBack) backRef.current?.focus();
  }, [props.focusName, props.focusBack]);
  useEffect(() => { if (confirming) cancelRef.current?.focus(); }, [confirming]);

  const edit = (patch: ArchElementPatch) => props.onEdit(patch);
  const name = useDraft(element.name, normalizeText, (next) => edit({ name: next }), { required: true });
  const tech = useDraft(element.tech ?? '', normalizeText, (next) => edit({ tech: next }));
  const desc = useDraft(element.desc ?? '', normalizeText, (next) => edit({ desc: next }), { multiline: true });
  const tags = useDraft(element.tags.join(', '), normalizeTags, (next) => edit({ tags: next ? next.split(', ') : [] }));
  const links = useDraft(element.links.join('\n'), normalizeLinks, (next) => edit({ links: next ? next.split('\n') : [] }), { multiline: true });

  const ancestors = [...elementAncestors(index, element.id)].reverse().flatMap((id) => index.byId.get(id) ?? []);
  const descendantCount = elementDescendantIds(index, element.id).length;
  const children = (index.childIds.get(element.id) ?? []).flatMap((id) => index.byId.get(id) ?? []);
  const { talksTo, usedBy } = crossingRelations(index, element.id);
  const childKind = defaultChildKind(element.kind);
  const canCreateView = !props.childView && !readOnly && (element.kind === 'system' || element.kind === 'container');
  const hasMenu = props.onShowInView || !readOnly;
  const nameOf = (id: string) => index.byId.get(id)?.name ?? id;

  const relationRows = (relations: readonly CrossingRelation[], otherEnd: 'from' | 'to') => relations.map(({ relation, via }) => {
    const other = nameOf(relation[otherEnd]);
    return (
      <li key={`${relation.id}:${via ?? ''}`}>
        <span className="ofk-v2-card-arrow" aria-hidden="true">{otherEnd === 'to' ? '→' : '←'}</span>
        <span className="ofk-v2-card-rel">
          <button type="button" className="ofk-v2-model-relation-link" aria-label={`Inspect ${other}`} onClick={() => props.onInspect(relation[otherEnd])}>{other}</button>
          <RelationNote relation={relation} />
          {via ? <span className="ofk-v2-model-hint">via {nameOf(via)}</span> : null}
        </span>
      </li>
    );
  });

  return (
    <div className="ofk-v2-card">
      <nav className="ofk-v2-card-nav" aria-label="Element path">
        <button ref={backRef} type="button" className="ofk-v2-card-back" onClick={props.onBack}><Icon icon={IconArrowLeft} />All elements</button>
        {ancestors.length > 0 ? (
          <ol className="ofk-v2-card-path">
            {ancestors.map((ancestor) => (
              <li key={ancestor.id}>
                <button type="button" onClick={() => props.onInspect(ancestor.id)}>{ancestor.name}</button>
              </li>
            ))}
            <li aria-current="location"><span>{element.name}</span></li>
          </ol>
        ) : null}
      </nav>

      <header className="ofk-v2-card-ident">
        <span className="ofk-v2-card-tile" aria-hidden="true"><ElementKindIcon kind={element.kind} /></span>
        <input ref={nameRef} className="ofk-v2-card-name" aria-label="Name" title={element.name} readOnly={readOnly} {...name} />
        <p className="ofk-v2-card-sub" title={elementPathRef(index, element.id)}>
          {modelKindLabel(element)}{element.tech ? ` · ${element.tech}` : ''}
          {descendantCount > 0 ? ` · ${descendantCount} inside` : ''}
        </p>
      </header>

      <div className="ofk-v2-card-actions">
        {props.mapAction ? <Button className="ofk-v2-card-primary" onClick={props.mapAction.run}>{props.mapAction.label}</Button> : null}
        {props.childView ? <Button onClick={props.onOpenView}>Open {viewKindLabel(props.childView)} view</Button> : null}
        {canCreateView ? <Button onClick={props.onCreateView}>Create {element.kind === 'system' ? 'Container' : 'Component'} view</Button> : null}
        {readOnly ? null : (
          <Button disabled={!childKind} title={childKind ? undefined : `${modelKindLabel(element)} cannot contain other elements.`}
            onClick={() => childKind && props.onAddInside(childKind)}><Icon icon={IconPlus} />Add inside</Button>
        )}
        {hasMenu ? (
          <>
            <IconButton ref={menuAnchor} label="More actions" variant="quiet" aria-haspopup="menu" aria-expanded={menuOpen}
              icon={<Icon icon={IconDots} />} onClick={() => setMenuOpen((open) => !open)} />
            <Menu open={menuOpen} anchorRef={menuAnchor} onClose={() => setMenuOpen(false)} label={`Actions for ${element.name}`} placement="bottom-end">
              {props.onShowInView ? <MenuItem icon={<Icon icon={IconEye} />} onSelect={props.onShowInView}>Show in view</MenuItem> : null}
              {readOnly ? null : <MenuItem icon={<Icon icon={IconTrash} />} danger onSelect={() => setConfirming(true)}>Remove from model…</MenuItem>}
            </Menu>
          </>
        ) : null}
      </div>

      {confirming ? (
        <div className="ofk-v2-card-confirm" onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setConfirming(false); }
        }}>
          <p role="alert">Remove {element.name}{descendantCount > 0 ? ` and ${descendantCount} inside` : ''} from every view?</p>
          <div>
            <Button variant="danger" onClick={() => { setConfirming(false); props.onRemove(); }}>Remove from model</Button>
            <Button ref={cancelRef} variant="quiet" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}

      {!props.inCurrentView ? (
        <p className="ofk-v2-card-note"><Icon icon={IconArrowsSplit2} />Not shown in this view.
          {props.onAddToView && !readOnly ? <Button onClick={props.onAddToView}><Icon icon={IconPlus} />Add to this view</Button> : null}</p>
      ) : null}

      <Section title="About">
        <label className="ofk-v2-card-field"><span>Technology</span>
          <input placeholder="e.g. React, Go, Postgres" readOnly={readOnly} {...tech} /></label>
        <label className="ofk-v2-card-field"><span>Description</span>
          <textarea rows={2} placeholder="What it does" readOnly={readOnly} {...desc} /></label>
        <label className="ofk-v2-card-field"><span>Tags</span>
          <input placeholder="e.g. core, payments" readOnly={readOnly} {...tags} /></label>
        <label className="ofk-v2-card-field"><span>Links</span>
          <textarea rows={2} placeholder="One link per line" readOnly={readOnly} {...links} /></label>
        {element.instanceOf ? <p className="ofk-v2-card-field"><span>Instance of</span><span>{nameOf(element.instanceOf)}</span></p> : null}
        {element.links.length > 0 ? <div className="ofk-v2-card-links"><ElementLinks links={element.links} /></div> : null}
        {element.links.flatMap((link) => {
          const file = link.split('/').pop() ?? link;
          const adr = props.adrs.find((candidate) => candidate.path.endsWith(file));
          return adr ? [
            <details key={adr.path} className="ofk-v2-model-adr">
              <summary>{file}<Icon icon={IconChevronDown} /></summary>
              <pre>{adr.text}</pre>
            </details>,
          ] : [];
        })}
      </Section>

      {talksTo.length > 0 ? (
        <Section title="Talks to" count={talksTo.length}>
          <ul className="ofk-v2-card-list" aria-label={`${element.name} talks to`}>{relationRows(talksTo, 'to')}</ul>
        </Section>
      ) : null}
      {usedBy.length > 0 ? (
        <Section title="Used by" count={usedBy.length}>
          <ul className="ofk-v2-card-list" aria-label={`${element.name} is used by`}>{relationRows(usedBy, 'from')}</ul>
        </Section>
      ) : null}
      {talksTo.length === 0 && usedBy.length === 0 ? (
        <p className="ofk-v2-card-note">{props.inCurrentView ? 'No relationships yet. Draw a connector to another element to add one.' : 'No relationships yet.'}</p>
      ) : null}
      {children.length > 0 ? (
        <Section title="Inside" count={children.length}>
          <ul className="ofk-v2-card-list" aria-label={`Inside ${element.name}`}>
            {children.map((child) => (
              <li key={child.id}>
                <button type="button" className="ofk-v2-card-child" onClick={() => props.onInspect(child.id)}>
                  <ElementKindIcon kind={child.kind} />
                  <span>{child.name}</span>
                  <span>{child.tech ?? modelKindLabel(child)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
