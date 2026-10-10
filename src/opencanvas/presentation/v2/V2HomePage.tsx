import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  IconAlertTriangle, IconArrowBackUp, IconArrowUpRight, IconBrandGithub, IconBulb, IconChevronDown, IconClock, IconFileImport, IconHierarchy2,
  IconKeyboard, IconLayoutGrid, IconLayoutList, IconLock, IconMoon, IconPlus, IconSearch, IconSpeakerphone, IconStar,
  IconArchive, IconStarFilled, IconSun, IconTemplate, IconTrashX, IconUpload, IconX,
} from '@tabler/icons-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { HomeNotice } from './V2LegacyRoutes';
import {
  Button, Dialog, EmptyState, ErrorState, Icon, IconButton, Kbd, Menu, MenuItem, Segmented, SystemRoot, ToastRegion,
  Tooltip, type IconComponent, type ToastItem,
} from '../design-system';
import { CommandPalette, type Command } from '../design-system/CommandPalette';
import { createV2Repository, type V2DocumentSummary, type V2Thumbnail } from '../../../services/storage/v2/v2Repository';
import { describeStorageFailure } from '../../../services/storage/v2/v2Errors';
import { UNTITLED_DOCUMENT_NAME } from '../../domain/document/defaults';
import { isV1Backup, openV1Backup, readV1ImportMarker, runV1Import } from '../../../services/storage/v2/v1Import';
import { documentFromFileText } from '../../../services/storage/v2/openDocumentFile';
import { buildV2Thumbnail } from './v2Thumbnail';
import { STARTER_TEMPLATES } from '../../../agent/starterTemplates';
import { ISSUE_URL } from '../../application/ai/assistantReport';
import { forgetMapMode } from './map/mapDepth';
import { forgetLastDocument, mintV2Id, type V2StartIntent } from './v2Document';
import {
  CHIP_ICON, DiagramCard, HomeCard, HomeNoticeStrip, SkeletonCard, StartCard, StartChip, ArchivedCard, type CardSelection, type StartKind,
} from './V2HomeCards';
import { V2StateHero } from './V2StateHero';
import { HOME_NEWS } from './homeNews';
import { REPO_URL, formatStars, useGitHubStars } from './homeStars';
import {
  IMPORT_ACCEPT, arrange, copyName, gridStep, importKind, parseView, selectRange, toggleId,
  useHomeState, type HomeSort, type HomeView,
} from './homeLibrary';
import { COMMAND } from './v2Shortcuts';
import { useV2Appearance } from './useV2Appearance';
import { useV2Preferences } from './useV2Preferences';
import './v2EditorPage.css';
import './v2Home.css';

// Checked-in pictures of the starter templates (homeTemplates.test.ts keeps them true):
// home never loads the compiler or ELK to show them.
const TEMPLATE_PICTURES = import.meta.glob<string>('./homeTemplates/*.svg', { query: '?url', import: 'default', eager: true });
const templatePicture = (name: string, theme: 'light' | 'dark') => TEMPLATE_PICTURES[`./homeTemplates/${name}-${theme}.svg`];

const STARTS: readonly { kind: StartKind; title: string; chip: string; hint: string; text: string; intent?: V2StartIntent }[] = [
  { kind: 'blank', title: 'Blank canvas', chip: 'Blank canvas', hint: 'Draw by hand', text: 'Shapes, arrows and text, by hand.' },
  { kind: 'assistant', title: 'Describe it to AI', chip: 'Ask AI', hint: 'Describe it in words', text: 'Say what you need; review before it lands.', intent: { start: 'assistant' } },
  { kind: 'code', title: 'Paste code or Mermaid', chip: 'From code', hint: 'Mermaid, D2, Structurizr', text: 'Text in, diagram out. D2 and Structurizr too.', intent: { start: 'code' } },
  { kind: 'agent', title: 'Connect your agent', chip: 'Connect agent', hint: 'Claude Code, Cursor', text: 'Claude Code or Cursor draws here over MCP.', intent: { start: 'agent' } },
];
const NEWS_DATE = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
const VIEWS: readonly { view: HomeView; title: string; icon: IconComponent }[] = [
  { view: 'recents', title: 'Recents', icon: IconClock },
  { view: 'starred', title: 'Starred', icon: IconStar },
  { view: 'templates', title: 'Templates', icon: IconTemplate },
  { view: 'archive', title: 'Archive', icon: IconArchive },
];
const SORTS: readonly { sort: HomeSort; title: string }[] = [{ sort: 'edited', title: 'Last edited' }, { sort: 'name', title: 'Name' }];
/** A text diagram rides in router state to the editor; past this it is not a diagram anyone typed. */
const MAX_IMPORT_CHARS = 2_000_000;

