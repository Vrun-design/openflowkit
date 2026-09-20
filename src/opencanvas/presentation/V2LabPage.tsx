import React, { useEffect, useRef, useState } from 'react';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowUpRight,
  IconBrush,
  IconChevronDown,
  IconCircle,
  IconCircleDot,
  IconDownload,
  IconFrame,
  IconHandStop,
  IconLayoutGrid,
  IconLine,
  IconLink,
  IconMap,
  IconMessage,
  IconPalette,
  IconPencil,
  IconPhotoUp,
  IconPointer,
  IconPolygon,
  IconRadiusBottomRight,
  IconShare,
  IconSparkles,
  IconSquare,
  IconStack2,
  IconTypography,
  IconWand,
} from '@tabler/icons-react';
import { useTheme, type Theme as AppTheme } from '@/context/ThemeContext';
import {
  AgentBadge,
  AgentPanel,
  Button,
  CanvasFeedbackOverlay,
  Checkbox,
  ColorPicker,
  ColorSwatch,
  CommandPalette,
  Composer,
  ContextBar,
  ContextGroup,
  Dialog,
  Dropdown,
  EmptyState,
  ErrorState,
  Field,
  FloatingRegion,
  Icon,
  IconButton,
  Kbd,
  Menu,
  MenuGroup,
  MenuItem,
  MenuSeparator,
  NumberField,
  OffscreenChanges,
  Panel,
  PermissionPrompt,
  Popover,
  PopoverHeader,
  Progress,
  ProposalBar,
  ProposalReview,
  ProvenanceBadge,
  Segmented,
  Select,
  Skeleton,
  SkeletonLines,
  Slider,
  Spinner,
  Status,
  Switch,
  SystemRoot,
  Tabs,
  Thinking,
  ToastRegion,
  Toolbar,
  Tooltip,
  Tree,
  foundation,
  materials,
  spring,
  springs,
  themes,
  type AgentMessage,
  type ChangeDecision,
  type ColorRole,
  type ComposerScope,
  type FeedbackBounds,
  type ProposalView,
  type ToastItem,
  type TreeNode,
} from './design-system';
import './v2LabPage.css';

// ponytail: design lab, not product. Fake data only; every control is the real
// design-system primitive so what is tweaked here is what ships. Replaced by the
// real shell in V2-04. Not registered as a rollout flag: it is a dev route, not a rollout.

type Density = 'comfortable' | 'compact';
type Tab = 'shell' | 'primitives';
const proposalLabels = {
  working: 'Agent is drafting changes',
  ready: 'Agent proposal ready',
  stale: 'Document changed since proposal — request a fresh one',
  applied: 'Proposal applied',
  accept: 'Accept',
  discard: 'Discard',
  cancel: 'Cancel',
  undo: 'Undo',
  failed: 'Could not apply. Nothing changed.',
};
const nodes = [
  { id: 'api', label: 'API Gateway', x: 260, y: 230, w: 160, h: 72 },
  { id: 'auth', label: 'Auth Service', x: 560, y: 150, w: 160, h: 72 },
  { id: 'db', label: 'Postgres', x: 560, y: 320, w: 160, h: 72 },
] as const;
const proposedNode = { id: 'cache', label: 'Redis cache', x: 840, y: 320, w: 160, h: 72 };
const presets = ['transparent', '#252724', '#fdfdfb', '#e95420', '#275c9b', '#286340', '#fce9df'];
const changes = [
  { id: 'c1', kind: 'addition' as const, label: 'Redis cache', reason: 'Session lookups hit Postgres on every request.' },
  { id: 'c2', kind: 'addition' as const, label: 'Postgres → Redis cache', reason: 'Write-through on session update.' },
  { id: 'c3', kind: 'modification' as const, label: 'Auth Service label', reason: 'Renamed to match the repo module.' },
];

