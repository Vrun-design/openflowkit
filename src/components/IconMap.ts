import React from 'react';
import * as AllIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const FALLBACK_ICON_NAME = 'Settings';

export const ICON_MAP = Object.entries(AllIcons).reduce((acc, [key, component]) => {
    if (key !== 'Icon' && key !== 'createLucideIcon' && key !== 'default' && /^[A-Z]/.test(key)) {
        acc[key] = component as React.ElementType;
    }
    return acc;
}, {} as Record<string, React.ElementType>);

export const ICON_NAMES: string[] = Object.keys(ICON_MAP);

export function resolveIconName(iconName?: string, fallback: string = FALLBACK_ICON_NAME): string {
    if (!iconName) {
        return ICON_MAP[fallback] ? fallback : FALLBACK_ICON_NAME;
    }

    if (ICON_MAP[iconName]) {
        return iconName;
    }

    const lower = iconName.toLowerCase();
    const matchedKey = ICON_NAMES.find((key) => key.toLowerCase() === lower);
    if (matchedKey) {
        return matchedKey;
    }

    return ICON_MAP[fallback] ? fallback : FALLBACK_ICON_NAME;
}

type NamedIconProps = LucideProps & {
    name?: string;
    fallbackName?: string;
};

export function NamedIcon({ name, fallbackName = FALLBACK_ICON_NAME, ...props }: NamedIconProps): React.ReactElement {
    const resolvedName = resolveIconName(name, fallbackName);
    const IconComponent = ICON_MAP[resolvedName] ?? ICON_MAP[FALLBACK_ICON_NAME];
    return React.createElement(IconComponent, props);
}
