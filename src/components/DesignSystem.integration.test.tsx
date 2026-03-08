import { act, render, screen } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Position } from '@/lib/reactflowCompat';
import type { DesignSystem } from '@/lib/types';
import { DEFAULT_DESIGN_SYSTEM, useFlowStore } from '@/store';
import CustomNode from './CustomNode';
import { CustomSmoothStepEdge } from './CustomEdge';
import { DEFAULT_EDGE_OPTIONS } from '@/constants';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
}));

vi.mock('./custom-edge/CustomEdgeWrapper', () => ({
    CustomEdgeWrapper: ({ style }: { style?: CSSProperties }) => {
        const state = useFlowStore.getState();
        const resolvedStyle = {
            stroke: state.designSystems.find((system) => system.id === state.activeDesignSystemId)?.colors.edge ?? DEFAULT_EDGE_OPTIONS.style.stroke,
            strokeWidth: state.designSystems.find((system) => system.id === state.activeDesignSystemId)?.components.edge.strokeWidth ?? DEFAULT_EDGE_OPTIONS.style.strokeWidth,
            ...style,
        };

        return (
            <div
                data-testid="custom-edge-base"
                data-style={JSON.stringify(resolvedStyle)}
            />
        );
    },
}));

vi.mock('@/lib/reactflowCompat', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/reactflowCompat')>();

    return {
        ...actual,
        Handle: () => null,
        NodeResizer: () => null,
        NodeResizeControl: () => null,
        EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Position: {
            Top: 'top',
            Right: 'right',
            Bottom: 'bottom',
            Left: 'left',
        },
        getBezierPath: () => ['M 0 0 C 0 0 0 0 0 0', 10, 20],
        getSmoothStepPath: () => ['M 0 0 L 10 10', 15, 25],
        useReactFlow: () => ({
            getEdges: () => [],
            getNodes: () => [],
            setEdges: vi.fn(),
            screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
        }),
        useViewport: () => ({ zoom: 1 }),
    };
});

function createSystem(overrides: Partial<DesignSystem> = {}): DesignSystem {
    return {
        ...DEFAULT_DESIGN_SYSTEM,
        ...overrides,
        colors: {
            ...DEFAULT_DESIGN_SYSTEM.colors,
            ...(overrides.colors ?? {}),
            text: {
                ...DEFAULT_DESIGN_SYSTEM.colors.text,
                ...(overrides.colors?.text ?? {}),
            },
        },
        typography: {
            ...DEFAULT_DESIGN_SYSTEM.typography,
            ...(overrides.typography ?? {}),
            fontSize: {
                ...DEFAULT_DESIGN_SYSTEM.typography.fontSize,
                ...(overrides.typography?.fontSize ?? {}),
            },
        },
        components: {
            ...DEFAULT_DESIGN_SYSTEM.components,
            ...(overrides.components ?? {}),
            node: {
                ...DEFAULT_DESIGN_SYSTEM.components.node,
                ...(overrides.components?.node ?? {}),
            },
            edge: {
                ...DEFAULT_DESIGN_SYSTEM.components.edge,
                ...(overrides.components?.edge ?? {}),
            },
        },
    };
}

