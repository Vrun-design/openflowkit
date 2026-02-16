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

const CommandItemRow = ({ item, isSelected, onClick }: { item: CommandItem, isSelected: boolean, onClick: () => void }) => (
    <div
        onClick={onClick}
        className={`
            group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-[var(--radius-md)] cursor-pointer transition-all duration-200 border border-transparent
            ${isSelected ? 'bg-[var(--brand-primary-50)] text-[var(--brand-primary-900)] border-[var(--brand-primary)] shadow-sm' : 'text-slate-600 hover:bg-[var(--brand-primary-50)] hover:border-[var(--brand-primary-100)] hover:text-[var(--brand-primary-700)]'}
        `}
    >
        <div className={`
            p-1.5 rounded-[var(--radius-sm)] transition-colors
            ${isSelected ? 'bg-[var(--brand-primary-100)] text-[var(--brand-primary)]' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'}
        `}>
            {item.icon}
        </div>

        <div className="flex-1 flex flex-col justify-center">
            <span className="text-sm font-medium leading-none mb-0.5">{item.label}</span>
            {item.description && (
                <span className={`text-[11px] ${isSelected ? 'text-[var(--brand-primary-400)]' : 'text-slate-400'}`}>
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
                        if (item.view) setView(item.view);
                        else if (item.action) {
                            item.action();
                            if (item.type === 'action') onClose();
                        }
                    }
                } else if (searchQuery) {
                    setView('ai');
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
                    placeholder="Type a command or ask Flowpilot..."
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

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent py-2">
                <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {searchQuery ? 'Results' : 'Suggestions'}
                </div>
                {filteredCommands.map((item, idx) => (
                    <CommandItemRow
                        key={item.id}
                        item={item}
                        isSelected={selectedIndex === idx}
                        onClick={() => {
                            if (item.view) setView(item.view);
                            else if (item.action) {
                                item.action();
                                if (item.type === 'action') onClose();
                            }
                        }}
                    />
                ))}
                {filteredCommands.length === 0 && searchQuery && (
                    <div
                        className="px-4 py-3 text-sm text-slate-500 text-center cursor-pointer hover:bg-slate-50"
                        onClick={() => setView('ai')}
                    >
                        Press <kbd className="font-sans px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs">Enter</kbd> to ask Flowpilot about "{searchQuery}"
                    </div>
                )}
            </div>
        </>
    );
};
