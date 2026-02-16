
export interface ThemeColors {
    bg: string;
    fill: string; // for SVG
    border: string;
    stroke: string; // for SVG
    iconBg: string;
    iconColor: string;
    handle: string;
    ring: string;
    text: string;
    subText: string;
    shadow: string; // for export
}

// Maps color names to Tailwind classes (for UI) AND hex values (for export)
// This serves as the Single Source of Truth for node styling.

export const NODE_COLOR_PALETTE: Record<string, ThemeColors> = {
    slate: {
        bg: 'bg-white',
        fill: 'fill-white',
        border: 'border-slate-300',
        stroke: 'stroke-slate-300',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-600',
        handle: 'bg-slate-400',
        ring: 'ring-slate-400',
        // Export values (hex) - must match tailwind classes above
        text: '#1e293b',
        subText: '#475569',
        shadow: 'rgba(0,0,0,0.08)',
    },
    blue: {
        bg: 'bg-white',
        fill: 'fill-white',
        border: 'border-blue-300',
        stroke: 'stroke-blue-300',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        handle: 'bg-blue-500',
        ring: 'ring-blue-400',
        text: '#1e293b',
        subText: '#475569',
        shadow: 'rgba(37,99,235,0.08)',
    },
    emerald: {
        bg: 'bg-white',
        fill: 'fill-white',
        border: 'border-emerald-300',
        stroke: 'stroke-emerald-300',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        handle: 'bg-emerald-500',
        ring: 'ring-emerald-400',
        text: '#064e3b',
        subText: '#065f46',
        shadow: 'rgba(5,150,105,0.08)',
    },
    red: {
        bg: 'bg-white',
        fill: 'fill-white',
        border: 'border-red-300',
        stroke: 'stroke-red-300',
        iconBg: 'bg-red-50',
        iconColor: 'text-red-600',
        handle: 'bg-red-500',
        ring: 'ring-red-400',
        text: '#7f1d1d',
        subText: '#991b1b',
        shadow: 'rgba(220,38,38,0.08)',
    },
    amber: {
        bg: 'bg-white',
        fill: 'fill-white',
        border: 'border-amber-300',
        stroke: 'stroke-amber-300',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
        handle: 'bg-amber-500',
        ring: 'ring-amber-400',
        text: '#78350f',
        subText: '#92400e',
        shadow: 'rgba(217,119,6,0.08)',
    },
    violet: {
        bg: 'bg-white',
        fill: 'fill-white',
        border: 'border-violet-300',
        stroke: 'stroke-violet-300',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        handle: 'bg-violet-500',
        ring: 'ring-violet-400',
        text: '#5b21b6',
        subText: '#6d28d9',
        shadow: 'rgba(124,58,237,0.08)',
    },
    pink: {
        bg: 'bg-white',
        fill: 'fill-white',
        border: 'border-pink-300',
        stroke: 'stroke-pink-300',
        iconBg: 'bg-pink-50',
        iconColor: 'text-pink-600',
        handle: 'bg-pink-500',
        ring: 'ring-pink-400',
        text: '#831843',
        subText: '#9d174d',
        shadow: 'rgba(219,39,119,0.08)',
    },
    yellow: {
        bg: 'bg-yellow-100', // Keep yellow background for sticky notes
        fill: 'fill-yellow-100',
        border: 'border-yellow-300',
        stroke: 'stroke-yellow-300',
        iconBg: 'bg-yellow-200',
        iconColor: 'text-yellow-700',
        handle: 'bg-yellow-500',
        ring: 'ring-yellow-400',
        text: '#a16207',
        subText: '#b45309',
        shadow: 'rgba(250,204,21,0.08)',
    },
    cyan: {
        bg: 'bg-white',
        fill: 'fill-white',
        border: 'border-cyan-300',
        stroke: 'stroke-cyan-300',
        iconBg: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        handle: 'bg-cyan-500',
        ring: 'ring-cyan-400',
        text: '#0e7490',
        subText: '#155e75',
        shadow: 'rgba(6,182,212,0.08)',
    },
};