/** Keys meant for a field, a menu's typeahead or a dialog are not page shortcuts. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
    || target.closest('[role="menu"], [role="dialog"], dialog') !== null);
const viewLink = (view: HomeView) => ({ search: view === 'recents' ? '' : `?view=${view}` });
const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

/** Home: a sidebar of views and one quiet, keyboard-first list of the diagrams in this browser. */
export function V2HomePage(): React.JSX.Element {
  const { preferences, updatePreferences } = useV2Preferences();
  const appearance = useV2Appearance(preferences.theme);
  const [home, updateHome] = useHomeState();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const view = parseView(params.get('view'));
  const repository = useMemo(() => createV2Repository(window.indexedDB), []);
  const [documents, setDocuments] = useState<readonly V2DocumentSummary[] | null>(null);
  const [archive, setArchive] = useState<readonly V2DocumentSummary[] | null>(null);
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, V2Thumbnail | null>>(new Map());
  // An old link that found nothing, or an opened backup, arrives with a notice in router state;
  // clear it so a reload or Back does not show it again.
  const location = useLocation();
  const [notice, setNotice] = useState<HomeNotice | null>(() => {
    const arrived = location.state as Partial<HomeNotice> | null;
    return typeof arrived?.notice === 'string' ? { tone: 'info', ...arrived, notice: arrived.notice } : null;
  });
  const [listError, setListError] = useState<ReturnType<typeof describeStorageFailure> | null>(null);
  useEffect(() => {
    if (location.state) navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, navigate]);
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null);
  /** Deleting for good always asks first. */
  const [deleting, setDeleting] = useState<readonly V2DocumentSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const anchor = useRef<string | null>(null);
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const [open, setOpen] = useState<'sort' | 'palette' | 'keys' | null>(null);
  const [dragging, setDragging] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const renameCancelled = useRef(false);
  const failed = Object.entries(readV1ImportMarker()?.docs ?? {}).filter(([, entry]) => entry.status === 'failed');
  const mod = COMMAND();

  const toast = useCallback((item: Omit<ToastItem, 'id'>) =>
    setToasts((current) => [...current.slice(-2), { id: `home-${Date.now()}-${Math.random()}`, ...item }]), []);
  const setProblem = (text: string) => setNotice({ notice: text, tone: 'danger' });
  const fail = (error: unknown) => toast({ tone: 'danger', title: describeStorageFailure(error).message });
  const refresh = useCallback(() => {
    repository.listDocuments().then((listed) => { setListError(null); setDocuments(listed); },
      (error: unknown) => setListError(describeStorageFailure(error)));
    repository.listArchive().then(setArchive, () => setArchive([]));
    // A preview that fails to load is a placeholder, never an error.
    repository.listThumbnails().then(setThumbnails, () => undefined);
  }, [repository]);
  // List at once, and again when a v1 import still running on this load lands.
  useEffect(() => {
    refresh();
    runV1Import().then(refresh, () => undefined);
  }, [repository, refresh]);
  useEffect(() => { renameRef.current?.select(); }, [renaming?.id]);
  // Visiting What's new is what reads it.
  useEffect(() => {
    if (view === 'news' && home.newsSeen !== HOME_NEWS[0].title) updateHome({ newsSeen: HOME_NEWS[0].title });
  }, [view, home.newsSeen, updateHome]);
  // A selection belongs to the view it was made in.
  useEffect(() => { setSelected([]); anchor.current = null; }, [view]);

  const create = useCallback((intent?: V2StartIntent) =>
    navigate(`/d/${mintV2Id('doc')}`, intent ? { state: intent } : undefined), [navigate]);

  const shown = useMemo(() => {
    // Templates and What's new show no diagrams, so ⌘A and the arrows have nothing to act on.
    if (view === 'templates' || view === 'news') return [];
    if (view === 'archive') return archive ? arrange(archive, { view: 'recents', starred: [], query, sort: 'edited' }) : null;
    return documents ? arrange(documents, { view, starred: home.starred, query, sort: home.sort }) : null;
  }, [view, archive, documents, home.starred, home.sort, query]);
  const shownIds = useMemo(() => (shown ?? []).map(({ id }) => id), [shown]);
  const byId = useMemo(() => new Map([...(documents ?? []), ...(archive ?? [])].map((summary) => [summary.id, summary])), [documents, archive]);
  const starredDocs = (documents ?? []).filter(({ id }) => home.starred.includes(id));

  // Keyboard focus follows the card it acted on, or "New diagram" once the card is gone.
  const focusAfter = (id: string | null) => requestAnimationFrame(() =>
    (document.querySelector<HTMLElement>(id ? `[data-doc-id="${id}"]` : '[data-home-new]'))?.focus());
  /** The card to land on once `ids` leave the list: the next one still shown, else the previous. */
  const survivor = (ids: readonly string[]) => {
    const index = shownIds.findIndex((id) => ids.includes(id));
    return shownIds.slice(index).find((id) => !ids.includes(id)) ?? shownIds.slice(0, index).reverse().find((id) => !ids.includes(id)) ?? null;
  };

  async function commitRename(): Promise<void> {
    if (!renaming || renameCancelled.current) return;
    const { id, draft } = renaming;
    const name = draft.trim();
    setRenaming(null);
    try {
      const loaded = await repository.loadDocument(id);
      if (loaded.status !== 'ok') {
        setProblem('This diagram can only be renamed after it opens cleanly. Open it first.');
      } else if (name && loaded.record.document.name !== name) {
        const saved = await repository.saveDocument(id, { ...loaded.record.document, name }, loaded.record.revision + 1);
        if (saved.status !== 'saved') setProblem('That diagram changed in another tab. Reload and try again.');
      }
    } catch (error) {
      fail(error);
    }
    refresh();
    focusAfter(id);
  }
  const startRename = (id: string) => {
    const summary = byId.get(id);
    if (!summary || view === 'archive') return;
    renameCancelled.current = false;
    setRenaming({ id, draft: summary.name });
  };

  async function duplicate(summary: V2DocumentSummary): Promise<void> {
    const id = mintV2Id('doc');
    try {
      const loaded = await repository.loadDocument(summary.id);
      if (loaded.status !== 'ok' && loaded.status !== 'recovered') {
        setProblem('This diagram can only be duplicated after it opens cleanly. Open it first.');
        return;
      }
      const now = new Date().toISOString();
      const name = copyName(summary.name, (documents ?? []).map((other) => other.name));
      await repository.saveDocument(id, { ...loaded.record.document, id, name, createdAt: now, updatedAt: now }, 1);
      const thumbnail = thumbnails.get(summary.id);
      if (thumbnail) await repository.saveThumbnail(id, thumbnail).catch(() => undefined);
    } catch (error) {
      fail(error);
    }
    refresh();
    focusAfter(id);
  }

  const toggleStars = (ids: readonly string[]) => {
    const all = ids.every((id) => home.starred.includes(id));
    updateHome({ starred: all ? home.starred.filter((id) => !ids.includes(id)) : [...home.starred, ...ids.filter((id) => !home.starred.includes(id))] });
  };

  async function archiveIds(ids: readonly string[]): Promise<void> {
    if (!ids.length) return;
    const next = survivor(ids);
    const name = byId.get(ids[0]!)?.name ?? 'Diagram';
    try {
      await repository.archiveDocuments(ids);
      ids.forEach((id) => { forgetLastDocument(id); forgetMapMode(id); });
      toast({
        title: ids.length === 1 ? `“${name}” archived.` : `${plural(ids.length, 'diagram')} archived.`,
        action: { label: 'Undo', onClick: () => void restore(ids, false) },
      });
    } catch (error) {
      fail(error);
    }
    setSelected([]);
    refresh();
    focusAfter(next);
  }

  async function restore(ids: readonly string[], announce = true): Promise<void> {
    const next = view === 'archive' ? survivor(ids) : ids[0] ?? null;
    try {
      await repository.restoreDocuments(ids);
      if (announce) toast({ tone: 'success', title: `${plural(ids.length, 'diagram')} restored.`, action: { label: 'Show', onClick: () => navigate(viewLink('recents')) } });
    } catch (error) {
      fail(error);
    }
    setSelected([]);
    refresh();
    focusAfter(next);
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    const ids = deleting.map(({ id }) => id);
    const next = survivor(ids);
    setDeleting(null);
    try {
      for (const id of ids) await repository.deleteDocument(id);
    } catch (error) {
      fail(error);
    }
    if (ids.some((id) => home.starred.includes(id))) updateHome({ starred: home.starred.filter((id) => !ids.includes(id)) });
    setSelected([]);
    refresh();
    focusAfter(next);
  }

  async function importFiles(files: readonly File[]): Promise<void> {
    const usable = files.filter((file) => importKind(file.name));
    if (!usable.length) {
      toast({ tone: 'danger', title: 'Nothing here to import.', description: 'OpenFlowKit imports its own .json files, and Mermaid, D2, Structurizr or OpenFlow DSL text files.' });
      return;
    }
    const sources = usable.filter((file) => importKind(file.name) === 'source');
    // A text diagram is drawn by the editor's compiler, so it opens there — one at a time.
    if (usable.length === 1 && sources.length === 1) {
      const text = await sources[0]!.text();
      if (text.length > MAX_IMPORT_CHARS) toast({ tone: 'danger', title: `“${sources[0]!.name}” is too big to draw.` });
      else create({ source: text });
      return;
    }
    let imported = 0;
    const problems: string[] = [];
    // What opening a file had to change (a v1 edge to a deleted shape), said once per file.
    const notes: string[] = [];
    for (const file of usable.filter((candidate) => importKind(candidate.name) === 'json')) {
      try {
        const text = await file.text();
        let parsed: unknown = null;
        try { parsed = JSON.parse(text); } catch { /* documentFromFileText reports it */ }
        if (isV1Backup(parsed)) {
          const report = await openV1Backup(parsed, repository);
          imported += report.opened.length;
          problems.push(...report.failures.map((failure) => failure.name));
          continue;
        }
        const opened = documentFromFileText(text, mintV2Id('doc'));
        if ('error' in opened) { problems.push(`${file.name}: ${opened.error}`); continue; }
        if (opened.notice) notes.push(`${file.name}: ${opened.notice}`);
        const untitled = !opened.document.name || opened.document.name === UNTITLED_DOCUMENT_NAME;
        const document = untitled ? { ...opened.document, name: file.name.replace(/\.json$/i, '') } : opened.document;
        const saved = await repository.saveDocument(document.id, document, 1);
        if (saved.status === 'saved') {
          imported += 1;
          // The card's preview is otherwise drawn only by an editor save; it arrives after the list.
          void buildV2Thumbnail(document).then((thumbnail) => repository.saveThumbnail(document.id, thumbnail))
            .then(() => repository.listThumbnails()).then(setThumbnails, () => undefined);
        } else problems.push(file.name);
      } catch {
        problems.push(file.name);
      }
    }
    refresh();
    if (sources.length) problems.push(`${plural(sources.length, 'text file')} (drop those one at a time)`);
    const description = [...(problems.length ? [`Couldn’t open ${problems.join('; ')}`.replace(/([^.])$/, '$1.')] : []), ...notes].join(' ');
    toast({
      tone: problems.length ? (imported ? 'warning' : 'danger') : notes.length ? 'warning' : 'success',
      title: imported ? `Imported ${plural(imported, 'diagram')}.` : 'Nothing was imported.',
      ...(description ? { description } : {}),
    });
  }

  const select = (id: string, range: boolean) => {
    if (range) setSelected((current) => [...new Set([...current, ...selectRange(shownIds, anchor.current, id)])]);
    else setSelected((current) => toggleId(current, id));
    if (!range) anchor.current = id;
  };
  const selectionFor = (id: string): CardSelection => ({
    selected: selected.includes(id), active: selected.length > 0, onToggle: (range) => select(id, range),
  });
  /** What a key acts on: the selection when the focused card is part of it, else just that card. */
  const targets = (id: string) => (selected.includes(id) ? selected : [id]);

  // Page shortcuts: N new, / filter, ⌘K find anything, ⌘A select all, Delete, Escape, ? the list of keys.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => (current === 'palette' ? null : 'palette'));
        return;
      }
      if (typing(event.target) || deleting || open === 'palette' || open === 'keys') return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a' && shownIds.length) {
        event.preventDefault();
        setSelected(shownIds);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape' && selected.length) { setSelected([]); return; }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selected.length) {
        event.preventDefault();
        if (view === 'archive') setDeleting(selected.flatMap((id) => byId.get(id) ?? []));
        else void archiveIds(selected);
        return;
      }
      if (event.key === 'n' || event.key === 'N') { event.preventDefault(); create(); }
      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === '?') { event.preventDefault(); setOpen('keys'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** Arrows walk the cards; Space selects, F2 renames, S stars, Delete archives — on the focused card or the selection. */
  const onGridKey = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('ofk-home-card-hit') || event.metaKey || event.ctrlKey || event.altKey) return;
    const hits = [...event.currentTarget.querySelectorAll<HTMLElement>('.ofk-home-card-hit')];
    const index = hits.indexOf(target);
    const id = target.dataset.docId;
    const top = hits[0]?.closest('li')?.offsetTop;
    const columns = Math.max(1, hits.filter((hit) => hit.closest('li')?.offsetTop === top).length);
    const next = gridStep(index, hits.length, columns, event.key);
    if (next !== null) {
      event.preventDefault();
      hits[next]!.focus();
      if (event.shiftKey && id && hits[next]!.dataset.docId) {
        anchor.current ??= id;
        setSelected(selectRange(shownIds, anchor.current, hits[next]!.dataset.docId!));
      }
      return;
    }
    if (!id) return;
    if (event.key === ' ') { event.preventDefault(); select(id, event.shiftKey); }
    else if (event.key === 'F2') { event.preventDefault(); startRename(id); }
    else if ((event.key === 's' || event.key === 'S') && view !== 'archive') { event.preventDefault(); toggleStars(targets(id)); }
    else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      if (view === 'archive') setDeleting(targets(id).flatMap((other) => byId.get(other) ?? []));
      else void archiveIds(targets(id));
    }
  };

  const needle = query.trim().toLowerCase();
  const templates = STARTER_TEMPLATES.filter(({ title }) => !needle || title.toLowerCase().includes(needle));
  const firstRun = view === 'recents' && documents !== null && documents.length === 0;
  const dark = appearance === 'dark';
  const unseenNews = home.newsSeen !== HOME_NEWS[0].title;
  const viewTitle = view === 'news' ? 'What’s new' : VIEWS.find((entry) => entry.view === view)!.title;
  const stars = useGitHubStars();
  const sortTitle = SORTS.find(({ sort }) => sort === home.sort)!.title;
  // Sort and layout belong to a list of your diagrams, not to templates, the archive or the first run.
  const listing = !listError && (view === 'recents' || view === 'starred') && !firstRun;
  const count = (entry: HomeView) =>
    entry === 'recents' ? documents?.length : entry === 'starred' ? starredDocs.length : entry === 'archive' ? archive?.length : undefined;
  const selectedAllStarred = selected.length > 0 && selected.every((id) => home.starred.includes(id));

  const commands = useMemo<Command[]>(() => [
    { id: 'new', group: 'Create', label: 'New diagram', shortcut: 'N', icon: <Icon icon={IconPlus} />, run: () => create() },
    ...STARTS.filter(({ intent }) => intent).map(({ kind, title, intent }) => ({
      id: `start-${kind}`, group: 'Create', label: title, icon: <Icon icon={CHIP_ICON[kind]} />, run: () => create(intent),
    })),
    { id: 'import', group: 'Create', label: 'Import a file…', icon: <Icon icon={IconUpload} />, keywords: ['open', 'json', 'mermaid', 'd2'], run: () => fileRef.current?.click() },
    ...VIEWS.map(({ view: target, title, icon }) => ({
      id: `view-${target}`, group: 'Go to', label: title, icon: <Icon icon={icon} />, run: () => navigate(viewLink(target)),
    })),
    ...(documents ?? []).map(({ id, name }) => ({
      id: `doc-${id}`, group: 'Diagrams', label: name, icon: <Icon icon={IconHierarchy2} />, run: () => navigate(`/d/${id}`),
    })),
    ...STARTER_TEMPLATES.map(({ name, title }) => ({
      id: `template-${name}`, group: 'Templates', label: title, keywords: ['template'], icon: <Icon icon={IconTemplate} />,
      run: () => create({ template: name }),
    })),
    { id: 'view-news', group: 'Go to', label: 'What’s new', icon: <Icon icon={IconSpeakerphone} />, run: () => navigate(viewLink('news')) },
    { id: 'theme', group: 'Settings', label: dark ? 'Switch to light theme' : 'Switch to dark theme', icon: <Icon icon={dark ? IconSun : IconMoon} />,
      run: () => updatePreferences({ theme: dark ? 'light' : 'dark' }) },
    { id: 'keys', group: 'Help', label: 'Keyboard shortcuts', shortcut: '?', icon: <Icon icon={IconKeyboard} />, run: () => setOpen('keys') },
  ], [documents, dark, create, navigate, updatePreferences]);

  const templateGrid = (
    <ul className="ofk-home-grid ofk-home-templates" aria-label="Templates">
      {templates.map((template) => (
        <HomeCard key={template.name} title={template.title} meta={template.summary}
          onOpen={() => create({ template: template.name })}
          preview={<img className="ofk-home-preview-image" alt="" decoding="async" src={templatePicture(template.name, appearance)} />} />
      ))}
    </ul>
  );
  const noMatch = (
    <p className="ofk-home-nomatch" role="status">
      Nothing matches “{query.trim()}”. <Button variant="quiet" onClick={() => { setQuery(''); searchRef.current?.focus(); }}>Clear search</Button>
    </p>
  );

  let content: React.ReactNode;
  if (listError) {
    content = (
      <ErrorState hero={<V2StateHero kind="torn-page" />}
        title={listError.blocked ? 'Diagrams can’t be opened here.' : 'Your diagrams didn’t load.'}
        description={listError.message} onRetry={refresh} />
    );
  } else if (view === 'news') {
    content = <>
      <p className="ofk-home-lede">
        What changed lately, newest first. <a href={`${REPO_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer">Full changelog</a>
      </p>
      <ol className="ofk-home-changelog">
        {HOME_NEWS.map(({ date, title, text }, index) => (
          <li key={title}>
            {date !== HOME_NEWS[index - 1]?.date ? <time dateTime={date}>{NEWS_DATE.format(new Date(`${date}T12:00:00`))}</time> : <span />}
            <div><h2>{title}</h2><p>{text}</p></div>
          </li>
        ))}
      </ol>
    </>;
  } else if (view === 'templates') {
    content = <>
      <p className="ofk-home-lede">Real diagrams to change. No API key needed.</p>
      {templates.length ? templateGrid : noMatch}
    </>;
  } else if (firstRun) {
    content = <>
      <p className="ofk-home-lede">Pick a way in, or drop a file anywhere to import it. Everything stays in this browser — no account, no upload.</p>
      <section aria-label="Start">
        <ul className="ofk-home-starts">
          {STARTS.map(({ kind, title, text, intent }) => (
            <StartCard key={kind} kind={kind} title={title} text={text} onStart={() => create(intent)} />
          ))}
        </ul>
      </section>
      <section className="ofk-home-section" aria-labelledby="ofk-home-templates">
        <h2 id="ofk-home-templates" className="ofk-home-section-title">Or start from a template</h2>
        {templateGrid}
      </section>
    </>;
  } else {
    const empty = view === 'starred' && documents && starredDocs.length === 0
      ? <EmptyState icon={<Icon icon={IconStar} />} title="Nothing starred yet."
        description="Star a diagram from its card, or press S on it, to keep it here and in the sidebar." />
      : view === 'archive' && archive && archive.length === 0
        ? <EmptyState icon={<Icon icon={IconArchive} />} title="Nothing archived."
          description="Archive a diagram to take it off your list without losing it. It waits here until you restore or delete it." />
        : null;
    content = <>
      {view === 'recents' ? (
        <ul className="ofk-home-chips" aria-label="Start">
          {STARTS.map(({ kind, chip, hint, intent }) => (
            <StartChip key={kind} kind={kind} title={chip} hint={hint} onStart={() => create(intent)} />
          ))}
        </ul>
      ) : null}
      {view === 'archive' && archive?.length ? (
        <p className="ofk-home-lede">Off your list, kept until you delete them. Restore one to open it again.</p>
      ) : null}
      {empty ?? (shown && shown.length === 0 ? noMatch : (
        <ul className="ofk-home-grid" data-layout={home.layout} aria-label="Diagrams" aria-busy={shown === null}
          aria-multiselectable="true" onKeyDown={onGridKey}>
          {shown ? shown.map((summary) => view === 'archive' ? (
            <ArchivedCard key={summary.id} summary={summary} thumbnail={thumbnails.get(summary.id)} appearance={appearance}
              selection={selectionFor(summary.id)}
              onRestore={() => void restore(targets(summary.id))}
              onDelete={() => setDeleting(targets(summary.id).flatMap((id) => byId.get(id) ?? []))} />
          ) : (
            <DiagramCard key={summary.id} summary={summary} thumbnail={thumbnails.get(summary.id)} appearance={appearance}
              renameRef={renameRef} selection={selectionFor(summary.id)}
              rename={renaming?.id === summary.id ? {
                draft: renaming.draft,
                onChange: (draft) => setRenaming({ id: summary.id, draft }),
                onCommit: () => void commitRename(),
                onCancel: () => { renameCancelled.current = true; setRenaming(null); focusAfter(summary.id); },
              } : null}
              actions={{
                starred: home.starred.includes(summary.id),
                onStar: () => toggleStars(targets(summary.id)),
                onRename: () => startRename(summary.id),
                onDuplicate: () => void duplicate(summary),
                onArchive: () => void archiveIds(targets(summary.id)),
              }} />
          )) : [0, 1, 2, 3].map((index) => <SkeletonCard key={index} />)}
        </ul>
      ))}
    </>;
  }

  return (
    <SystemRoot appearance={appearance} density={preferences.density}>
      <div className="ofk-home-page" data-testid="v2-home" data-selecting={selected.length ? '' : undefined}
        onDragEnter={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true); } }}
        onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={(event) => {
          if (!event.dataTransfer.files.length) return;
          event.preventDefault();
          setDragging(false);
          void importFiles([...event.dataTransfer.files]);
        }}>
        <aside className="ofk-home-sidebar">
          <div className="ofk-home-sidebar-top">
            <Link to="/home" className="ofk-home-brand" aria-label="OpenFlowKit home">
              <img src="/Logo_openflowkit.svg" alt="" width="24" height="24" />
              <span>OpenFlowKit</span>
            </Link>
            <Tooltip content={dark ? 'Light theme' : 'Dark theme'}>
              <IconButton variant="quiet" label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
                icon={<Icon icon={dark ? IconSun : IconMoon} />}
                onClick={() => updatePreferences({ theme: dark ? 'light' : 'dark' })} />
            </Tooltip>
          </div>

          <label className="ofk-home-search">
            <Icon icon={IconSearch} />
            <input ref={searchRef} type="search" placeholder={view === 'templates' ? 'Search templates' : 'Search diagrams'}
              aria-label={view === 'templates' ? 'Search templates' : 'Search diagrams'} value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') { setQuery(''); event.currentTarget.blur(); } }} />
            <kbd aria-hidden="true">/</kbd>
          </label>

          <nav className="ofk-home-nav" aria-label="Home">
            {VIEWS.map((entry) => (
              <Link key={entry.view} to={viewLink(entry.view)} className="ofk-home-nav-item" data-view={entry.view}
                aria-current={view === entry.view ? 'page' : undefined}>
                <Icon icon={entry.icon} />
                <span>{entry.title}</span>
                {count(entry.view) ? <span className="ofk-home-nav-count">{count(entry.view)}</span> : null}
              </Link>
            ))}
          </nav>

          {starredDocs.length > 0 ? (
            <section className="ofk-home-sidebar-section" aria-labelledby="ofk-home-starred">
              <h2 id="ofk-home-starred">Starred</h2>
              <ul>
                {starredDocs.map(({ id, name }) => (
                  <li key={id}><Link to={`/d/${id}`} className="ofk-home-nav-item" title={name}><Icon icon={IconHierarchy2} /><span>{name}</span></Link></li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="ofk-home-sidebar-foot">
            <div className="ofk-home-local">
              <span className="ofk-home-local-icon"><Icon icon={IconLock} /></span>
              <p><strong>Private by default</strong>Saved in this browser. No account, no upload.</p>
            </div>
            <Link to={viewLink('news')} className="ofk-home-nav-item" aria-current={view === 'news' ? 'page' : undefined}>
              <Icon icon={IconSpeakerphone} />
              <span>What’s new</span>
              {unseenNews ? <span className="ofk-home-dot" aria-label="New" /> : null}
            </Link>
            <a className="ofk-home-nav-item" href={ISSUE_URL} target="_blank" rel="noreferrer">
              <Icon icon={IconBulb} /><span>Request a feature</span>
              <Icon icon={IconArrowUpRight} />
            </a>
            <a className="ofk-home-nav-item" href={REPO_URL} target="_blank" rel="noreferrer"
              aria-label={stars === null ? 'Star on GitHub' : `Star on GitHub, ${stars} stars`}>
              <Icon icon={IconBrandGithub} /><span>Star on GitHub</span>
              {stars === null ? <Icon icon={IconArrowUpRight} /> : (
                <span className="ofk-home-stars" aria-hidden="true"><Icon icon={IconStarFilled} />{formatStars(stars)}</span>
              )}
            </a>
          </div>
        </aside>

        <main className="ofk-home-main">
          <header className="ofk-home-head">
            <h1>{firstRun ? 'Let’s draw your first diagram.' : viewTitle}</h1>
            {listing ? (
              <div className="ofk-home-head-tools">
                <Button ref={sortRef} variant="quiet" className="ofk-home-sort" aria-haspopup="menu" aria-expanded={open === 'sort'}
                  aria-label={`Sort by ${sortTitle}`} onClick={() => setOpen(open === 'sort' ? null : 'sort')}>
                  {sortTitle} <Icon icon={IconChevronDown} />
                </Button>
                <Menu open={open === 'sort'} anchorRef={sortRef} onClose={() => setOpen(null)} label="Sort by" placement="bottom-end">
                  {SORTS.map(({ sort, title }) => (
                    <MenuItem key={sort} role="menuitemradio" checked={home.sort === sort}
                      onSelect={() => updateHome({ sort })}>{title}</MenuItem>
                  ))}
                </Menu>
                <Segmented label="Layout" value={home.layout} onChange={(layout) => updateHome({ layout })} options={[
                  { value: 'grid', title: 'Grid', label: <><Icon icon={IconLayoutGrid} /><span className="ofk-visually-hidden">Grid</span></> },
                  { value: 'list', title: 'List', label: <><Icon icon={IconLayoutList} /><span className="ofk-visually-hidden">List</span></> },
                ]} />
              </div>
            ) : null}
            <Tooltip content="Import .json, Mermaid, D2 or Structurizr — or drop files anywhere">
              <Button variant="quiet" className="ofk-home-import" onClick={() => fileRef.current?.click()}>
                <Icon icon={IconFileImport} /> <span>Import</span>
              </Button>
            </Tooltip>
            <input ref={fileRef} type="file" accept={IMPORT_ACCEPT} multiple hidden aria-hidden="true" tabIndex={-1}
              onChange={(event) => { const files = [...(event.target.files ?? [])]; event.target.value = ''; void importFiles(files); }} />
            <Tooltip content="New diagram" shortcut="N">
              <Button variant="primary" data-home-new disabled={listError?.blocked} onClick={() => create()}>
                <Icon icon={IconPlus} /> New diagram
              </Button>
            </Tooltip>
          </header>
          <div className="ofk-home-content">
            {notice ? <HomeNoticeStrip notice={notice} onDismiss={() => setNotice(null)} /> : null}
            {failed.length > 0 ? (
              <section className="ofk-home-notice" data-tone="warning" aria-label="Not brought over">
                <Icon icon={IconAlertTriangle} />
                <div>
                  <p><strong>{failed.length === 1 ? '1 diagram' : `${failed.length} diagrams`} from the previous editor didn’t come over yet.</strong> {failed.length === 1 ? 'It’s' : 'They’re'} safe in this browser.</p>
                  <ul>{failed.map(([v1Id, entry]) => <li key={v1Id}>{entry.name ?? v1Id}: {entry.error}</li>)}</ul>
                </div>
                {/* The import runs once per page load; a reload is the retry. */}
                <Button variant="quiet" onClick={() => window.location.reload()}>Try again</Button>
              </section>
            ) : null}
            {content}
          </div>
        </main>

        {selected.length ? (
          <div className="ofk-home-selectionbar" role="toolbar" aria-label="Selection">
            <span className="ofk-home-selectionbar-count" role="status">{selected.length} selected</span>
            {view === 'archive' ? <>
              <Button variant="quiet" onClick={() => void restore(selected)}><Icon icon={IconArrowBackUp} /> Restore</Button>
              <Button variant="quiet" className="ofk-home-head-danger" onClick={() => setDeleting(selected.flatMap((id) => byId.get(id) ?? []))}>
                <Icon icon={IconTrashX} /> Delete forever
              </Button>
            </> : <>
              <Button variant="quiet" onClick={() => toggleStars(selected)}>
                <Icon icon={selectedAllStarred ? IconStarFilled : IconStar} /> {selectedAllStarred ? 'Unstar' : 'Star'}
              </Button>
              <Button variant="quiet" onClick={() => void archiveIds(selected)}><Icon icon={IconArchive} /> Archive</Button>
            </>}
            <Tooltip content="Clear selection" shortcut="Esc">
              <IconButton variant="quiet" label="Clear selection" icon={<Icon icon={IconX} />} onClick={() => setSelected([])} />
            </Tooltip>
          </div>
        ) : null}

        {dragging ? (
          <div className="ofk-home-drop" aria-hidden="true">
            <Icon icon={IconUpload} />
            <strong>Drop to import</strong>
            <span>OpenFlowKit .json, Mermaid, D2, Structurizr or OpenFlow DSL</span>
          </div>
        ) : null}

        <ToastRegion items={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
        {/* Mounted only while open: hundreds of diagrams are not hidden DOM on every render. */}
        {open === 'palette' ? (
          <CommandPalette open onClose={() => setOpen(null)} commands={commands} label="Find anything"
            placeholder="Find a diagram, template or action…" emptyLabel="Nothing matches." />
        ) : null}

        <Dialog open={open === 'keys'} onClose={() => setOpen(null)} title="Keyboard shortcuts"
          actions={<Button variant="quiet" onClick={() => setOpen(null)}>Close</Button>}>
          <dl className="ofk-home-keys">
            {([
              [['N'], 'New diagram'], [[mod, 'K'], 'Find anything'], [['/'], 'Search this view'], [['↑', '↓', '←', '→'], 'Move between diagrams'],
              [['Enter'], 'Open'], [['Space'], 'Select'], [['Shift', '↓'], 'Select a range'], [[mod, 'A'], 'Select all'],
              [['S'], 'Star'], [['F2'], 'Rename'], [['Del'], 'Archive'], [['Esc'], 'Clear selection'],
            ] as const).map(([keys, what]) => <div key={what}><dt>{what}</dt><dd><Kbd keys={keys} /></dd></div>)}
          </dl>
        </Dialog>

        <Dialog open={deleting !== null} onClose={() => setDeleting(null)}
          title={deleting?.length === 1 ? `Delete “${deleting[0]!.name}” forever?` : `Delete ${plural(deleting?.length ?? 0, 'diagram')} forever?`}
          description={`${deleting?.length === 1 ? 'It’s' : 'They’re'} removed from this browser. This can’t be undone.`}
          actions={<>
            <Button variant="quiet" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>Delete forever</Button>
          </>} />
      </div>
    </SystemRoot>
  );
}
