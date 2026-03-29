import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SidebarShellProps {
  children: React.ReactNode;
}

interface SidebarHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  onClose?: () => void;
}

interface SidebarBodyProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

interface SidebarSegmentedTabsProps {
  tabs: SidebarTabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  getTabTestId?: (tab: SidebarTabItem) => string | undefined;
}

function getSidebarTabButtonClass(isActive: boolean): string {
  if (isActive) {
    return 'bg-[var(--brand-surface)] text-[var(--brand-primary)] shadow-sm ring-1 ring-[var(--color-brand-border)]/70';
  }

  return 'text-[var(--brand-secondary)] hover:text-[var(--brand-text)]';
}

export function SidebarShell({ children }: SidebarShellProps): React.ReactElement {
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--brand-surface)]/95 animate-in fade-in duration-150"
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function SidebarHeader({
  title,
  description,
  meta,
  onClose,
}: SidebarHeaderProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--brand-text)]">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs text-[var(--brand-secondary)]">{description}</p>
          ) : null}
        </div>
        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)]"
          >
            <span className="sr-only">{t('sidebar.close', 'Close sidebar')}</span>
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {meta ? <div className="mt-3">{meta}</div> : null}
    </div>
  );
}

export function SidebarBody({
  children,
  className = '',
  scrollable = true,
}: SidebarBodyProps): React.ReactElement {
  const overflowClassName = scrollable ? 'overflow-y-auto' : 'overflow-hidden';

  return (
    <div
      className={`min-h-0 flex-1 ${overflowClassName} px-4 py-3 custom-scrollbar ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function SidebarSegmentedTabs({
  tabs,
  activeTab,
  onTabChange,
  getTabTestId,
}: SidebarSegmentedTabsProps): React.ReactElement {
  return (
    <div className="flex rounded-[var(--brand-radius)] border border-[var(--color-brand-border)]/60 bg-[var(--brand-background)]/70 p-1">
      {tabs.map(({ id, label, icon }) => (
        <button
          type="button"
          key={id}
          onClick={() => onTabChange(id)}
          data-testid={getTabTestId?.({ id, label, icon })}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-xs)] px-3 py-1.5 text-xs font-semibold transition-colors ${getSidebarTabButtonClass(activeTab === id)}`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
