import React from 'react';
import ReactDOMServer from 'react-dom/server';

let iconMapPromise: Promise<Record<string, React.ElementType>> | null = null;

export function getIconMap(): Promise<Record<string, React.ElementType>> {
    if (!iconMapPromise) {
        iconMapPromise = import('lucide-react').then((module) => {
            const map: Record<string, React.ElementType> = {};
            for (const [key, component] of Object.entries(module)) {
                if (key !== 'createLucideIcon' && key !== 'default' && /^[A-Z]/.test(key)) {
                    map[key] = component as React.ElementType;
                }
            }
            return map;
        });
    }

    return iconMapPromise;
}

export function getIconSVGContent(
    iconName: string,
    color: string,
    iconMap: Record<string, React.ElementType>
): string {
    if (!iconName || iconName === 'none') return '';

    let iconComponent = iconMap[iconName];
    if (!iconComponent) {
        const keyLower = iconName.toLowerCase();
        const foundKey = Object.keys(iconMap).find((key) => key.toLowerCase() === keyLower);
        if (foundKey) {
            iconComponent = iconMap[foundKey];
        }
    }
    if (!iconComponent) {
        iconComponent = iconMap.Settings;
    }

    try {
        const svgString = ReactDOMServer.renderToStaticMarkup(
            React.createElement(iconComponent, { size: 20, color, strokeWidth: 2 })
        );

        return svgString
            .replace(/<svg[^>]*>/, '')
            .replace(/<\/svg>/, '');
    } catch {
        return '';
    }
}
