import React from 'react';
import { Redo2, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Tooltip } from '../Tooltip';

interface ToolbarHistoryControlsProps {
    isInteractive: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

export function ToolbarHistoryControls({
    isInteractive,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}: ToolbarHistoryControlsProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-0.5">
            <Tooltip text={t('toolbar.undo')}>
                <Button
                    onClick={onUndo}
                    disabled={!canUndo || !isInteractive}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    icon={<Undo2 className="w-4 h-4" />}
                />
            </Tooltip>
            <Tooltip text={t('toolbar.redo')}>
                <Button
                    onClick={onRedo}
                    disabled={!canRedo || !isInteractive}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    icon={<Redo2 className="w-4 h-4" />}
                />
            </Tooltip>
        </div>
    );
}
