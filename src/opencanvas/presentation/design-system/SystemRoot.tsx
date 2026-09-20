import {
  createContext,
  useContext,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';
import { foundation, materials, themes, type Appearance } from './tokens';
import './system.css';

function tokenStyle(appearance: Appearance): CSSProperties {
  const values: Record<string, string | number> = {
    '--ofk-font': foundation.font,
    '--ofk-mono': foundation.mono,
    '--ofk-ease': foundation.easing,
    '--ofk-brand': foundation.brand,
  };
  for (const [role, color] of Object.entries(themes[appearance])) values[`--ofk-${role}`] = color;
  for (const [name, value] of Object.entries(materials[appearance]))
    values[`--ofk-material-${name}`] = value;
  for (const [name, value] of Object.entries(foundation.curve))
    values[`--ofk-curve-${name}`] = value;
  values['--ofk-material-blur'] = `${foundation.material.blur}px`;
  values['--ofk-material-saturate'] = foundation.material.saturate;
  for (const group of [
    'space',
    'radius',
    'type',
    'control',
    'motion',
    'focus',
    'layout',
  ] as const) {
    for (const [name, value] of Object.entries(foundation[group])) {
      values[`--ofk-${group}-${name}`] = `${value}${group === 'motion' ? 'ms' : 'px'}`;
    }
  }
  for (const group of ['weight', 'leading', 'layer'] as const) {
    for (const [name, value] of Object.entries(foundation[group]))
      values[`--ofk-${group}-${name}`] = value;
  }
  return values as CSSProperties;
}
const styles = { light: tokenStyle('light'), dark: tokenStyle('dark') };
/** Nearest system root element; layered surfaces portal here so tokens and appearance carry over. */
const SystemRootContext = createContext<{ element: HTMLElement | null; appearance: Appearance }>({
  element: null,
  appearance: 'light',
});
export function useSystemRoot() {
  return useContext(SystemRootContext);
}
export interface SystemRootProps extends HTMLAttributes<HTMLDivElement> {
  /** Host resolves user/system preference. This layer owns no settings persistence. */
  appearance: Appearance;
  density?: 'comfortable' | 'compact';
}
export function SystemRoot({
  appearance,
  density = 'comfortable',
  className = '',
  style,
  ...props
}: SystemRootProps) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  return (
    <SystemRootContext.Provider value={{ element, appearance }}>
      <div
        {...props}
        ref={setElement}
        className={`ofk-system ${className}`}
        data-ofk-appearance={appearance}
        data-density={density}
        style={
          {
            ...styles[appearance],
            '--ofk-control-size': `${density === 'compact' ? foundation.control.compact : foundation.control.regular}px`,
            colorScheme: appearance,
            ...style,
          } as CSSProperties
        }
      />
    </SystemRootContext.Provider>
  );
}
