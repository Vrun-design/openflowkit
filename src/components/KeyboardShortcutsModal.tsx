import React from 'react';
import { useFlowStore } from '../store';
import { X, Keyboard, Command, MousePointer2, Pencil, Sparkles } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../constants';

export function KeyboardShortcutsModal(): React.JSX.Element | null {
    const { viewSettings, setShortcutsHelpOpen } = useFlowStore();
    const { isShortcutsHelpOpen } = viewSettings;

    if (!isShortcutsHelpOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-white shadow-2xl max-w-2xl w-full border border-slate-200/60 flex flex-col overflow-hidden animate-in zoom-in duration-200"
                style={{ borderRadius: 'var(--brand-radius, 20px)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 text-slate-900">
                        <div
                            className="w-10 h-10 flex items-center justify-center"
                            style={{
                                background: 'var(--brand-primary-50, #eef2ff)',
                                color: 'var(--brand-primary, #6366f1)',
                                borderRadius: 'calc(var(--brand-radius, 24px) * 0.4)'
                            }}
                        >
                            <Keyboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-none">Keyboard Shortcuts</h2>
                            <p className="text-xs text-slate-500 mt-1">Master your workflow with speed.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShortcutsHelpOpen(false)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-90"
                        aria-label="Close shortcuts modal"
                    >
                        <X size={20} className="text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 overflow-y-auto max-h-[70vh]">
                    {KEYBOARD_SHORTCUTS.map((section) => (
                        <ShortcutGroup
                            key={section.title}
                            title={section.title}
                            icon={getSectionIcon(section.title)}
                        >
                            {section.items.map((item) => (
                                <ShortcutItem key={item.label} keys={item.keys} label={item.label} />
                            ))}
                        </ShortcutGroup>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="px-8 py-5 bg-slate-50 text-center border-t border-slate-100">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
                        Pro tip: Hold <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold mx-1">Alt</kbd> to enable selection box while dragging.
                    </p>
                </div>
            </div>
        </div>
    );
}

function getSectionIcon(title: string) {
    switch (title.toLowerCase()) {
        case 'essentials': return <Command className="w-4 h-4 text-slate-400" />;
        case 'manipulation': return <Pencil className="w-4 h-4 text-slate-400" />;
        case 'navigation': return <MousePointer2 className="w-4 h-4 text-slate-400" />;
        default: return <Sparkles className="w-4 h-4 text-slate-400" />;
    }
}

interface ShortcutGroupProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

function ShortcutGroup({ title, icon, children }: ShortcutGroupProps): React.JSX.Element {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    {title}
                </h3>
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

interface ShortcutItemProps {
    keys: string[];
    label: string;
}

function ShortcutItem({ keys, label }: ShortcutItemProps): React.JSX.Element {
    return (
        <div className="flex items-center justify-between group py-0.5">
            <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-[var(--brand-primary)]">
                {label}
            </span>
            <div className="flex gap-1.5">
                {keys.map((k, i) => (
                    <kbd
                        key={i}
                        className="px-2 py-1 min-w-[28px] text-center text-[10px] font-bold bg-white border-b-2 border-slate-200 border-x border-t rounded shadow-sm text-slate-500 uppercase transition-colors group-hover:border-[var(--brand-primary-200)]"
                    >
                        {k}
                    </kbd>
                ))}
            </div>
        </div>
    );
}
