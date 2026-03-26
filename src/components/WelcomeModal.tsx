import React, { useState } from 'react';
import { ArrowRight, FileInput, LayoutTemplate, PenSquare } from 'lucide-react';
import { OpenFlowLogo } from './icons/OpenFlowLogo';
import { writeLocalStorageString } from '@/services/storage/uiLocalStorage';
import { shouldShowWelcomeModal, WELCOME_SEEN_STORAGE_KEY } from './home/welcomeModalState';

export interface WelcomeModalProps {
    onOpenTemplates: () => void;
    onImport: () => void;
    onBlankCanvas: () => void;
}

interface PathOption {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    primary?: boolean;
}

function PathCard({ icon, title, description, onClick, primary }: PathOption): React.JSX.Element {
    return (
        <button
            onClick={onClick}
            className={`group flex w-full items-center gap-4 rounded-[var(--radius-md)] border p-4 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98] ${
                primary
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] hover:bg-[var(--brand-primary)]'
                    : 'border-slate-200 bg-white hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)]'
            }`}
        >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
                primary
                    ? 'bg-[var(--brand-primary)] text-white group-hover:bg-white group-hover:text-[var(--brand-primary)]'
                    : 'bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
            }`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${primary ? 'text-[var(--brand-primary)] group-hover:text-white' : 'text-slate-900'}`}>{title}</p>
                <p className={`text-xs ${primary ? 'text-[var(--brand-primary)]/70 group-hover:text-white/80' : 'text-slate-500'}`}>{description}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
        </button>
    );
}

export function WelcomeModal({ onOpenTemplates, onImport, onBlankCanvas }: WelcomeModalProps): React.JSX.Element | null {
    const [isOpen, setIsOpen] = useState(() => shouldShowWelcomeModal());

    const dismiss = () => {
        setIsOpen(false);
        writeLocalStorageString(WELCOME_SEEN_STORAGE_KEY, 'true');
    };

    const handle = (action: () => void) => () => { dismiss(); action(); };

    if (!isOpen) return null;

    const paths: PathOption[] = [
        {
            icon: <LayoutTemplate className="h-5 w-5" />,
            title: 'Start from a template',
            description: 'Pick a starter diagram and customize it',
            onClick: handle(onOpenTemplates),
            primary: true,
        },
        {
            icon: <FileInput className="h-5 w-5" />,
            title: 'Import a diagram',
            description: 'Open a JSON, Mermaid, or OpenFlow file',
            onClick: handle(onImport),
        },
        {
            icon: <PenSquare className="h-5 w-5" />,
            title: 'Blank canvas',
            description: 'Start with an empty diagram',
            onClick: handle(onBlankCanvas),
        },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/10 p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/50 bg-white shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="mb-6 flex flex-col items-center text-center">
                        <div
                            className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] ring-8"
                            style={{
                                background: 'var(--brand-primary-50, #eef2ff)',
                                color: 'var(--brand-primary, #6366f1)',
                                '--tw-ring-color': 'var(--brand-primary-50, #eef2ff)',
                            } as React.CSSProperties}
                        >
                            <OpenFlowLogo className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Welcome to OpenFlowKit</h2>
                        <p className="mt-1 text-sm text-slate-500">How do you want to get started?</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {paths.map((path) => (
                            <PathCard key={path.title} {...path} />
                        ))}
                    </div>

                    <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-slate-500">?</kbd> for keyboard shortcuts
                    </p>
                </div>
            </div>
        </div>
    );
}
