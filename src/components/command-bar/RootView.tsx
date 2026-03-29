import React, { useMemo, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOWPILOT_NAME } from '@/lib/brand';
import { Button } from '../ui/Button';
import { CommandItem, CommandView } from './types';
import { SearchField } from '../ui/SearchField';
import { fuzzyMatch, fuzzyScore } from '@/lib/fuzzyMatch';

interface RootViewProps {
  commands: CommandItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedIndex: number;
  setSelectedIndex: (i: number | ((prev: number) => number)) => void;
  onClose: () => void;
  setView: (v: CommandView) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

function runCommandItem(
  item: CommandItem,
  setView: (view: CommandView) => void,
  onClose: () => void
): void {
  if (item.view) {
    setView(item.view);
    return;
  }

  if (!item.action) {
    return;
  }

  item.action();
  if (item.type === 'action') {
    onClose();
  }
}

const CommandItemRow = ({
  item,
  isSelected,
  onClick,
}: {
  item: CommandItem;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    role="option"
    aria-selected={isSelected}
    onClick={onClick}
    className={`
            group mx-2 flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-2.5 cursor-pointer transition-all duration-200
            ${isSelected ? 'border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-900)]' : 'border-transparent text-[var(--brand-secondary)] hover:border-[var(--color-brand-border)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'}
        `}
  >
    <div
      className={`
            flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border transition-colors
            ${isSelected ? 'border-[var(--brand-primary-100)] bg-[var(--brand-surface)] text-[var(--brand-primary)]' : 'border-[var(--color-brand-border)]/70 bg-[var(--brand-background)] text-[var(--brand-secondary)] group-hover:border-[var(--color-brand-border)] group-hover:bg-[var(--brand-surface)]'}
        `}
    >
      {item.icon}
    </div>

    <div className="flex-1 flex flex-col justify-center">
      <span className="mb-1 text-sm font-semibold leading-none">{item.label}</span>
      {item.description && (
        <span
          className={`text-[11px] ${isSelected ? 'text-[var(--brand-primary-500)]' : 'text-[var(--brand-secondary)]'}`}
        >
          {item.description}
        </span>
      )}
    </div>

    {item.type === 'toggle' && (
      <div
        className={`
                w-8 h-4 rounded-full relative transition-colors
                ${item.value ? 'bg-[var(--brand-primary)]' : 'bg-[var(--color-brand-border)]'}
             `}
      >
        <div
          className={`
                    absolute top-0.5 w-3 h-3 rounded-full bg-[var(--brand-surface)] transition-all shadow-sm
                    ${item.value ? 'left-4.5' : 'left-0.5'}
                `}
          style={{ left: item.value ? '18px' : '2px' }}
        />
      </div>
    )}

    {item.type === 'navigation' && (
      <ChevronRight
        className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--brand-primary-400)]' : 'text-[var(--brand-secondary)] opacity-0 group-hover:opacity-100'}`}
      />
    )}

    {item.shortcut && (
      <div
        className={`
                text-[10px] font-medium px-1.5 py-0.5 rounded border
                ${
                  isSelected
                    ? 'bg-[var(--brand-surface)] border-[var(--brand-primary-200)] text-[var(--brand-primary-400)]'
                    : 'bg-[var(--brand-background)] border-[var(--color-brand-border)] text-[var(--brand-secondary)]'
                }
            `}
      >
        {item.shortcut}
      </div>
    )}
  </div>
);

export const RootView = ({
  commands,
  searchQuery,
  setSearchQuery,
  selectedIndex,
  setSelectedIndex,
  onClose,
  setView,
  inputRef,
}: RootViewProps) => {
  const { t } = useTranslation();
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands.filter((c) => !c.hidden);
    return commands
      .filter(
        (c) =>
          fuzzyMatch(searchQuery, c.label) ||
          (c.description ? fuzzyMatch(searchQuery, c.description) : false) ||
          (c.shortcut ? fuzzyMatch(searchQuery, c.shortcut) : false)
      )
      .sort((a, b) => fuzzyScore(searchQuery, b.label) - fuzzyScore(searchQuery, a.label));
  }, [commands, searchQuery]);

  // Keyboard Nav for Root
  useEffect(() => {
    if (filteredCommands.length === 0) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const len = filteredCommands.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === -1 ? 0 : (prev + 1) % len));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === -1 ? len - 1 : (prev - 1 + len) % len));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < len) {
          const item = filteredCommands[selectedIndex];
          if (item) {
            runCommandItem(item, setView, onClose);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onClose, setView, searchQuery, setSelectedIndex]);

  return (
    <>
      <div className="border-b border-[var(--color-brand-border)]/50 px-4 py-3">
        <SearchField
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            // Prevent global shortcuts interfering with typing
            e.stopPropagation();
          }}
          aria-label={t('commandBar.root.searchAria', 'Search command bar actions')}
          placeholder={t('commandBar.root.searchPlaceholder', {
            appName: FLOWPILOT_NAME,
            defaultValue: `Search actions, ${FLOWPILOT_NAME}, code, or canvas tools...`,
          })}
          autoFocus
          trailingContent={
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-[var(--radius-sm)] h-8 w-8"
              icon={<X className="w-4 h-4" />}
            />
          }
        />
      </div>

      <div
        role="listbox"
        aria-label={searchQuery
          ? t('commandBar.root.resultsAria', 'Command search results')
          : t('commandBar.root.quickActionsAria', 'Command quick actions')}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent py-2"
      >
        {searchQuery ? (
          <>
            <div className="px-4 py-1.5 text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">
              {t('commandBar.root.results', 'Results')}
            </div>
            {filteredCommands.map((item, idx) => (
              <CommandItemRow
                key={item.id}
                item={item}
                isSelected={selectedIndex === idx}
                onClick={() => runCommandItem(item, setView, onClose)}
              />
            ))}
          </>
        ) : (
          filteredCommands.map((item, idx) => (
            <CommandItemRow
              key={item.id}
              item={item}
              isSelected={selectedIndex === idx}
              onClick={() => runCommandItem(item, setView, onClose)}
            />
          ))
        )}
        {filteredCommands.length === 0 && searchQuery && (
          <div className="px-4 py-3 text-center text-sm text-[var(--brand-secondary)]">
            {t('commandBar.root.noMatchingCommands', {
              query: searchQuery,
              defaultValue: 'No matching commands for "{{query}}"',
            })}
          </div>
        )}
      </div>
    </>
  );
};
