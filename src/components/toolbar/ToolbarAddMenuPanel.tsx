import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import {
  getAddItemsForScope,
  getAddItemSections,
  type AddItemId,
} from '@/components/add-items/addItemRegistry';

interface ToolbarAddMenuPanelProps {
  currentItemId: AddItemId;
  onSelectItem: (itemId: AddItemId) => void;
}

export function ToolbarAddMenuPanel({
  currentItemId,
  onSelectItem,
}: ToolbarAddMenuPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const sections = getAddItemSections(t);
  const items = getAddItemsForScope('toolbar', t);

  const itemsBySection = useMemo(() => {
    return sections.map((section) => ({
      ...section,
      items: items.filter((item) => item.section === section.id),
    }));
  }, [items, sections]);

  return (
    <div className="absolute bottom-full left-1/2 mb-3 w-64 -translate-x-1/2 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)]/80 bg-[var(--brand-surface)]/95 p-2 shadow-[var(--shadow-md)] ring-1 ring-black/5 backdrop-blur-md animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 origin-bottom pointer-events-auto max-h-[70vh] overflow-y-auto custom-scrollbar">
      {itemsBySection.map((section) => (
        <div key={section.id} className="mb-2 last:mb-0">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-secondary)]">
            {section.title}
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            {section.items.map((item) => {
              const isActive = item.id === currentItemId;

              return (
                <Button
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  variant="ghost"
                  className={`h-8 justify-start rounded-[var(--radius-sm)] px-2 text-xs transition-colors ${
                    isActive
                      ? 'bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
                      : 'hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]'
                  }`}
                  icon={item.renderIcon('h-4 w-4')}
                >
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
