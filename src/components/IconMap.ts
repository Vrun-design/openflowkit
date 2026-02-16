import * as AllIcons from 'lucide-react';
import React from 'react';

// Filter out non-component exports from Lucide
export const ICON_MAP = Object.entries(AllIcons).reduce((acc, [key, component]) => {
    // Lucide icons are PascalCase. We filter out createLucideIcon and default.
    // We also check if the key starts with an uppercase letter to catch components.
    if (key !== 'createLucideIcon' && key !== 'default' && /^[A-Z]/.test(key)) {
        acc[key] = component as React.ElementType;
    }
    return acc;
}, {} as Record<string, React.ElementType>);