function ShellMock({ appearance }: { appearance: 'light' | 'dark' }) {
  const { setTheme } = useTheme();
  const [tool, setTool] = useState('select');
  const [selectMenu, setSelectMenu] = useState(false);
  const [shapeMenu, setShapeMenu] = useState(false);
  const [zoomMenu, setZoomMenu] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [strokeOpen, setStrokeOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [layers, setLayers] = useState(false);
  const [agentOpen, setAgentOpen] = useState(true);
  const [palette, setPalette] = useState(false);
  const [permission, setPermission] = useState(false);
  const [fill, setFill] = useState('#fdfdfb');
  const [stroke, setStroke] = useState('#252724');
  const [strokeStyle, setStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [strokeAlign, setStrokeAlign] = useState('center');
  const [strokeWidth, setStrokeWidth] = useState<number | null>(1.5);
  const [size, setSize] = useState({ w: 160, h: 72 });
  const [locked, setLocked] = useState(true);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<ComposerScope>('selection');
  const [review, setReview] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, ChangeDecision>>({});
  const [revision, setRevision] = useState(1);
  const [baseRevision, setBaseRevision] = useState(1);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['page1']));
  const [layer, setLayer] = useState<string | null>('api');
  const selectRef = useRef<HTMLButtonElement>(null);
  const shapeRef = useRef<HTMLButtonElement>(null);
  const zoomRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLButtonElement>(null);
  const strokeRef = useRef<HTMLButtonElement>(null);
  const bgRef = useRef<HTMLButtonElement>(null);
  const selected = nodes[0];
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPalette(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const feedback: FeedbackBounds[] = [
    { id: 'sel', kind: 'selection', x: selected.x, y: selected.y, width: size.w, height: size.h },
    ...(review
      ? [
          { id: 'add', kind: 'addition' as const, x: proposedNode.x, y: proposedNode.y, width: proposedNode.w, height: proposedNode.h },
          { id: 'mod', kind: 'modification' as const, x: nodes[1].x, y: nodes[1].y, width: nodes[1].w, height: nodes[1].h },
        ]
      : []),
  ];
  function ask(text: string, askScope: ComposerScope) {
    setMessages((m) => [...m, { id: `u${m.length}`, role: 'user', text: `${text}  (${askScope})`, at: 'now' }]);
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setBaseRevision(revision);
      setDecisions({});
      setReview(true);
      setMessages((m) => [
        ...m,
        { id: `a${m.length}`, role: 'agent', text: 'I added a Redis cache in front of Postgres for session lookups and renamed Auth Service to match the module. Review the 3 changes on the canvas.', at: 'now' },
      ]);
    }, 1200);
  }
  const tree: TreeNode[] = [
    {
      id: 'page1',
      label: 'Page 1',
      icon: <Icon icon={IconFrame} />,
      children: [
        ...nodes.map((n) => ({ id: n.id, label: n.label, icon: <Icon icon={IconSquare} /> })),
        ...(review ? [{ id: 'cache', label: 'Redis cache', icon: <Icon icon={IconSquare} />, caption: 'agent' }] : []),
      ],
    },
    { id: 'page2', label: 'Page 2', icon: <Icon icon={IconFrame} />, children: [] },
  ];
  return (
    <div className="ofk-lab-shell" data-ofk-appearance={appearance} data-agent-open={agentOpen || undefined}>
      <div className="ofk-lab-canvas" aria-label="Mock canvas">
        <svg className="ofk-lab-scene" aria-hidden="true">
          <path d={`M${selected.x + size.w} ${selected.y + size.h / 2} H560 V186`} className="ofk-lab-edge" />
          <path d={`M${selected.x + size.w} ${selected.y + size.h / 2} H560 V356`} className="ofk-lab-edge" />
          {review && <path d="M720 356 H840" className="ofk-lab-edge" strokeDasharray="4 4" />}
        </svg>
        {nodes.map((n) => (
          <div
            key={n.id}
            className="ofk-lab-node"
            style={{
              left: n.x,
              top: n.y,
              width: n.id === 'api' ? size.w : n.w,
              height: n.id === 'api' ? size.h : n.h,
              ...(n.id === 'api' ? { background: fill, borderColor: stroke, borderWidth: strokeWidth ?? 1.5, borderStyle: strokeStyle } : {}),
            }}
          >
            {n.label}
          </div>
        ))}
        {review && (
          <div className="ofk-lab-node" data-proposed style={{ left: proposedNode.x, top: proposedNode.y, width: proposedNode.w, height: proposedNode.h }}>
            {proposedNode.label} <ProvenanceBadge />
          </div>
        )}
        <CanvasFeedbackOverlay items={feedback} appearance={appearance} />
        {review && (
          <OffscreenChanges items={[{ id: 'far', kind: 'addition', x: 2400, y: 900 }]} viewport={{ width: 1440, height: 900 }} onShow={() => setToasts((t) => [...t, { id: `t${t.length}`, tone: 'info', title: 'Camera would move to the change (mock)' }])} />
        )}
      </div>

      <FloatingRegion slot="top-start">
        <Toolbar label="Document">
          <span className="ofk-lab-logo" aria-hidden="true" />
          <Button variant="quiet">payments-architecture</Button>
          <Button variant="quiet" aria-haspopup="menu">
            <Icon icon={IconPalette} /> <Icon icon={IconChevronDown} />
          </Button>
        </Toolbar>
        <Status live tone="success">
          Saved
        </Status>
      </FloatingRegion>

      <FloatingRegion slot="top-end">
        <Toolbar label="History and share">
          <Tooltip content="Undo" shortcut="⌘Z">
            <IconButton variant="quiet" label="Undo" icon={<Icon icon={IconArrowBackUp} />} />
          </Tooltip>
          <Tooltip content="Redo" shortcut="⇧⌘Z">
            <IconButton variant="quiet" label="Redo" icon={<Icon icon={IconArrowForwardUp} />} disabled />
          </Tooltip>
          <IconButton variant="quiet" label="Share" icon={<Icon icon={IconShare} />} />
          <Button variant="quiet">Export</Button>
          <Button variant="primary">Present</Button>
        </Toolbar>
        <Toolbar label="Agent">
          <AgentBadge name="Claude" state={busy ? 'working' : permission ? 'waiting' : 'idle'} />
          <Tooltip content={agentOpen ? 'Hide agent panel' : 'Show agent panel'} shortcut="⌘J">
            <IconButton variant="quiet" label="Agent panel" icon={<Icon icon={IconMessage} />} selected={agentOpen} onClick={() => setAgentOpen((v) => !v)} />
          </Tooltip>
        </Toolbar>
      </FloatingRegion>

      <ContextBar
        label="Selection"
        style={{ position: 'absolute', left: selected.x, top: selected.y - foundation.layout.contextGap - foundation.control.regular - 8, zIndex: foundation.layer.context }}
      >
        <ContextGroup label="Style">
          <ColorSwatch ref={fillRef} label="Fill" color={fill} onClick={() => setFillOpen((v) => !v)} />
          <ColorSwatch ref={strokeRef} label="Stroke" color={stroke} onClick={() => setStrokeOpen((v) => !v)} />
          <IconButton variant="quiet" label="Corner radius" icon={<Icon icon={IconRadiusBottomRight} />} />
        </ContextGroup>
        <ContextGroup label="Size">
          <NumberField label="Width" hideLabel prefix="W" value={size.w} onChange={(w) => setSize({ w, h: locked ? Math.round((w * 72) / 160) : size.h })} min={16} />
          <NumberField label="Height" hideLabel prefix="H" value={size.h} onChange={(h) => setSize({ h, w: locked ? Math.round((h * 160) / 72) : size.w })} min={16} />
          <IconButton variant="quiet" label="Lock aspect ratio" icon={<Icon icon={IconLink} />} selected={locked} onClick={() => setLocked((v) => !v)} />
        </ContextGroup>
        <ContextGroup label="Agent">
          <Tooltip content="Ask agent about selection" shortcut="⌘I">
            <IconButton variant="quiet" label="Ask agent about selection" icon={<Icon icon={IconSparkles} />} onClick={() => setAgentOpen(true)} />
          </Tooltip>
        </ContextGroup>
        <ContextGroup label="Export">
          <IconButton variant="quiet" label="Export selection" icon={<Icon icon={IconDownload} />} />
        </ContextGroup>
      </ContextBar>
      <Popover open={fillOpen} anchorRef={fillRef} onClose={() => setFillOpen(false)} placement="bottom-start">
        <PopoverHeader title="Fill" close={<Button variant="quiet" onClick={() => setFillOpen(false)}>Done</Button>} />
        <div className="ofk-popover-body">
          <ColorPicker value={fill} onChange={setFill} presets={presets} />
        </div>
      </Popover>
      <Popover open={strokeOpen} anchorRef={strokeRef} onClose={() => setStrokeOpen(false)} placement="bottom-start">
        <PopoverHeader title="Stroke" close={<Button variant="quiet" onClick={() => setStrokeOpen(false)}>Done</Button>} />
        <div className="ofk-popover-body">
          <Segmented<'solid' | 'dashed' | 'dotted'> label="Style" value={strokeStyle} onChange={setStrokeStyle} options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }]} />
          <div className="ofk-lab-row">
            <NumberField label="Width" hideLabel value={strokeWidth} onChange={setStrokeWidth} min={0} max={24} step={0.5} unit="px" />
            <Dropdown label="Align" hideLabel value={strokeAlign} onChange={setStrokeAlign} options={[{ value: 'center', label: 'Center' }, { value: 'inside', label: 'Inside' }, { value: 'outside', label: 'Outside' }]} />
          </div>
          <ColorPicker value={stroke} onChange={setStroke} presets={presets} />
        </div>
      </Popover>

      <FloatingRegion slot="bottom-start">
        <Toolbar label="View">
          <ColorSwatch ref={bgRef} label="Canvas background" color={themes[appearance].canvas} onClick={() => setBgOpen((v) => !v)} />
          <Tooltip content="Layers" shortcut="⌘L">
            <IconButton variant="quiet" label="Layers" icon={<Icon icon={IconStack2} />} selected={layers} onClick={() => setLayers((v) => !v)} />
          </Tooltip>
          <Tooltip content="Minimap">
            <IconButton variant="quiet" label="Minimap" icon={<Icon icon={IconMap} />} />
          </Tooltip>
          <Button ref={zoomRef} variant="quiet" className="ofk-numeric" aria-haspopup="menu" onClick={() => setZoomMenu(true)}>
            100%
          </Button>
        </Toolbar>
      </FloatingRegion>
      <Popover open={bgOpen} anchorRef={bgRef} onClose={() => setBgOpen(false)} placement="top-start">
        <PopoverHeader title="Canvas background" close={<Button variant="quiet" onClick={() => setBgOpen(false)}>Done</Button>} />
        <div className="ofk-popover-body">
          <ColorPicker value={themes[appearance].canvas} onChange={() => {}} presets={['#f7f7f5', '#ffffff', '#191b19']} allowAlpha={false} />
        </div>
      </Popover>
      <Menu open={zoomMenu} anchorRef={zoomRef} onClose={() => setZoomMenu(false)} label="Zoom" placement="top-start">
        <MenuItem onSelect={() => {}} shortcut={['⌘', '+']}>Zoom in</MenuItem>
        <MenuItem onSelect={() => {}} shortcut={['⌘', '−']}>Zoom out</MenuItem>
        <MenuItem onSelect={() => {}} shortcut={['⇧', '1']}>Zoom to fit</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => {}}>Zoom to 50%</MenuItem>
        <MenuItem onSelect={() => {}} checked>Zoom to 100%</MenuItem>
        <MenuItem onSelect={() => {}}>Zoom to 200%</MenuItem>
      </Menu>

      <FloatingRegion slot="bottom-center" className="ofk-lab-dock">
        {tool === 'draw' && (
          <Toolbar label="Pen options" className="ofk-lab-tool-options">
            <ColorSwatch label="Stroke color" color={stroke} />
            <NumberField label="Stroke width" hideLabel value={4} onChange={() => {}} unit="px" />
          </Toolbar>
        )}
        <Toolbar label="Create">
          <Tooltip content="Select" shortcut="V">
            <IconButton ref={selectRef} variant="quiet" label="Select" icon={<Icon icon={tool === 'hand' ? IconHandStop : IconPointer} />} selected={tool === 'select' || tool === 'hand'} onClick={() => setTool('select')} onContextMenu={(e) => { e.preventDefault(); setSelectMenu(true); }} />
          </Tooltip>
          <Tooltip content="Pin comment" shortcut="C">
            <IconButton variant="quiet" label="Comment" icon={<Icon icon={IconCircleDot} />} selected={tool === 'comment'} onClick={() => setTool('comment')} />
          </Tooltip>
          <Tooltip content="Upload image" shortcut="U">
            <IconButton variant="quiet" label="Upload" icon={<Icon icon={IconPhotoUp} />} selected={tool === 'upload'} onClick={() => setTool('upload')} />
          </Tooltip>
          <Tooltip content="Frame" shortcut="F">
            <IconButton variant="quiet" label="Frame" icon={<Icon icon={IconFrame} />} selected={tool === 'frame'} onClick={() => setTool('frame')} />
          </Tooltip>
          <Tooltip content="Shape" shortcut="R">
            <IconButton ref={shapeRef} variant="quiet" label="Shape" icon={<Icon icon={IconSquare} />} selected={tool === 'shape'} onClick={() => { setTool('shape'); setShapeMenu(true); }} />
          </Tooltip>
          <Tooltip content="Draw" shortcut="P">
            <IconButton variant="quiet" label="Draw" icon={<Icon icon={IconPencil} />} selected={tool === 'draw'} onClick={() => setTool('draw')} />
          </Tooltip>
          <Tooltip content="Text" shortcut="T">
            <IconButton variant="quiet" label="Text" icon={<Icon icon={IconTypography} />} selected={tool === 'text'} onClick={() => setTool('text')} />
          </Tooltip>
          <span className="ofk-lab-dock-sep" aria-hidden="true" />
          <Tooltip content="Technical assets" shortcut="A">
            <IconButton variant="quiet" label="Assets" icon={<Icon icon={IconLayoutGrid} />} selected={tool === 'asset'} onClick={() => setTool('asset')} />
          </Tooltip>
          <Tooltip content="Generate with agent" shortcut="⌘I">
            <IconButton variant="quiet" label="Generate" icon={<Icon icon={IconWand} />} onClick={() => setAgentOpen(true)} />
          </Tooltip>
        </Toolbar>
      </FloatingRegion>
      <Menu open={selectMenu} anchorRef={selectRef} onClose={() => setSelectMenu(false)} label="Select tools" placement="top-start">
        <MenuItem onSelect={() => setTool('select')} icon={<Icon icon={IconPointer} />} shortcut="V">Select</MenuItem>
        <MenuItem onSelect={() => setTool('hand')} icon={<Icon icon={IconHandStop} />} shortcut="H">Move</MenuItem>
      </Menu>
      <Menu open={shapeMenu} anchorRef={shapeRef} onClose={() => setShapeMenu(false)} label="Shapes" placement="top-start">
        <MenuItem onSelect={() => {}} icon={<Icon icon={IconSquare} />} shortcut="R">Rectangle</MenuItem>
        <MenuItem onSelect={() => {}} icon={<Icon icon={IconLine} />} shortcut="L">Line</MenuItem>
        <MenuItem onSelect={() => {}} icon={<Icon icon={IconArrowUpRight} />} shortcut={['⇧', 'L']}>Arrow</MenuItem>
        <MenuItem onSelect={() => {}} icon={<Icon icon={IconCircle} />} shortcut="O">Ellipse</MenuItem>
        <MenuItem onSelect={() => {}} icon={<Icon icon={IconPolygon} />}>Polygon</MenuItem>
      </Menu>

      {layers && (
        <Panel title="Layers" side="start" onClose={() => setLayers(false)} style={{ bottom: 88 }}>
          <Tree label="Layers" nodes={tree} selectedId={layer} expandedIds={expanded} onSelect={setLayer} onToggle={(id) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />
        </Panel>
      )}

      {agentOpen && (
        <AgentPanel
          title="Agent"
          onClose={() => setAgentOpen(false)}
          tools={<Button variant="quiet" onClick={() => setPermission(true)}>Simulate permission</Button>}
          messages={messages}
          empty={<EmptyState icon={<Icon icon={IconSparkles} />} title="Ask for a change" description="Scope is explicit. Changes arrive as a reviewable proposal, never as silent edits." />}
          composer={
            <Composer
              busy={busy}
              scope={scope}
              onScopeChange={setScope}
              onSubmit={ask}
              onCancel={() => setBusy(false)}
              mentions={scope === 'selection' ? [{ id: 'api', label: 'API Gateway' }] : []}
              onAddMention={() => {}}
              provider={<Button variant="quiet"><Icon icon={IconBrush} /> Claude Opus 5 <Icon icon={IconChevronDown} /></Button>}
            />
          }
          streaming={busy ? 'Reading API Gateway and Postgres…' : undefined}
        />
      )}

      {review && (
        <div className="ofk-lab-review">
          <ProposalReview
            id="p1"
            baseRevision={baseRevision}
            currentRevision={revision}
            scopeLabel="Scope: this page"
            changes={changes}
            decisions={decisions}
            onDecide={(id, d) => setDecisions((s) => ({ ...s, [id]: d }))}
            onApply={async (_id, _rev, accepted) => {
              await new Promise((r) => window.setTimeout(r, 600));
              setReview(false);
              setRevision((r) => r + 1);
              setToasts((t) => [...t, { id: `t${t.length}`, tone: 'success', title: `Applied ${accepted.length} changes`, action: { label: 'Undo', onClick: () => {} } }]);
            }}
            onDiscard={() => setReview(false)}
          />
          <Button variant="quiet" onClick={() => setRevision((r) => r + 1)}>
            Simulate manual edit (stale)
          </Button>
        </div>
      )}

      {permission && (
        <div className="ofk-lab-permission">
          <PermissionPrompt agent="Claude" request="Write access to Page 2 for this task: add a deployment diagram." onAllowOnce={() => setPermission(false)} onAllowSession={() => setPermission(false)} onDeny={() => setPermission(false)} />
        </div>
      )}
      <ToastRegion items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        recentIds={['fit']}
        commands={[
          { id: 'fit', label: 'Zoom to fit', group: 'View', shortcut: ['⇧', '1'], run: () => {} },
          { id: 'dark', label: 'Toggle dark mode', group: 'View', run: () => setTheme(appearance === 'dark' ? 'light' : 'dark') },
          { id: 'layers', label: 'Show layers', group: 'View', shortcut: ['⌘', 'L'], run: () => setLayers(true) },
          { id: 'rect', label: 'Rectangle', group: 'Create', shortcut: 'R', icon: <Icon icon={IconSquare} />, run: () => setTool('shape') },
          { id: 'text', label: 'Text', group: 'Create', shortcut: 'T', icon: <Icon icon={IconTypography} />, run: () => setTool('text') },
          { id: 'ask', label: 'Ask agent', group: 'Agent', shortcut: ['⌘', 'I'], icon: <Icon icon={IconSparkles} />, run: () => setAgentOpen(true) },
          { id: 'page2', label: 'Go to Page 2', group: 'Pages', keywords: ['navigate'], run: () => {} },
          { id: 'api', label: 'API Gateway', group: 'Objects', icon: <Icon icon={IconSquare} />, run: () => {} },
        ]}
      />
      <span className="ofk-lab-hint ofk-caption">
        <Kbd keys={['⌘', 'K']} /> commands · right-click Select for flyout
      </span>
    </div>
  );
}