describe('Design System integration', () => {
    beforeEach(() => {
        const defaultSystem = createSystem({ id: 'default', name: 'Default' });
        const altSystem = createSystem({
            id: 'alt',
            name: 'Alt',
        });
        altSystem.colors.nodeBackground = '#101820';
        altSystem.colors.nodeBorder = '#00d1ff';
        altSystem.colors.nodeText = '#f6f7f9';
        altSystem.colors.edge = '#ff0055';
        altSystem.components.edge.strokeWidth = 6;
        altSystem.typography.fontFamily = 'Roboto, sans-serif';
        altSystem.components.node.borderRadius = '2px';

        useFlowStore.setState({
            designSystems: [defaultSystem, altSystem],
            activeDesignSystemId: 'default',
        });
    });

    it('updates node visual tokens when active design system changes', () => {
        render(
            <CustomNode
                id="n1"
                type="process"
                selected={false}
                dragging={false}
                zIndex={1}
                data={{ label: 'Node A' }}
                isConnectable={true}
                xPos={0}
                yPos={0}
                sourcePosition={Position.Right}
                targetPosition={Position.Left}
            />
        );

        const nodeContainer = document.querySelector('[data-transform-diagnostics="1"]') as HTMLDivElement | null;
        expect(nodeContainer).toBeTruthy();
        if (!nodeContainer) {
            throw new Error('Node container not found');
        }
        expect(nodeContainer.style.fontFamily).toBe('Inter, sans-serif');
        expect(nodeContainer.style.borderRadius).toBe('1rem');

        act(() => {
            useFlowStore.getState().setActiveDesignSystem('alt');
        });

        expect(nodeContainer.style.fontFamily).toBe('Roboto, sans-serif');
        expect(nodeContainer.style.borderRadius).toBe('2px');
    });

    it('updates edge visual tokens when active design system changes', () => {
        const { rerender } = render(
            <CustomSmoothStepEdge
                id="e1"
                source="n1"
                target="n2"
                sourceX={0}
                sourceY={0}
                targetX={100}
                targetY={100}
                sourcePosition={Position.Right}
                targetPosition={Position.Left}
                selected={false}
                style={{}}
            />
        );

        const beforeStyle = JSON.parse(screen.getByTestId('custom-edge-base').getAttribute('data-style') || '{}');
        expect(beforeStyle.stroke).toBe('#94a3b8');
        expect(beforeStyle.strokeWidth).toBe(2);

        act(() => {
            useFlowStore.getState().setActiveDesignSystem('alt');
        });

        rerender(
            <CustomSmoothStepEdge
                id="e1"
                source="n1"
                target="n2"
                sourceX={0}
                sourceY={0}
                targetX={100}
                targetY={100}
                sourcePosition={Position.Right}
                targetPosition={Position.Left}
                selected={false}
                style={{}}
            />
        );

        const afterStyle = JSON.parse(screen.getByTestId('custom-edge-base').getAttribute('data-style') || '{}');
        expect(afterStyle.stroke).toBe('#ff0055');
        expect(afterStyle.strokeWidth).toBe(6);
    });

    it('enforces content-safe minimum height for icon + subtitle nodes', () => {
        render(
            <CustomNode
                id="n2"
                type="process"
                selected={false}
                dragging={false}
                zIndex={1}
                data={{ label: 'Pro Tier', subLabel: 'Payment Process', icon: 'CreditCard' }}
                isConnectable={true}
                xPos={0}
                yPos={0}
                sourcePosition={Position.Right}
                targetPosition={Position.Left}
                {...({ width: 180, height: 90 } as Record<string, number>)}
            />
        );

        const nodeContainer = document.querySelector('[data-transform-diagnostics="1"]') as HTMLDivElement | null;
        expect(nodeContainer).toBeTruthy();
        if (!nodeContainer) {
            throw new Error('Node container not found');
        }
        expect(nodeContainer.style.minHeight).toBe('128px');
    });

    it('does not lock generic nodes to measured dimensions when no explicit size was authored', () => {
        const { container } = render(
            <CustomNode
                id="n-auto"
                type="process"
                selected={false}
                dragging={false}
                zIndex={1}
                data={{ label: 'Auto grow' }}
                isConnectable={true}
                xPos={0}
                yPos={0}
                sourcePosition={Position.Right}
                targetPosition={Position.Left}
                {...({ width: 220, height: 84 } as Record<string, number>)}
            />
        );

        const diagnosticsNode = container.querySelector('[data-transform-diagnostics="1"]') as HTMLElement | null;
        expect(diagnosticsNode).not.toBeNull();
        expect(diagnosticsNode?.style.width).toBe('100%');
        expect(diagnosticsNode?.style.height).toBe('');
    });
});
