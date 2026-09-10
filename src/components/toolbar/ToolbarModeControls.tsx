import React from 'react';
import { ArrowUpRight, Hand, Highlighter, Minus, MousePointer2, Pen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Tooltip } from '../Tooltip';
import { TOOLBAR_BUTTON_RADIUS_CLASS, TOOLBAR_GROUP_RADIUS_CLASS } from './toolbarButtonStyles';
import { useIsOpenCanvasActive } from '@/canvas/activeCanvas';
import { useFlowStore } from '@/store';
import type { CanvasDrawingTool } from '@/store/types';

const DRAWING_TOOLS: ReadonlyArray<{
  readonly tool: CanvasDrawingTool;
  readonly labelKey: string;
  readonly fallback: string;
  readonly Icon: typeof Pen;
}> = [
  { tool: 'pen', labelKey: 'toolbar.drawPen', fallback: 'Draw with pen', Icon: Pen },
  { tool: 'highlighter', labelKey: 'toolbar.drawHighlighter', fallback: 'Highlight', Icon: Highlighter },
  { tool: 'line', labelKey: 'toolbar.drawLine', fallback: 'Draw line', Icon: Minus },
  { tool: 'arrow', labelKey: 'toolbar.drawArrow', fallback: 'Draw arrow', Icon: ArrowUpRight },
];

interface ToolbarModeControlsProps {
    isInteractive: boolean;
    isSelectMode: boolean;
    onToggleSelectMode: () => void;
    onTogglePanMode: () => void;
}

export function ToolbarModeControls({
    isInteractive,
    isSelectMode,
    onToggleSelectMode,
    onTogglePanMode,
}: ToolbarModeControlsProps): React.ReactElement {
    const { t } = useTranslation();
    // Freeform drawing exists only on the OpenCanvas surface; the buttons
    // appear only when it is the visible canvas rather than sitting inert.
    const drawingAvailable = useIsOpenCanvasActive();
    const drawingTool = useFlowStore((state) => state.viewSettings.drawingTool);
    const setViewSettings = useFlowStore((state) => state.setViewSettings);
    const drawing = drawingAvailable && drawingTool !== null;
    const selectActive = isSelectMode && !drawing;
    const panActive = !isSelectMode && !drawing;
    const selectIconClass = `w-4 h-4 ${selectActive ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-secondary)] group-hover:text-[var(--brand-text)]'}`;
    const panIconClass = `w-4 h-4 ${panActive ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-secondary)] group-hover:text-[var(--brand-text)]'}`;
    const activeClass = 'border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-none';
    const idleClass = 'text-[var(--brand-secondary)] hover:bg-[var(--brand-surface)]/80 hover:text-[var(--brand-text)]';
    const clearDrawing = (): void => {
        if (drawingTool !== null) setViewSettings({ drawingTool: null });
    };

    return (
        <div className={`flex gap-0.5 border border-[var(--color-brand-border)]/80 bg-[var(--brand-background)]/72 p-1 ${TOOLBAR_GROUP_RADIUS_CLASS}`}>
            <Tooltip text={t('toolbar.selectMode')}>
                <Button
                    onClick={() => { clearDrawing(); onToggleSelectMode(); }}
                    disabled={!isInteractive}
                    variant="ghost"
                    size="icon"
                    aria-label={t('toolbar.selectMode')}
                    aria-pressed={selectActive}
                    className={`h-8 w-8 transition-all ${TOOLBAR_BUTTON_RADIUS_CLASS} ${selectActive ? activeClass : idleClass}`}
                    icon={<MousePointer2 className={selectIconClass} />}
                />
            </Tooltip>
            <Tooltip text={t('toolbar.panMode')}>
                <Button
                    onClick={() => { clearDrawing(); onTogglePanMode(); }}
                    disabled={!isInteractive}
                    variant="ghost"
                    size="icon"
                    aria-label={t('toolbar.panMode')}
                    aria-pressed={panActive}
                    className={`h-8 w-8 transition-all ${TOOLBAR_BUTTON_RADIUS_CLASS} ${panActive ? activeClass : idleClass}`}
                    icon={<Hand className={panIconClass} />}
                />
            </Tooltip>
            {drawingAvailable ? DRAWING_TOOLS.map(({ tool, labelKey, fallback, Icon }) => {
                const active = drawingTool === tool;
                return (
                    <Tooltip key={tool} text={t(labelKey, fallback)}>
                        <Button
                            onClick={() => setViewSettings({ drawingTool: active ? null : tool })}
                            disabled={!isInteractive}
                            variant="ghost"
                            size="icon"
                            aria-label={t(labelKey, fallback)}
                            aria-pressed={active}
                            className={`h-8 w-8 transition-all ${TOOLBAR_BUTTON_RADIUS_CLASS} ${active ? activeClass : idleClass}`}
                            icon={<Icon className={`w-4 h-4 ${active ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-secondary)] group-hover:text-[var(--brand-text)]'}`} />}
                        />
                    </Tooltip>
                );
            }) : null}
        </div>
    );
}
