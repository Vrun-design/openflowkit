import { IconPlayerPlay, IconTransform } from '@tabler/icons-react';
import { useMemo, useRef, useState } from 'react';
import type { DslDiagnostic } from '../../../dsl/ast';
import { DSL_FAMILIES } from '../../../dsl/ast';
import { tokenize } from '../../../dsl/tokenize';
import { COLOR_WORDS, EDGE_FLAG_WORDS, FILL_WORDS, SHAPE_WORDS } from '../../../dsl/vocabulary';
import { DIAGRAM_PALETTES, type DiagramPaletteName } from '../../domain/nodes/nodePalette';
import { Button, Icon, Panel, Segmented } from '../design-system';

export function V2CodePanel({
  code, diagnostics, generating, canvasEdited, palette, onPaletteChange, onCodeChange, onGenerate, onClose, onConvertMermaid,
}: {
  code: string;
  diagnostics: readonly DslDiagnostic[];
  generating: boolean;
  canvasEdited: boolean;
  /** Palette applied when the code compiles; the DSL's own `appearance:` wins. */
  palette: DiagramPaletteName;
  onPaletteChange: (palette: DiagramPaletteName) => void;
  onCodeChange: (code: string) => void;
  onGenerate: () => void;
  onClose: () => void;
  /** Present when the draft looks like Mermaid; converts it to DSL in place. */
  onConvertMermaid?: (() => void) | undefined;
}) {
  // ponytail: an empty editor shows the placeholder, not "document is empty".
  const errors = code.trim() ? diagnostics.filter((item) => item.severity !== 'info') : [];
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [suggestions, setSuggestions] = useState<readonly string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const names = useMemo(() => Array.from(new Set(code.split('\n').map((line) => line.split(/\s*(?:-->|->|<->|=|\[)/)[0]?.trim()).filter((name): name is string => !!name && !name.startsWith('//')))), [code]);
  const highlighted = useMemo(() => {
    const byLine = new Map<number, ReturnType<typeof tokenize>['tokens']>();
    for (const token of tokenize(code).tokens) byLine.set(token.line, [...(byLine.get(token.line) ?? []), token]);
    return code.split('\n').map((line, lineIndex) => {
      const parts: React.ReactNode[] = [];
      let cursor = 0;
      for (const token of byLine.get(lineIndex + 1) ?? []) {
        const start = token.col - 1;
        if (start > cursor) parts.push(line.slice(cursor, start));
        const raw = line.slice(start, token.endCol - 1);
        parts.push(<span key={`${start}:${token.endCol}`} data-token={token.kind}>{raw}</span>);
        cursor = token.endCol - 1;
      }
      parts.push(line.slice(cursor), '\n');
      return <span key={lineIndex}>{parts}</span>;
    });
  }, [code]);
  const openSuggestions = (kind: 'attrs' | 'all') => {
    const attrs = [
      ...Object.keys(SHAPE_WORDS), ...Object.keys(COLOR_WORDS),
      ...FILL_WORDS, ...EDGE_FLAG_WORDS, 'shadow',
      'label:', 'tech:', 'icon:', 'from:', 'to:', 'head:', 'pin:', 'rank:', 'width:', 'height:',
    ];
    setSuggestions(kind === 'attrs' ? attrs : [...DSL_FAMILIES, ...names]);
    setSuggestionIndex(0);
  };
  const chooseSuggestion = (value: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    onCodeChange(`${code.slice(0, start)}${value}${code.slice(editor.selectionEnd)}`);
    setSuggestions([]);
    requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(start + value.length, start + value.length); });
  };
  return (
    <Panel title="Diagram as code" onClose={onClose} className="ofk-v2-workspace-panel ofk-v2-code-panel">
      <div className="ofk-v2-panel-stack">
        {canvasEdited ? <p className="ofk-v2-code-warning" role="status">Canvas edited — regenerate will overwrite those changes.</p> : null}
        {onConvertMermaid ? (
          <div className="ofk-v2-code-mermaid" role="status">
            <Icon icon={IconTransform} />
            <span>Mermaid detected.</span>
            <Button onClick={onConvertMermaid}>Convert <kbd>⌘⇧M</kbd></Button>
          </div>
        ) : null}
        <div className="ofk-v2-code-editor-wrap">
          <pre ref={highlightRef} className="ofk-v2-code-highlight" aria-hidden="true">{highlighted}</pre>
          <textarea
            ref={editorRef} id="v2-code" className="ofk-v2-code-editor" spellCheck={false} value={code} aria-label="Diagram source"
            placeholder={'flowchart\nStart -> Build -> Ship\nBuild [diamond]'}
            aria-describedby={errors.length ? 'v2-code-diagnostics' : undefined}
            aria-invalid={errors.some((item) => item.severity === 'error') || undefined}
            aria-autocomplete="list" aria-controls={suggestions.length ? 'v2-code-suggestions' : undefined}
            onScroll={(event) => { if (highlightRef.current) { highlightRef.current.scrollTop = event.currentTarget.scrollTop; highlightRef.current.scrollLeft = event.currentTarget.scrollLeft; } }}
            onChange={(event) => { onCodeChange(event.target.value); if (event.target.value[event.target.selectionStart - 1] === '[') openSuggestions('attrs'); }}
            onKeyDown={(event) => {
            if (suggestions.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setSuggestionIndex((current) => (current + (event.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length); return; }
            if (suggestions.length && (event.key === 'Enter' || event.key === 'Tab')) { event.preventDefault(); chooseSuggestion(suggestions[suggestionIndex]!); return; }
            if (suggestions.length && event.key === 'Escape') { event.preventDefault(); setSuggestions([]); return; }
            if (event.ctrlKey && event.key === ' ') { event.preventDefault(); openSuggestions('all'); return; }
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'm' && onConvertMermaid) { event.preventDefault(); onConvertMermaid(); return; }
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); onGenerate(); }
            if (event.key === 'Tab') {
              event.preventDefault();
              const target = event.currentTarget;
              const start = target.selectionStart;
              onCodeChange(`${code.slice(0, start)}  ${code.slice(target.selectionEnd)}`);
              requestAnimationFrame(() => target.setSelectionRange(start + 2, start + 2));
            }
            }}
          />
          {suggestions.length ? <div id="v2-code-suggestions" role="listbox" className="ofk-v2-code-suggestions">
            {suggestions.slice(0, 12).map((suggestion, index) => <button type="button" role="option" aria-selected={index === suggestionIndex} key={suggestion} onPointerDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(suggestion)}>{suggestion}</button>)}
          </div> : null}
        </div>
        <div id="v2-code-diagnostics" className="ofk-v2-code-diagnostics" aria-live="polite" hidden={errors.length === 0}>
          {errors.slice(0, 8).map((item, index) => (
            <button type="button" key={`${item.line}:${item.col}:${item.code}:${index}`} data-tone={item.severity} onClick={() => {
              const editor = editorRef.current;
              if (!editor) return;
              const offset = code.split('\n').slice(0, item.line - 1).reduce((sum, line) => sum + line.length + 1, 0) + item.col - 1;
              editor.focus(); editor.setSelectionRange(offset, offset + Math.max(1, item.endCol - item.col));
            }}><span>{item.code}</span><strong>Line {item.line}</strong>{item.message}</button>
          ))}
        </div>
        <footer className="ofk-v2-panel-footer ofk-v2-code-footer">
          <Segmented<DiagramPaletteName> label="Diagram palette" value={palette}
            onChange={onPaletteChange}
            options={DIAGRAM_PALETTES.map(({ id, label, hint }) => ({ value: id, label, title: hint }))} />
          <Button onClick={onGenerate} busy={generating} disabled={generating}>
            <Icon icon={IconPlayerPlay} /> {generating ? 'Generating…' : 'Generate diagram'} <kbd>⌘↵</kbd>
          </Button>
          {errors.length ? <p>Bad lines are skipped; the rest still renders.</p> : null}
        </footer>
      </div>
    </Panel>
  );
}
