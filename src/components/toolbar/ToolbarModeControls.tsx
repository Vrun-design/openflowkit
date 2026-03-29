import React from 'react';
import { Hand, MousePointer2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Tooltip } from '../Tooltip';
import { TOOLBAR_BUTTON_RADIUS_CLASS, TOOLBAR_GROUP_RADIUS_CLASS } from './toolbarButtonStyles';

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
    const selectIconClass = `w-4 h-4 ${isSelectMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-secondary)] group-hover:text-[var(--brand-text)]'}`;
    const panIconClass = `w-4 h-4 ${!isSelectMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-secondary)] group-hover:text-[var(--brand-text)]'}`;

    return (
        <div className={`flex gap-0.5 border border-[var(--color-brand-border)]/80 bg-[var(--brand-background)]/72 p-1 ${TOOLBAR_GROUP_RADIUS_CLASS}`}>
            <Tooltip text={t('toolbar.selectMode')}>
                <Button
                    onClick={onToggleSelectMode}
                    disabled={!isInteractive}
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 transition-all ${TOOLBAR_BUTTON_RADIUS_CLASS} ${isSelectMode ? 'border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-none' : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-surface)]/80 hover:text-[var(--brand-text)]'}`}
                    icon={<MousePointer2 className={selectIconClass} />}
                />
            </Tooltip>
            <Tooltip text={t('toolbar.panMode')}>
                <Button
                    onClick={onTogglePanMode}
                    disabled={!isInteractive}
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 transition-all ${TOOLBAR_BUTTON_RADIUS_CLASS} ${!isSelectMode ? 'border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-none' : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-surface)]/80 hover:text-[var(--brand-text)]'}`}
                    icon={<Hand className={panIconClass} />}
                />
            </Tooltip>
        </div>
    );
}
