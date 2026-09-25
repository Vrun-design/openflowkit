// The keyboard map as data: rendered by the `?` panel and checked against the
// dispatcher by v2Shortcuts.test.ts, so a new shortcut cannot ship undocumented.
// `tokens` are the raw event.key / event.code literals the handler reads.
export interface ShortcutRow {
  readonly label: string;
  /** Display form, already platform-aware via COMMAND. */
  readonly keys: string;
  readonly tokens: readonly string[];
}

export interface ShortcutGroup {
  readonly title: string;
  readonly rows: readonly ShortcutRow[];
}

export const isApplePlatform = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** `⌘` on Apple platforms, `Ctrl` everywhere else. */
export const COMMAND = (): string => (isApplePlatform() ? '⌘' : 'Ctrl');

export function shortcutGroups(command = COMMAND()): readonly ShortcutGroup[] {
  const meta = command === '⌘' ? 'meta' : 'ctrl';
  return [
    {
      title: 'Tools',
      rows: [
        { label: 'Select', keys: 'V', tokens: ['v'] },
        { label: 'Hand', keys: 'H', tokens: ['h'] },
        { label: 'Rectangle', keys: 'R', tokens: ['r'] },
        { label: 'Ellipse', keys: 'O', tokens: ['o'] },
        { label: 'Shapes', keys: 'S', tokens: ['s'] },
        { label: 'Connector', keys: 'A', tokens: ['a'] },
        { label: 'Text', keys: 'T', tokens: ['t'] },
        { label: 'Pen', keys: 'P', tokens: ['p'] },
        { label: 'Highlighter', keys: 'Shift + P', tokens: ['KeyP'] },
        { label: 'Eraser', keys: 'X', tokens: ['x'] },
        { label: 'Lasso', keys: 'Q', tokens: ['q'] },
        { label: 'Laser pointer', keys: 'K', tokens: ['k'] },
        { label: 'Frame', keys: 'F', tokens: ['f'] },
        { label: 'Sticky note', keys: 'N', tokens: ['n'] },
        { label: 'More: frames, tools, wireframe', keys: 'Shift + S', tokens: ['KeyS'] },
        { label: 'Icons and emoji', keys: 'I / E', tokens: ['i', 'e'] },
        { label: 'Image', keys: 'Shift + I', tokens: ['KeyI'] },
      ],
    },
    {
      title: 'Canvas',
      rows: [
        { label: 'Pan', keys: 'Space + drag', tokens: [' '] },
        { label: 'Zoom to fit', keys: `${command} + 0`, tokens: ['0', meta] },
        { label: 'Zoom to selection', keys: 'Shift + 2', tokens: ['Digit2'] },
        { label: 'Zoom to fit (Shift)', keys: 'Shift + 1', tokens: ['Digit1'] },
        { label: 'Zoom to 100%', keys: `${command} + 1`, tokens: ['1', meta] },
        { label: 'Zoom in / out', keys: `${command} + = / −`, tokens: ['=', '+', '-'] },
        { label: 'Layers', keys: 'L', tokens: ['l'] },
        // The dispatcher reads metaKey/ctrlKey for this, never altKey: Alt is
        // taken by resize-from-centre.
        { label: 'Snap bypass while dragging', keys: command, tokens: [] },
        { label: 'Resize from the centre', keys: 'Alt + drag a handle', tokens: [] },
      ],
    },
    {
      title: 'Edit',
      rows: [
        { label: 'Undo / redo', keys: `${command} + Z / Shift + Z`, tokens: ['z', 'y'] },
        { label: 'Copy / cut / paste', keys: `${command} + C / X / V`, tokens: ['c', 'x', 'KeyC'] },
        { label: 'Copy / paste style', keys: `${command} + Alt + C / V`, tokens: [] },
        { label: 'Duplicate', keys: `${command} + D`, tokens: ['d'] },
        { label: 'Delete / unplace', keys: 'Backspace', tokens: ['Delete', 'Backspace'] },
        { label: 'Remove from model', keys: `${command} + Shift + Backspace`, tokens: [] },
        { label: 'Nudge (10 px with Shift)', keys: 'Arrows', tokens: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] },
        { label: 'Edit label', keys: 'Enter / F2', tokens: ['Enter', 'F2'] },
        { label: 'Select all', keys: `${command} + A`, tokens: [] },
        { label: 'Lock / unlock', keys: `${command} + L`, tokens: [] },
        { label: 'Bold / italic / underline', keys: `${command} + B / I / U`, tokens: ['b', 'i', 'u'] },
        { label: 'Bring forward / send backward', keys: `${command} + ] / [`, tokens: ['BracketRight', 'BracketLeft'] },
        { label: 'Bring to front / send to back', keys: '] / [', tokens: [']', '['] },
        { label: 'Bring to front / back (group)', keys: `${command} + Alt + ] / [`, tokens: [] },
      ],
    },
    {
      title: 'Arrange',
      rows: [
        { label: 'Group / ungroup', keys: `${command} + G / Shift + G`, tokens: ['g', 'KeyG'] },
        { label: 'Align left/right/top/bottom', keys: 'Alt + A / D / W / S', tokens: ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'alt'] },
        { label: 'Align centre', keys: 'Alt + H / V', tokens: ['KeyH', 'KeyV'] },
        { label: 'Distribute', keys: 'Alt + Shift + H / V', tokens: [] },
        { label: 'Flip horizontal / vertical', keys: 'Shift + H / V', tokens: [] },
      ],
    },
    {
      title: 'Architecture',
      rows: [
        { label: 'Open element view', keys: 'Enter', tokens: [] },
        { label: 'Step through a flow', keys: '← / → / Space', tokens: [] },
      ],
    },
    {
      title: 'Panels',
      rows: [
        { label: 'Architecture model', keys: 'Alt + M', tokens: ['KeyM'] },
        { label: 'Diagram as code', keys: 'Alt + D', tokens: ['KeyD'] },
        { label: 'AI assistant', keys: `${command} + J`, tokens: ['j'] },
        { label: 'This cheatsheet', keys: '?', tokens: ['?'] },
        { label: 'Dismiss panel', keys: 'Esc', tokens: ['Escape'] },
      ],
    },
  ];
}