function SpringDemo() {
  const [x, setX] = useState(0);
  const frame = useRef(0);
  function launch() {
    cancelAnimationFrame(frame.current);
    const s = spring(0, 220, springs.release, 1800);
    const start = performance.now();
    const tick = (now: number) => {
      const sample = s.at(now - start);
      setX(sample.value);
      if (!sample.done) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }
  return (
    <div className="ofk-lab-row">
      <Button onClick={launch}>Release spring</Button>
      <span className="ofk-lab-spring-track">
        <span className="ofk-lab-spring-ball" style={{ transform: `translateX(${x}px)` }} />
      </span>
    </div>
  );
}

function Primitives({ appearance }: { appearance: 'light' | 'dark' }) {
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState('#e95420');
  const [n, setN] = useState<number | null>(12);
  const [committed, setCommitted] = useState<string>('—');
  const [align, setAlign] = useState('c');
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [tab, setTab] = useState<'one' | 'two'>('one');
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [notices, setNotices] = useState<ToastItem[]>([
    { id: 'lab-err', tone: 'danger', title: 'Export failed — work is safe', description: 'Persistent errors stay until dismissed.', persistent: true },
  ]);
  const menuRef = useRef<HTMLButtonElement>(null);
  const overlayItems: FeedbackBounds[] = (['hover', 'selection', 'binding', 'addition', 'modification', 'removal', 'locked'] as const).map((kind, i) => ({ id: kind, kind, x: 16 + i * 120, y: 24, width: 96, height: 56 }));
  return (
    <div className="ofk-lab-primitives">
      <section>
        <h2>Button</h2>
        <div className="ofk-lab-row">
          {(['primary', 'secondary', 'quiet', 'danger'] as const).map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
          <Button selected>selected</Button>
          <Button disabled>disabled</Button>
          <Button busy={busy} onClick={() => { setBusy(true); window.setTimeout(() => setBusy(false), 1500); }}>
            {busy ? 'busy' : 'click → busy'}
          </Button>
          <IconButton label="Undo" icon={<Icon icon={IconArrowBackUp} />} />
          <IconButton variant="quiet" label="Select" icon={<Icon icon={IconPointer} />} selected />
          <Tooltip content="Tooltip with shortcut" shortcut="⌘Z">
            <IconButton variant="quiet" label="Hover me" icon={<Icon icon={IconArrowForwardUp} />} />
          </Tooltip>
        </div>
      </section>
      <section>
        <h2>Fields and controls</h2>
        <div className="ofk-lab-row">
          <Field label="Name" placeholder="Node label" />
          <Field label="Width" hint="CSS pixels" defaultValue="160" />
          <Field label="Height" error="Must be a number" defaultValue="abc" />
          <Field label="Locked" disabled defaultValue="read only" />
        </div>
        <div className="ofk-lab-row">
          <NumberField label="Stroke" value={n} onChange={setN} onCommit={(v) => setCommitted(`committed ${v}px`)} unit="px" step={0.5} min={0} />
          <NumberField label="Mixed" value={null} onChange={() => {}} unit="px" />
          <NumberField label="W" prefix="W" hideLabel value={273} onChange={() => {}} />
          <Dropdown label="Align" value={align} onChange={setAlign} options={[{ value: 'c', label: 'Center' }, { value: 'i', label: 'Inside' }, { value: 'o', label: 'Outside', hint: 'nodes' }]} />
          <Dropdown label="Empty" value={null} onChange={() => {}} placeholder="Pick…" options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta', disabled: true }]} />
          <Select label="Native" options={[{ value: 'c', label: 'Center' }, { value: 'i', label: 'Inside' }]} />
          <Slider label="Opacity" min={0} max={100} defaultValue={80} readout="80%" />
          <code className="ofk-mono" aria-live="polite">stroke {n ?? 'mixed'} · align {align} · {committed} · type, Esc reverts, Enter commits</code>
        </div>
        <div className="ofk-lab-row">
          <Checkbox label="Snap to grid" defaultChecked />
          <Checkbox label="Mixed" indeterminate />
          <Switch label="Show guides" defaultChecked />
          <Switch label="Disabled" disabled />
          <Segmented<'a' | 'b' | 'c'> label="Style" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Solid' }, { value: 'b', label: 'Dashed' }, { value: 'c', label: 'Dotted' }]} />
          <ColorSwatch label="Fill" color={color} />
          <ColorSwatch label="Mixed" color={null} />
        </div>
      </section>
      <section>
        <h2>Color picker</h2>
        <div className="ofk-lab-row">
          <ColorPicker value={color} onChange={setColor} presets={presets} />
          <code className="ofk-mono">{color}</code>
        </div>
      </section>
      <section>
        <h2>Layers: menu, dialog, sheet, tabs</h2>
        <div className="ofk-lab-row">
          <Button ref={menuRef} onClick={() => setMenu(true)} aria-haspopup="menu">Open menu</Button>
          <Menu open={menu} anchorRef={menuRef} onClose={() => setMenu(false)} label="Example">
            <MenuGroup label="Arrange">
              <MenuItem onSelect={() => {}} shortcut={['⌘', ']']}>Bring forward</MenuItem>
              <MenuItem onSelect={() => {}} shortcut={['⌘', '[']}>Send backward</MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem onSelect={() => {}} checked keepOpen>Snap to grid</MenuItem>
            <MenuItem onSelect={() => {}} disabled>Ungroup</MenuItem>
            <MenuItem onSelect={() => {}} danger shortcut="⌫">Delete</MenuItem>
          </Menu>
          <Button onClick={() => setDialog(true)}>Open dialog</Button>
          <Button onClick={() => setSheet(true)}>Open sheet</Button>
          <Dialog open={dialog} onClose={() => setDialog(false)} title="Delete page?" description="Page 2 and its 12 objects will be removed. You can undo this." actions={<><Button variant="quiet" onClick={() => setDialog(false)}>Cancel</Button><Button variant="danger" onClick={() => setDialog(false)}>Delete</Button></>} />
          <Dialog open={sheet} variant="sheet" onClose={() => setSheet(false)} title="Export" description="Sheet variant; dialogs also become sheets under 720px.">
            <Segmented label="Format" value="svg" onChange={() => {}} options={[{ value: 'svg', label: 'SVG' }, { value: 'png', label: 'PNG' }, { value: 'json', label: 'JSON' }]} />
          </Dialog>
        </div>
        <Tabs<'one' | 'two'> label="Example tabs" value={tab} onChange={setTab} tabs={[{ value: 'one', label: 'Properties', panel: <p>Panel one.</p> }, { value: 'two', label: 'Source', panel: <p>Panel two.</p> }]} />
      </section>
      <section>
        <h2>Status, kbd, provenance, empty state</h2>
        <div className="ofk-lab-row">
          {(['neutral', 'info', 'success', 'warning', 'danger'] as const).map((t) => (
            <Status key={t} tone={t}>{t}</Status>
          ))}
          <Kbd keys={['⌘', 'K']} />
          <span>Redis cache <ProvenanceBadge /></span>
          <AgentBadge name="Claude" state="working" detail="drafting" />
          <AgentBadge name="Codex" state="disconnected" />
        </div>
        <div className="ofk-lab-row">
          <EmptyState icon={<Icon icon={IconStack2} />} title="No layers yet" description="Draw a shape or ask the agent." action={<Button variant="primary">Ask agent</Button>} />
        </div>
      </section>
      <section>
        <h2>Toasts: auto-dismiss vs persistent</h2>
        <div className="ofk-lab-stack">
          <div className="ofk-lab-row">
            <Button
              onClick={() =>
                setNotices((t) => [
                  ...t,
                  { id: `lab-${t.length}`, tone: 'success', title: 'Saved locally', description: 'Auto-dismisses; errors persist.' },
                ])
              }
            >
              Show transient toast
            </Button>
            <code className="ofk-mono">danger/warning persist · info/success auto-dismiss in 5s</code>
          </div>
          <ToastRegion items={notices} onDismiss={(id) => setNotices((t) => t.filter((x) => x.id !== id))} />
        </div>
      </section>
      <section>
        <h2>Loading, thinking, progress</h2>
        <div className="ofk-lab-row">
          <Spinner label="Saving" size="sm" />
          <Spinner label="Exporting" />
          <Spinner label="Rendering" size="lg" />
          <Thinking label="Thinking" detail="checking 3 objects" />
        </div>
        <div className="ofk-lab-row">
          <Progress label="Export" value={68} />
          <Progress label="Resolving import" />
        </div>
        <div className="ofk-lab-stack">
          <div className="ofk-message" data-role="agent">
            <SkeletonLines rows={3} />
          </div>
          <div className="ofk-lab-row">
            <Skeleton width={120} height={72} radius={8} />
            <Skeleton width={120} height={72} radius={8} />
            <Skeleton width={120} height={72} radius={8} />
          </div>
          <ErrorState title="Export failed" description="Your work is safe. The file was not written." onRetry={() => {}} />
        </div>
      </section>
      <section>
        <h2>AI: proposal bar, per-object review, composer, permission</h2>
        <div className="ofk-lab-stack">
          {(
            [
              { phase: 'working', scopeLabel: 'Scope: selection · 2 objects' },
              { phase: 'ready', id: 'b', baseRevision: 1, currentRevision: 2, scopeLabel: 'Scope: this page', summary: '+2 nodes (stale)' },
              { phase: 'failed', message: 'Provider timed out. Nothing changed.' },
            ] as ProposalView[]
          ).map((view, i) => (
            <ProposalBar key={i} view={view} labels={proposalLabels} onAccept={async () => {}} onDismiss={() => {}} onUndo={() => {}} />
          ))}
          <ProposalReview id="x" baseRevision={1} currentRevision={1} scopeLabel="Scope: this page" changes={changes} decisions={{ c1: 'accepted', c3: 'rejected' }} onDecide={() => {}} onApply={async () => {}} onDiscard={() => {}} />
          <Composer busy={false} scope="page" onScopeChange={() => {}} onSubmit={() => {}} onCancel={() => {}} mentions={[{ id: 'a', label: 'API Gateway' }]} onAddMention={() => {}} onRemoveMention={() => {}} provider={<Button variant="quiet">Claude Opus 5 <Icon icon={IconChevronDown} /></Button>} />
          <PermissionPrompt agent="Claude" request="Write access to Page 2 for this task." onAllowOnce={() => {}} onAllowSession={() => {}} onDeny={() => {}} />
        </div>
      </section>
      <section>
        <h2>Canvas feedback</h2>
        <div className="ofk-lab-canvas ofk-lab-canvas--strip">
          <CanvasFeedbackOverlay items={overlayItems} appearance={appearance} />
          {overlayItems.map((i) => (
            <span key={i.id} className="ofk-lab-caption" style={{ left: i.x, top: i.y + i.height + 8 }}>{i.kind}</span>
          ))}
        </div>
      </section>
      <section>
        <h2>Motion: spring release, enter/exit curves</h2>
        <SpringDemo />
        <div className="ofk-lab-row">
          {Object.entries(foundation.curve).map(([k, v]) => (
            <code key={k} className="ofk-mono">curve.{k} {v}</code>
          ))}
          {Object.entries(foundation.motion).map(([k, v]) => (
            <code key={k}>motion.{k} {v}ms</code>
          ))}
        </div>
      </section>
      <section>
        <h2>Materials · {appearance}</h2>
        <div className="ofk-lab-row ofk-lab-materials">
          <div className="ofk-raised">raised</div>
          <div className="ofk-floating">floating (glass)</div>
          <div className="ofk-overlay">overlay</div>
        </div>
        <div className="ofk-lab-row">
          {Object.entries(materials[appearance]).map(([k, v]) => (
            <code key={k} className="ofk-mono">{k}: {v}</code>
          ))}
        </div>
      </section>
      <section>
        <h2>Color roles · {appearance}</h2>
        <div className="ofk-lab-swatches">
          {(Object.keys(themes[appearance]) as ColorRole[]).map((role) => (
            <div key={role} className="ofk-lab-swatch">
              <span style={{ background: `var(--ofk-${role})` }} />
              <code>{role}</code>
              <code>{themes[appearance][role]}</code>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Scales</h2>
        <div className="ofk-lab-row">
          {Object.entries(foundation.space).map(([k, v]) => (
            <div key={k} className="ofk-lab-scale"><span style={{ width: v, height: v }} /><code>space.{k} {v}</code></div>
          ))}
        </div>
        <div className="ofk-lab-row">
          {Object.entries(foundation.type).map(([k, v]) => (
            <span key={k} style={{ fontSize: v }}>type.{k} {v}px</span>
          ))}
        </div>
      </section>
    </div>
  );
}

export function V2LabPage(): React.JSX.Element {
  const { resolvedTheme, setTheme } = useTheme();
  const [density, setDensity] = useState<Density>('comfortable');
  const [tab, setTab] = useState<Tab>('shell');
  return (
    <SystemRoot appearance={resolvedTheme} density={density} className="ofk-lab">
      <div className="ofk-lab-bar">
        <strong>V2 design lab</strong>
        <Segmented<Tab> label="Lab view" value={tab} onChange={setTab} options={[{ value: 'shell', label: 'Shell' }, { value: 'primitives', label: 'Primitives' }]} />
        <Segmented<AppTheme> label="Appearance" value={resolvedTheme} onChange={(v) => setTheme(v)} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        <Segmented<Density> label="Density" value={density} onChange={setDensity} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
      </div>
      {tab === 'shell' ? <ShellMock appearance={resolvedTheme} /> : <Primitives appearance={resolvedTheme} />}
    </SystemRoot>
  );
}
