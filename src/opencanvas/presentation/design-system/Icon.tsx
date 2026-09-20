import type { ComponentType } from 'react';
import type { IconProps as TablerIconProps } from '@tabler/icons-react';
import { foundation } from './tokens';
export type IconComponent = ComponentType<TablerIconProps>;
/** V2 chrome uses Tabler icons only; lucide belongs to the legacy shell. Decorative by default: pair with a text or aria label. */
export function Icon({ icon: Glyph, label }: { icon: IconComponent; label?: string }) {
  return (
    <Glyph
      size={foundation.control.icon}
      stroke={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
    />
  );
}
