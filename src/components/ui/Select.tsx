import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { EDITOR_FIELD_DEFAULT_CLASS } from './editorFieldStyles';

export interface SelectOption {
    value: string;
    label: string;
    hint?: string;
    badge?: string;
    group?: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
}

interface MenuPosition {
    top: number;
    left: number;
    width: number;
}

const GROUP_ORDER = ['Flagship', 'Reasoning', 'Speed', 'Legacy', 'Custom', 'Other'];

function sortGroups(a: string, b: string): number {
    const idxA = GROUP_ORDER.indexOf(a);
    const idxB = GROUP_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
}

export function Select({ value, onChange, options, placeholder = 'Select...', className = '' }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = useState<MenuPosition>({
        top: 0,
        left: 0,
        width: 0,
    });

    const selectedOption = options.find(o => o.value === value);

    const groupedOptions = options.reduce((acc, option) => {
        const group = option.group ?? 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(option);
        return acc;
    }, {} as Record<string, SelectOption[]>);

    const groups = Object.keys(groupedOptions);
    const hasGroups = groups.length > 1 || (groups.length === 1 && groups[0] !== 'Other');
    const sortedGroups = hasGroups ? [...groups].sort(sortGroups) : [];
    const shouldRenderMenu = isOpen && typeof document !== 'undefined';

    useLayoutEffect(() => {
        if (!isOpen || !containerRef.current) {
            return;
        }

        function updateMenuPosition() {
            if (!containerRef.current) {
                return;
            }
            const rect = containerRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
            });
        }

        updateMenuPosition();
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);

        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [isOpen]);

    useEffect(() => {
        function handlePointerDownOutside(event: PointerEvent) {
            const target = event.target as Node;
            const clickedTrigger = containerRef.current?.contains(target);
            const clickedMenu = menuRef.current?.contains(target);

            if (!clickedTrigger && !clickedMenu) {
                setIsOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('pointerdown', handlePointerDownOutside, true);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDownOutside, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    function handleToggle(): void {
        setIsOpen((current) => !current);
    }

    function handleSelect(optionValue: string): void {
        onChange(optionValue);
        setIsOpen(false);
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={`${EDITOR_FIELD_DEFAULT_CLASS} flex items-center justify-between px-3 py-2.5 text-left ${isOpen ? 'border-[var(--brand-primary-300)] bg-[var(--brand-surface)] ring-1 ring-[var(--brand-primary)]/15' : 'hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]/55'}`.trim()}
            >
                <div className="flex flex-col items-start overflow-hidden">
                    <span className={`block truncate ${selectedOption ? 'text-[var(--brand-text)] font-medium' : 'text-[var(--brand-secondary)]'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    {selectedOption?.hint && (
                        <span className="text-[10px] text-[var(--brand-secondary)] truncate block max-w-full">
                            {selectedOption.hint}
                        </span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--brand-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {shouldRenderMenu
                ? createPortal(
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        role="listbox"
                        data-floating-select-root="true"
                        className="fixed z-[1000] max-h-64 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-md)] no-scrollbar focus:outline-none"
                        style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                            width: `${menuPosition.width}px`,
                        }}
                    >
                        <div className="py-1">
                            {hasGroups ? (
                                sortedGroups.map(group => {
                                    const groupItems = groupedOptions[group];
                                    if (!groupItems?.length) return null;
                                    return (
                                        <div key={group}>
                                            <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-secondary)] uppercase tracking-wider bg-[var(--brand-background)]/50 sticky top-0 backdrop-blur-sm">
                                                {group}
                                            </div>
                                            {groupItems.map(option => (
                                                <OptionItem
                                                    key={option.value}
                                                    option={option}
                                                    isSelected={value === option.value}
                                                    onClick={() => handleSelect(option.value)}
                                                />
                                            ))}
                                        </div>
                                    );
                                })
                            ) : (
                                options.map(option => (
                                    <OptionItem
                                        key={option.value}
                                        option={option}
                                        isSelected={value === option.value}
                                        onClick={() => handleSelect(option.value)}
                                    />
                                ))
                            )}

                            {options.length === 0 && (
                                <div className="px-3 py-8 text-center text-sm text-[var(--brand-secondary)]">
                                    No options available
                                </div>
                            )}
                        </div>
                    </motion.div>,
                    document.body
                ) : null}
        </div>
    );
}

function OptionItem({ option, isSelected, onClick }: { option: SelectOption; isSelected: boolean; onClick: () => void }) {
    const itemClass = isSelected
        ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
        : 'text-[var(--brand-text)] hover:bg-[var(--brand-background)]/75';

    const badgeClass = isSelected
        ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20'
        : 'bg-[var(--brand-background)] text-[var(--brand-secondary)] border-[var(--color-brand-border)]';

    const hintClass = isSelected ? 'text-[var(--brand-primary)]/70' : 'text-[var(--brand-secondary)]';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${itemClass}`}
        >
            <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                    <span className={`truncate ${isSelected ? 'font-medium' : ''}`}>
                        {option.label}
                    </span>
                    {option.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${badgeClass}`}>
                            {option.badge}
                        </span>
                    )}
                </div>
                {option.hint && (
                    <span className={`text-[10px] truncate ${hintClass}`}>
                        {option.hint}
                    </span>
                )}
            </div>
            {isSelected && <Check className="w-4 h-4 shrink-0 ml-2" />}
        </button>
    );
}