// Hex values for Export Service (Figma/SVG)
// We map the Tailwind classes to hex values for tools that can't use CSS classes
export const NODE_EXPORT_COLORS: Record<string, any> = {
    slate: { bg: '#ffffff', border: '#cbd5e1', iconBg: '#f1f5f9', iconColor: '#475569' },
    blue: { bg: '#eff6ff', border: '#93c5fd', iconBg: '#dbeafe', iconColor: '#2563eb' },
    emerald: { bg: '#ecfdf5', border: '#6ee7b7', iconBg: '#d1fae5', iconColor: '#059669' },
    red: { bg: '#fef2f2', border: '#fca5a5', iconBg: '#fee2e2', iconColor: '#dc2626' },
    amber: { bg: '#fffbeb', border: '#fcd34d', iconBg: '#fef3c7', iconColor: '#d97706' },
    violet: { bg: '#f5f3ff', border: '#c4b5fd', iconBg: '#ede9fe', iconColor: '#7c3aed' },
    pink: { bg: '#fdf2f8', border: '#f9a8d4', iconBg: '#fce7f3', iconColor: '#db2777' },
    yellow: { bg: '#fef9c3', border: '#fde047', iconBg: '#fef08a', iconColor: '#a16207' },
};

export interface SectionColors {
    bg: string;
    border: string;
    title: string;
    badge: string; // Tailwind class
    badgeBgHex?: string; // For export
    badgeTextHex?: string; // For export
}

export const SECTION_COLOR_PALETTE: Record<string, SectionColors> = {
    slate: {
        bg: 'rgba(241,245,249,0.35)',
        border: '#94a3b8',
        title: '#334155',
        badge: 'bg-slate-200 text-slate-700',
        badgeBgHex: '#e2e8f0',
        badgeTextHex: '#334155',
    },
    blue: {
        bg: 'rgba(219,234,254,0.35)',
        border: '#60a5fa',
        title: '#1e40af',
        badge: 'bg-blue-200 text-blue-700',
        badgeBgHex: '#bfdbfe',
        badgeTextHex: '#1e40af',
    },
    emerald: {
        bg: 'rgba(209,250,229,0.35)',
        border: '#34d399',
        title: '#065f46',
        badge: 'bg-emerald-200 text-emerald-700',
        badgeBgHex: '#a7f3d0',
        badgeTextHex: '#065f46',
    },
    amber: {
        bg: 'rgba(254,243,199,0.35)',
        border: '#fbbf24',
        title: '#92400e',
        badge: 'bg-amber-200 text-amber-700',
        badgeBgHex: '#fde68a',
        badgeTextHex: '#92400e',
    },
    violet: {
        bg: 'rgba(237,233,254,0.35)',
        border: '#8b5cf6',
        title: '#5b21b6',
        badge: 'bg-violet-200 text-violet-700',
        badgeBgHex: '#c4b5fd',
        badgeTextHex: '#5b21b6',
    },
    red: {
        bg: 'rgba(254,226,226,0.35)',
        border: '#f87171',
        title: '#991b1b',
        badge: 'bg-red-200 text-red-700',
        badgeBgHex: '#fecaca',
        badgeTextHex: '#991b1b',
    },
    pink: {
        bg: 'rgba(252,231,243,0.35)',
        border: '#f472b6',
        title: '#9d174d',
        badge: 'bg-pink-200 text-pink-700',
        badgeBgHex: '#fbcfe8',
        badgeTextHex: '#9d174d',
    },
};

export const NODE_DEFAULTS: Record<string, { color: string; icon: string; shape: string }> = {
    start: { color: 'emerald', icon: 'none', shape: 'capsule' },
    end: { color: 'red', icon: 'none', shape: 'capsule' },
    decision: { color: 'amber', icon: 'none', shape: 'diamond' },
    custom: { color: 'violet', icon: 'none', shape: 'rounded' },
    process: { color: 'slate', icon: 'none', shape: 'rounded' },
};

export const getDefaultColor = (type: string): string =>
    NODE_DEFAULTS[type]?.color || 'slate';
