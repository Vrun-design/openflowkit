import React, { useState } from 'react';
import { ArrowRight, FileInput, LayoutTemplate, PenSquare, WandSparkles } from 'lucide-react';
import { OpenFlowLogo } from './icons/OpenFlowLogo';
import { writeLocalStorageString } from '@/services/storage/uiLocalStorage';
import { shouldShowWelcomeModal, WELCOME_SEEN_STORAGE_KEY } from './home/welcomeModalState';
import { RECOMMENDED_BUILDER_PROMPTS, RECOMMENDED_IMPORT_OPTIONS, RECOMMENDED_STARTER_TEMPLATE_LABELS } from '@/services/onboarding/config';
import { recordOnboardingEvent } from '@/services/onboarding/events';

export interface WelcomeModalProps {
    onOpenTemplates: () => void;
    onPromptWithAI: () => void;
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

export function WelcomeModal({ onOpenTemplates, onPromptWithAI, onImport, onBlankCanvas }: WelcomeModalProps): React.JSX.Element | null {
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
            description: `Jump into ${RECOMMENDED_STARTER_TEMPLATE_LABELS.slice(0, 3).join(', ')}.`,
            onClick: handle(() => {
                recordOnboardingEvent('welcome_template_selected', { surface: 'welcome-modal' });
                onOpenTemplates();
            }),
            primary: true,
        },
        {
            icon: <WandSparkles className="h-5 w-5" />,
            title: 'Prompt with Flowpilot',
            description: `Start from a builder prompt like "${RECOMMENDED_BUILDER_PROMPTS[0]}"`,
            onClick: handle(() => {
                recordOnboardingEvent('welcome_prompt_selected', { surface: 'welcome-modal' });
                onPromptWithAI();
            }),
        },
        {
            icon: <FileInput className="h-5 w-5" />,
            title: 'Import a diagram',
            description: `Bring in ${RECOMMENDED_IMPORT_OPTIONS.map((option) => option.label).join(', ')} sources.`,
            onClick: handle(() => {
                recordOnboardingEvent('welcome_import_selected', { surface: 'welcome-modal' });
                onImport();
            }),
        },
        {
            icon: <PenSquare className="h-5 w-5" />,
            title: 'Blank canvas',
            description: 'Start clean, then branch into templates, imports, or guided AI edits.',
            onClick: handle(() => {
                recordOnboardingEvent('welcome_blank_selected', { surface: 'welcome-modal' });
                onBlankCanvas();
            }),
        },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/10 p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/50 bg-white shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="mb-6 flex flex-col items-center text-center">
                        <OpenFlowLogo className="mb-4 h-12 w-12" />
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Welcome to OpenFlowKit</h2>
                        <p className="mt-1 max-w-md text-sm text-slate-500">
                            Pick the fastest way to get to a real developer diagram: template, import, prompt, or blank canvas.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {paths.map((path) => (
                            <PathCard key={path.title} {...path} />
                        ))}
                    </div>

                    <div className="mt-6 grid gap-3 rounded-[var(--radius-lg)] border border-slate-200 bg-slate-50/80 p-4 text-left md:grid-cols-2">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Best First Templates</p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                                {RECOMMENDED_STARTER_TEMPLATE_LABELS.join(' • ')}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Supported Imports</p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                                {RECOMMENDED_IMPORT_OPTIONS.map((option) => option.label).join(' • ')}
                            </p>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-slate-500">?</kbd> for keyboard shortcuts
                    </p>
                </div>
            </div>
        </div>
    );
}
