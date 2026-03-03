import { act, render, screen } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesignSystem } from '@/lib/types';
import { DEFAULT_DESIGN_SYSTEM, useFlowStore } from '@/store';
import CustomNode from './CustomNode';
import { CustomSmoothStepEdge } from './CustomEdge';

vi.mock('reactflow', async (importOriginal) => {
    const actual = await importOriginal<typeof import('reactflow')>();

    return {
        ...actual,
        Handle: () => null,
        NodeResizer: () => null,
        EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Position: {
            Top: 'top',
            Right: 'right',
            Bottom: 'bottom',
            Left: 'left',
        },
        BaseEdge: ({ style }: { style?: CSSProperties }) => (
            <div
                data-testid="custom-edge-base"
                data-style={JSON.stringify(style ?? {})}
            />
        ),
        getBezierPath: () => ['M 0 0 C 0 0 0 0 0 0', 10, 20],
        getSmoothStepPath: () => ['M 0 0 L 10 10', 15, 25],
        useEdges: () => [],
        useReactFlow: () => ({
            setEdges: vi.fn(),
            screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
        }),
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
            colors: {
                nodeBackground: '#101820',
                nodeBorder: '#00d1ff',
                nodeText: '#f6f7f9',
                edge: '#ff0055',
            },
            components: {
                edge: { strokeWidth: 6 },
            },
        });

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
                positionAbsoluteX={0}
                positionAbsoluteY={0}
                isConnectable={true}
                xPos={0}
                yPos={0}
                sourcePosition="right"
                targetPosition="left"
            />
        );

        const nodeContainer = screen.getByTestId('custom-node-container');
        expect(nodeContainer).toHaveStyle({
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
        });

        act(() => {
            useFlowStore.getState().setActiveDesignSystem('alt');
        });

        expect(nodeContainer).toHaveStyle({
            backgroundColor: '#101820',
            borderColor: '#00d1ff',
        });
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
                sourcePosition="right"
                targetPosition="left"
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
                sourcePosition="right"
                targetPosition="left"
                selected={false}
                style={{}}
            />
        );

        const afterStyle = JSON.parse(screen.getByTestId('custom-edge-base').getAttribute('data-style') || '{}');
        expect(afterStyle.stroke).toBe('#ff0055');
        expect(afterStyle.strokeWidth).toBe(6);
    });
});
