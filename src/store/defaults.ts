import type { DesignSystem, GlobalEdgeOptions } from '@/lib/types';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import type { AISettings, BrandConfig, BrandKit, Layer, ViewSettings } from './types';

export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
    id: 'default',
    name: 'OpenFlowKit Default',
    description: 'The classic FlowMind look and feel.',
    colors: {
        primary: '#6366f1',
        secondary: '#64748b',
        accent: '#f43f5e',
        background: '#f8fafc',
        surface: '#ffffff',
        border: '#e2e8f0',
        text: {
            primary: '#0f172a',
            secondary: '#475569',
        },
        nodeBackground: '#ffffff',
        nodeBorder: '#e2e8f0',
        nodeText: '#0f172a',
        edge: '#94a3b8',
    },
    typography: {
        fontFamily: 'Inter, sans-serif',
        fontSize: {
            sm: '12px',
            md: '14px',
            lg: '16px',
            xl: '20px',
        },
    },
    components: {
        node: {
            borderRadius: '1rem',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            padding: '1rem',
        },
        edge: {
            strokeWidth: 2,
        },
    },
};

export const DEFAULT_AI_SETTINGS: AISettings = {
    provider: 'gemini',
    apiKey: undefined,
    model: undefined,
    customBaseUrl: undefined,
    customHeaders: [],
};

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
    appName: 'OpenFlowKit',
    logoUrl: null,
    faviconUrl: '/favicon.svg',
    logoStyle: 'both',
    colors: {
        primary: '#E95420',
        secondary: '#64748b',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#0f172a',
    },
    typography: {
        fontFamily: 'Inter',
    },
    shape: {
        radius: 8,
        borderWidth: 1,
    },
    ui: {
        glassmorphism: true,
        buttonStyle: 'beveled',
        showBeta: true,
    },
};

export const DEFAULT_BRAND_KIT: BrandKit = {
    ...DEFAULT_BRAND_CONFIG,
    id: 'default',
    name: 'Default Identity',
    isDefault: true,
};

export const INITIAL_VIEW_SETTINGS: ViewSettings = {
    showGrid: true,
    snapToGrid: true,
    alignmentGuidesEnabled: true,
    isShortcutsHelpOpen: false,
    defaultIconsEnabled: true,
    smartRoutingEnabled: true,
    smartRoutingProfile: 'standard',
    smartRoutingBundlingEnabled: false,
    architectureStrictMode: false,
    largeGraphSafetyMode: 'auto',
    largeGraphSafetyProfile: 'balanced',
    exportSerializationMode: 'deterministic',
    historyModelV2Enabled: ROLLOUT_FLAGS.historyModelV2,
    analyticsEnabled: true,
    language: 'en',
};

export const INITIAL_GLOBAL_EDGE_OPTIONS: GlobalEdgeOptions = {
    type: 'smoothstep',
    animated: !ROLLOUT_FLAGS.visualQualityV2,
    strokeWidth: ROLLOUT_FLAGS.visualQualityV2 ? 1.5 : 2,
};

export const INITIAL_LAYERS: Layer[] = [
    {
        id: 'default',
        name: 'Default',
        visible: true,
        locked: false,
    },
];
