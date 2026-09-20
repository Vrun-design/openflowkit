import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { clamp01, hexToHsva, hsvaToHex, type Hsva } from './color';
export interface ColorPickerProps {
  /** Hex (#rrggbb or #rrggbbaa). `null` = mixed selection. */
  value: string | null;
  onChange: (hex: string) => void;
  /** Host supplies document/brand presets; the system never invents palette literals. */
  presets?: readonly string[];
  allowAlpha?: boolean;
  /** Emits once per gesture end so the host commits one history entry per drag. */
  onCommit?: (hex: string) => void;
  labels?: Partial<
    Record<'saturation' | 'hue' | 'alpha' | 'hex' | 'opacity' | 'presets' | 'transparent', string>
  >;
}
const defaults = {
  saturation: 'Saturation and brightness',
  hue: 'Hue',
  alpha: 'Opacity',
  hex: 'Hex',
  opacity: 'Opacity',
  presets: 'Presets',
  transparent: 'Transparent',
};
/** HSV picker: pad + hue + alpha sliders, presets, hex and opacity fields. Pointer drags are immediate; keyboard steps the sliders. */
export function ColorPicker({
  value,
  onChange,
  presets = [],
  allowAlpha = true,
  onCommit,
  labels,
}: ColorPickerProps) {
  const t = { ...defaults, ...labels };
  const id = useId();
  const [hsva, setHsva] = useState<Hsva>(
    () => hexToHsva(value ?? '#000000') ?? { h: 0, s: 0, v: 0, a: 1 }
  );
  const [hexText, setHexText] = useState(value ? value.slice(0, 7) : '');
  const pad = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parsed = value ? hexToHsva(value) : null;
    if (parsed && hsvaToHex(parsed) !== hsvaToHex(hsva)) setHsva(parsed);
    setHexText(value ? value.slice(0, 7) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  function update(next: Partial<Hsva>) {
    const merged = { ...hsva, ...next };
    setHsva(merged);
    setHexText(hsvaToHex(merged, false));
    onChange(hsvaToHex(merged, allowAlpha));
  }
  function padPointer(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = pad.current!.getBoundingClientRect();
    update({
      s: clamp01((e.clientX - rect.left) / rect.width),
      v: 1 - clamp01((e.clientY - rect.top) / rect.height),
    });
  }
  const solid = hsvaToHex({ ...hsva, a: 1 }, false);
  const hueOnly = hsvaToHex({ h: hsva.h, s: 1, v: 1, a: 1 }, false);
  return (
    <div
      className="ofk-color"
      style={{ '--ofk-color-hue': hueOnly, '--ofk-color-solid': solid } as React.CSSProperties}
    >
      <div
        ref={pad}
        className="ofk-color-pad"
        role="slider"
        tabIndex={0}
        aria-label={t.saturation}
        aria-valuetext={`${Math.round(hsva.s * 100)}% ${Math.round(hsva.v * 100)}%`}
        aria-valuenow={Math.round(hsva.v * 100)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          padPointer(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && padPointer(e)}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          onCommit?.(hsvaToHex(hsva, allowAlpha));
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.01;
          const map: Record<string, Partial<Hsva>> = {
            ArrowLeft: { s: clamp01(hsva.s - step) },
            ArrowRight: { s: clamp01(hsva.s + step) },
            ArrowUp: { v: clamp01(hsva.v + step) },
            ArrowDown: { v: clamp01(hsva.v - step) },
          };
          if (map[e.key]) {
            e.preventDefault();
            update(map[e.key]);
            onCommit?.(hsvaToHex({ ...hsva, ...map[e.key] }, allowAlpha));
          }
        }}
      >
        <span
          className="ofk-color-thumb"
          style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%` }}
        />
      </div>
      <label className="ofk-color-slider ofk-color-hue">
        <span className="ofk-visually-hidden">{t.hue}</span>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={Math.round(hsva.h)}
          onChange={(e) => update({ h: Number(e.target.value) })}
          onPointerUp={() => onCommit?.(hsvaToHex(hsva, allowAlpha))}
        />
      </label>
      {allowAlpha && (
        <label className="ofk-color-slider ofk-color-alpha">
          <span className="ofk-visually-hidden">{t.alpha}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(hsva.a * 100)}
            onChange={(e) => update({ a: Number(e.target.value) / 100 })}
            onPointerUp={() => onCommit?.(hsvaToHex(hsva, allowAlpha))}
          />
        </label>
      )}
      {presets.length > 0 && (
        <div className="ofk-color-presets" role="group" aria-label={t.presets}>
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              aria-label={p === 'transparent' ? t.transparent : p}
              aria-pressed={value?.toLowerCase() === p.toLowerCase()}
              data-transparent={p === 'transparent' || undefined}
              style={p === 'transparent' ? undefined : { background: p }}
              onClick={() => {
                if (p === 'transparent') {
                  update({ a: 0 });
                  onCommit?.(hsvaToHex({ ...hsva, a: 0 }, true));
                } else {
                  const parsed = hexToHsva(p);
                  if (parsed) {
                    setHsva(parsed);
                    setHexText(p.slice(0, 7));
                    onChange(p);
                    onCommit?.(p);
                  }
                }
              }}
            />
          ))}
        </div>
      )}
      <div className="ofk-color-fields">
        <label className="ofk-color-hex">
          <span className="ofk-visually-hidden">{t.hex}</span>
          <span aria-hidden="true">#</span>
          <input
            id={`${id}-hex`}
            className="ofk-mono"
            value={hexText.replace(/^#/, '')}
            spellCheck={false}
            onChange={(e) => setHexText(e.target.value)}
            onBlur={() => {
              const parsed = hexToHsva(hexText);
              if (parsed) {
                const next = { ...parsed, a: allowAlpha ? hsva.a : 1 };
                setHsva(next);
                onChange(hsvaToHex(next, allowAlpha));
                onCommit?.(hsvaToHex(next, allowAlpha));
              } else setHexText(solid.slice(1));
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </label>
        {allowAlpha && (
          <label className="ofk-color-opacity">
            <span className="ofk-visually-hidden">{t.opacity}</span>
            <input
              className="ofk-numeric"
              inputMode="numeric"
              value={Math.round(hsva.a * 100)}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(n)) update({ a: clamp01(n / 100) });
              }}
              onBlur={() => onCommit?.(hsvaToHex(hsva, allowAlpha))}
            />
            <span aria-hidden="true">%</span>
          </label>
        )}
      </div>
    </div>
  );
}
