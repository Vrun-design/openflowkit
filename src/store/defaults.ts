import type { DesignSystem, GlobalEdgeOptions } from '@/lib/types';
import { sanitizeAISettings } from './aiSettings';
import type { AISettings, Layer, ViewSettings } from './types';

export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
    id: 'default',
    name: 'OpenFlowKit Default',
    description: 'The default OpenFlowKit design system.',
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
            borderRadius: '8px',
            borderWidth: '1px',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.04)',
            padding: '1rem',
        },
        edge: {
            strokeWidth: 2,
        },
    },
};

export const DEFAULT_AI_SETTINGS: AISettings = sanitizeAISettings(
    { provider: 'gemini' },
    {
        provider: 'gemini',
        storageMode: 'local',
        apiKey: undefined,
        model: undefined,
        customBaseUrl: undefined,
        customHeaders: [],
    }
);

export const INITIAL_VIEW_SETTINGS: ViewSettings = {
    showGrid: true,
    snapToGrid: true,
    alignmentGuidesEnabled: true,
    isShortcutsHelpOpen: false,
    drawingTool: null,
    defaultIconsEnabled: true,
    smartRoutingEnabled: true,
    smartRoutingProfile: 'standard',
    smartRoutingBundlingEnabled: false,
    architectureStrictMode: false,
    mermaidImportMode: 'renderer_first',
    largeGraphSafetyMode: 'auto',
    largeGraphSafetyProfile: 'balanced',
    exportSerializationMode: 'deterministic',
    language: 'en',
    lintRules: '',
};

export const INITIAL_GLOBAL_EDGE_OPTIONS: GlobalEdgeOptions = {
    // Mermaid-parity default: smooth B-spline through the routing corridor.
    // Matches Mermaid's `flowchart.curve = 'basis'` baseline so a fresh diagram
    // looks like the Mermaid render users compare us against.
    type: 'bezier',
    curve: 'basis',
    animated: false,
    strokeWidth: 1.5,
};

export const INITIAL_LAYERS: Layer[] = [
    {
        id: 'default',
        name: 'Default',
        visible: true,
        locked: false,
    },
];
