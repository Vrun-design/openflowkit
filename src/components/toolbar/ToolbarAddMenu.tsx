import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../Tooltip';
import { Button } from '../ui/Button';
import {
  getDefaultToolbarAddItemId,
  getAddItemDefinitionById,
  executeAddItem,
  type AddItemActions,
  type AddItemId,
} from '@/components/add-items/addItemRegistry';
import { getToolbarIconButtonClass } from './toolbarButtonStyles';

const LazyToolbarAddMenuPanel = lazy(async () => {
  const module = await import('./ToolbarAddMenuPanel');
  return { default: module.ToolbarAddMenuPanel };
});

interface ToolbarAddMenuProps extends AddItemActions {
  currentItemId: AddItemId;
  isInteractive: boolean;
  showAddMenu: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onCurrentItemChange: (itemId: AddItemId) => void;
  getCenter: () => { x: number; y: number };
}

export function ToolbarAddMenu({
  currentItemId,
  isInteractive,
  showAddMenu,
  onToggleMenu,
  onCloseMenu,
  onCurrentItemChange,
  getCenter,
  ...actions
}: ToolbarAddMenuProps): React.ReactElement {
  const { t } = useTranslation();
  const resolvedCurrentItemId = currentItemId || getDefaultToolbarAddItemId();
  const currentItem = getAddItemDefinitionById(resolvedCurrentItemId, t);

  function handleSelectItem(itemId: AddItemId): void {
    onCurrentItemChange(itemId);
    executeAddItem(itemId, actions, getCenter());
    onCloseMenu();
  }

  return (
    <div className="relative">
      <Tooltip text={t('toolbar.addItem', 'Add Item')}>
        <Button
          onClick={onToggleMenu}
          disabled={!isInteractive}
          data-testid="toolbar-add-toggle"
          variant="ghost"
          size="icon"
          className={getToolbarIconButtonClass({ active: showAddMenu })}
          aria-label={t('toolbar.addItem', 'Add Item')}
          aria-expanded={showAddMenu}
          aria-haspopup="menu"
          icon={currentItem.renderIcon(`block h-4 w-4 transition-transform ${showAddMenu ? 'text-[var(--brand-primary)]' : 'group-hover:scale-105'}`)}
        />
      </Tooltip>

      {showAddMenu && isInteractive ? (
        <Suspense fallback={null}>
          <LazyToolbarAddMenuPanel
            currentItemId={resolvedCurrentItemId}
            onSelectItem={handleSelectItem}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
