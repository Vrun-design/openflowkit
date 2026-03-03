import React from 'react';
import { Hand, MousePointer2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Tooltip } from '../Tooltip';

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

    return (
        <div className="flex bg-slate-100/50 p-1 rounded-[var(--radius-md)] gap-0.5 border border-slate-200/60">
            <Tooltip text={t('toolbar.selectMode')}>
                <Button
                    onClick={onToggleSelectMode}
                    disabled={!isInteractive}
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 transition-all ${isSelectMode ? 'bg-white shadow text-[var(--brand-primary)]' : 'text-slate-500 hover:text-slate-900'}`}
                    icon={<MousePointer2 className="w-4 h-4" />}
                />
            </Tooltip>
            <Tooltip text={t('toolbar.panMode')}>
                <Button
                    onClick={onTogglePanMode}
                    disabled={!isInteractive}
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 transition-all ${!isSelectMode ? 'bg-white shadow text-[var(--brand-primary)]' : 'text-slate-500 hover:text-slate-900'}`}
                    icon={<Hand className="w-4 h-4" />}
                />
            </Tooltip>
        </div>
    );
}
