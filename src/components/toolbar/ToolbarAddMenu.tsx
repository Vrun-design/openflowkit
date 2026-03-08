import React, { Suspense, lazy } from 'react';
import { Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Tooltip } from '../Tooltip';
import { getToolbarIconButtonClass } from './toolbarButtonStyles';
import type { NodeData } from '@/lib/types';

const LazyToolbarAddMenuPanel = lazy(async () => {
    const module = await import('./ToolbarAddMenuPanel');
    return { default: module.ToolbarAddMenuPanel };
});

interface ToolbarAddMenuProps {
    isInteractive: boolean;
    showAddMenu: boolean;
    onToggleMenu: () => void;
    onCloseMenu: () => void;
    onAddShape: (shape: NodeData['shape'], position: { x: number; y: number }) => void;
    getCenter: () => { x: number; y: number };
}

export function ToolbarAddMenu({
    isInteractive,
    showAddMenu,
    onToggleMenu,
    onCloseMenu,
    onAddShape,
    getCenter,
}: ToolbarAddMenuProps): React.ReactElement {
    const { t } = useTranslation();
    const toggleIconClass = `w-4 h-4 transition-transform ${showAddMenu ? 'scale-110 text-[var(--brand-primary)]' : 'group-hover:scale-110'}`;

    function addShapeAtCenter(shape: NodeData['shape']): void {
        onAddShape(shape, getCenter());
        onCloseMenu();
    }

    return (
        <div className="relative">
            <Tooltip text={t('toolbar.shapes', 'Shapes')}>
                <Button
                    onClick={onToggleMenu}
                    disabled={!isInteractive}
                    data-testid="toolbar-add-toggle"
                    variant="ghost"
                    size="icon"
                    className={getToolbarIconButtonClass({ active: showAddMenu })}
                    icon={<Square className={toggleIconClass} />}
                />
            </Tooltip>

            {showAddMenu && isInteractive && (
                <Suspense fallback={null}>
                    <LazyToolbarAddMenuPanel onAddShape={addShapeAtCenter} />
                </Suspense>
            )}
        </div>
    );
}
