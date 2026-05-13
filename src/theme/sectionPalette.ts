export interface SectionColors {
  bg: string;
  border: string;
  title: string;
  badge: string;
  badgeBgHex?: string;
  badgeTextHex?: string;
}

export const SECTION_COLOR_PALETTE: Record<string, SectionColors> = {
  slate: {
    bg: 'rgba(241,245,249,0.52)',
    border: '#cbd5e1',
    title: '#334155',
    badge: 'bg-slate-100 text-slate-600',
    badgeBgHex: '#e2e8f0',
    badgeTextHex: '#334155',
  },
  blue: {
    bg: 'rgba(219,234,254,0.48)',
    border: '#93c5fd',
    title: '#1d4ed8',
    badge: 'bg-blue-100 text-blue-700',
    badgeBgHex: '#bfdbfe',
    badgeTextHex: '#1e40af',
  },
  emerald: {
    bg: 'rgba(209,250,229,0.48)',
    border: '#6ee7b7',
    title: '#047857',
    badge: 'bg-emerald-100 text-emerald-700',
    badgeBgHex: '#a7f3d0',
    badgeTextHex: '#065f46',
  },
  amber: {
    bg: 'rgba(254,243,199,0.48)',
    border: '#fcd34d',
    title: '#b45309',
    badge: 'bg-amber-100 text-amber-700',
    badgeBgHex: '#fde68a',
    badgeTextHex: '#92400e',
  },
  violet: {
    bg: 'rgba(237,233,254,0.48)',
    border: '#a78bfa',
    title: '#6d28d9',
    badge: 'bg-violet-100 text-violet-700',
    badgeBgHex: '#c4b5fd',
    badgeTextHex: '#5b21b6',
  },
  red: {
    bg: 'rgba(254,226,226,0.48)',
    border: '#fca5a5',
    title: '#b91c1c',
    badge: 'bg-red-100 text-red-700',
    badgeBgHex: '#fecaca',
    badgeTextHex: '#991b1b',
  },
  pink: {
    bg: 'rgba(252,231,243,0.48)',
    border: '#f9a8d4',
    title: '#be185d',
    badge: 'bg-pink-100 text-pink-700',
    badgeBgHex: '#fbcfe8',
    badgeTextHex: '#9d174d',
  },
};
