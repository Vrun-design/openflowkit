import React, { useMemo, useEffect } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { CommandItem, CommandView } from './types';

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

function runCommandItem(item: CommandItem, setView: (view: CommandView) => void, onClose: () => void): void {
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

const CommandItemRow = ({ item, isSelected, onClick }: { item: CommandItem, isSelected: boolean, onClick: () => void }) => (
    <div
        role="option"
        aria-selected={isSelected}
        onClick={onClick}
        className={`
            group mx-2 flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-2.5 cursor-pointer transition-all duration-200
            ${isSelected ? 'border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-900)]' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'}
        `}
    >
        <div className={`
            flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border transition-colors
            ${isSelected ? 'border-[var(--brand-primary-100)] bg-white text-[var(--brand-primary)]' : 'border-slate-200/70 bg-slate-50 text-slate-500 group-hover:border-slate-200 group-hover:bg-white'}
        `}>
            {item.icon}
        </div>

        <div className="flex-1 flex flex-col justify-center">
            <span className="text-sm font-semibold leading-none mb-1">{item.label}</span>
            {item.description && (
                <span className={`text-[11px] ${isSelected ? 'text-[var(--brand-primary-500)]' : 'text-slate-400'}`}>
                    {item.description}
                </span>
            )}
        </div>

        {item.type === 'toggle' && (
            <div className={`
                w-8 h-4 rounded-full relative transition-colors
                ${item.value ? 'bg-[var(--brand-primary)]' : 'bg-slate-200'}
             `}>
                <div className={`
                    absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm
                    ${item.value ? 'left-4.5' : 'left-0.5'}
                `} style={{ left: item.value ? '18px' : '2px' }} />
            </div>
        )}

        {item.type === 'navigation' && (
            <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--brand-primary-400)]' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
        )}

        {item.shortcut && (
            <div className={`
                text-[10px] font-medium px-1.5 py-0.5 rounded border
                ${isSelected
                    ? 'bg-white border-[var(--brand-primary-200)] text-[var(--brand-primary-400)]'
                    : 'bg-slate-50 border-slate-200 text-slate-400'}
            `}>
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
    inputRef
}: RootViewProps) => {
    const filteredCommands = useMemo(() => {
        if (!searchQuery) return commands.filter(c => !c.hidden);
        return commands.filter(c =>
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
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
                setSelectedIndex(prev => (prev === -1 ? 0 : (prev + 1) % len));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev === -1 ? len - 1 : (prev - 1 + len) % len));
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
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/50">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        // Prevent global shortcuts interfering with typing
                        e.stopPropagation();
                    }}
                    aria-label="Search command bar actions"
                    placeholder="Search actions, FlowPilot, code, or canvas tools..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 text-base focus:ring-0"
                    autoFocus
                />
                <div className="flex items-center gap-2">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        className="rounded-md h-6 w-6"
                        icon={<X className="w-4 h-4" />}
                    />
                </div>
            </div>

            <div
                role="listbox"
                aria-label={searchQuery ? 'Command search results' : 'Command quick actions'}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent py-2"
            >
                <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {searchQuery ? 'Results' : 'Quick Actions'}
                </div>
                {filteredCommands.map((item, idx) => (
                    <CommandItemRow
                        key={item.id}
                        item={item}
                        isSelected={selectedIndex === idx}
                        onClick={() => runCommandItem(item, setView, onClose)}
                    />
                ))}
                {filteredCommands.length === 0 && searchQuery && (
                    <div className="px-4 py-3 text-center text-sm text-slate-500">
                        No matching commands for &quot;{searchQuery}&quot;
                    </div>
                )}
            </div>
        </>
    );
};
