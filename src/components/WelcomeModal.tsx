import React, { useState } from 'react';
import { X, Layout, Shield } from 'lucide-react';
import { OpenFlowLogo } from './icons/OpenFlowLogo';
import { useBrandButtonStyle } from '@/store/brandHooks';
import { useViewSettings, useVisualSettingsActions } from '@/store/viewHooks';
import { useTranslation } from 'react-i18next';
import { writeLocalStorageString } from '@/services/storage/uiLocalStorage';
import { shouldShowWelcomeModal, WELCOME_SEEN_STORAGE_KEY } from './home/welcomeModalState';

export function WelcomeModal(): React.JSX.Element | null {
    const { t } = useTranslation();
    const buttonStyle = useBrandButtonStyle();
    const isBeveled = buttonStyle === 'beveled';
    const [isOpen, setIsOpen] = useState(() => shouldShowWelcomeModal());
    const { analyticsEnabled } = useViewSettings();
    const { toggleAnalytics } = useVisualSettingsActions();

    // Track opt-in state locally for instant UI updates, persist on close
    const [allowAnalytics, setAllowAnalytics] = useState(analyticsEnabled);

    const handleClose = () => {
        setIsOpen(false);
        writeLocalStorageString(WELCOME_SEEN_STORAGE_KEY, 'true');
        // Persist local choice to both the legacy key and the actual app state
        writeLocalStorageString('openflowkit_analytics_opt_in', allowAnalytics ? 'true' : 'false');
        toggleAnalytics(allowAnalytics);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/10 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div
                className="bg-white shadow-2xl max-w-md w-full overflow-hidden border border-slate-200/50 animate-in zoom-in duration-300"
                style={{ borderRadius: 'var(--brand-radius, 24px)' }}
            >
                <div className="p-8 relative">
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex flex-col items-center text-center mt-4">
                        <div
                            className="w-14 h-14 flex items-center justify-center mb-6 ring-8"
                            style={{
                                background: 'var(--brand-primary-50, #eef2ff)',
                                color: 'var(--brand-primary, #6366f1)',
                                borderRadius: 'calc(var(--brand-radius, 24px) * 0.75)',
                                '--tw-ring-color': 'var(--brand-primary-50, #eef2ff)'
                            } as React.CSSProperties}
                        >
                            <OpenFlowLogo className="w-7 h-7" />
                        </div>

                        <h2
                            className="text-2xl font-bold text-slate-900 mb-2 tracking-tight"
                            style={{ fontFamily: 'var(--brand-font-family, inherit)' }}
                        >
                            {t('welcome.title', 'OpenFlowKit')}
                        </h2>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-[280px]">
                            {t('welcome.description', 'Design beautiful, structured diagrams with a developer-first canvas.')}
                        </p>
                    </div>

                    <div className="space-y-5 mb-8">
                        <FeatureItem
                            icon={<Layout className="w-5 h-5" />}
                            title={t('welcome.features.beautifulByDefault', 'Beautiful by Default')}
                            desc={t('welcome.features.automatedLayouts', 'Automated layouts and professional themes.')}
                        />
                        <FeatureItem
                            icon={<Shield className="w-5 h-5" />}
                            title={t('welcome.features.privateSecure', 'Private & Secure')}
                            desc={t('welcome.features.localFirst', 'Local-first architecture keeps your data safe.')}
                        />
                    </div>

                    <AnalyticsToggle
                        allowAnalytics={allowAnalytics}
                        onChange={setAllowAnalytics}
                    />

                    <WelcomeFooter
                        isBeveled={isBeveled}
                        onGetStarted={handleClose}
                    />

                    <p className="text-center text-slate-400 text-[10px] mt-6 uppercase tracking-widest font-semibold">
                        {t('welcome.press', 'Press')} <kbd className="font-sans px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500">?</kbd> {t('welcome.shortcuts', 'for shortcuts')}
                    </p>
                </div>
            </div>
        </div>
    );
}

interface FeatureItemProps {
    icon: React.ReactNode;
    title: string;
    desc: string;
}

function FeatureItem({ icon, title, desc }: FeatureItemProps): React.JSX.Element {
    return (
        <div
            className="flex gap-4 items-center p-3 transition-colors group"
            style={{ borderRadius: 'calc(var(--brand-radius, 24px) * 0.5)' }}
        >
            <div
                className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{
                    background: 'var(--brand-primary-50, #f8fafc)',
                    color: 'var(--brand-primary, #6366f1)',
                    borderRadius: 'calc(var(--brand-radius, 24px) * 0.4)'
                }}
            >
                {icon}
            </div>
            <div className="text-left">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500">{desc}</p>
            </div>
        </div>
    );
}

interface AnalyticsToggleProps {
    allowAnalytics: boolean;
    onChange: (val: boolean) => void;
}

function AnalyticsToggle({ allowAnalytics, onChange }: AnalyticsToggleProps): React.JSX.Element {
    const { t } = useTranslation();
    return (
        <div className={`mb-8 flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-300 ${allowAnalytics ? 'bg-[var(--brand-primary-50,#eef2ff)]/50 border-[var(--brand-primary,#6366f1)]/30' : 'bg-slate-50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] border-slate-200'}`}>
            <div className="flex items-center justify-center shrink-0">
                <label className="relative flex items-center justify-center cursor-pointer">
                    <input
                        id="analytics-opt-in"
                        type="checkbox"
                        checked={allowAnalytics}
                        onChange={(e) => onChange(e.target.checked)}
                        className="peer sr-only"
                    />
                    <div className={`w-[34px] h-5 rounded-full transition-colors duration-300 ${allowAnalytics ? 'bg-[var(--brand-primary,#6366f1)]' : 'bg-slate-300'}`}></div>
                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 transform shadow-sm ${allowAnalytics ? 'translate-x-[14px]' : 'translate-x-0'}`}></div>
                </label>
            </div>
            <label
                htmlFor="analytics-opt-in"
                className="flex-1 select-none cursor-pointer flex flex-col justify-center"
            >
                <span className="text-[13px] font-semibold text-slate-900 leading-none mb-1">
                    {t('welcome.analyticsTitle', 'Help improve OpenFlowKit')}
                </span>
                <p className="text-[11px] text-slate-500 leading-tight pr-2">
                    {t('welcome.analyticsDesc', 'Share anonymous basic usage data (optional)')}
                </p>
            </label>
        </div>
    );
}

interface WelcomeFooterProps {
    isBeveled: boolean;
    onGetStarted: () => void;
}

function WelcomeFooter({ isBeveled, onGetStarted }: WelcomeFooterProps): React.JSX.Element {
    const { t } = useTranslation();
    return (
        <div className="mt-4 flex flex-col gap-3">
            <button
                onClick={onGetStarted}
                className={`w-full py-3.5 text-white font-bold transition-all active:scale-[0.98] hover:-translate-y-0.5 ${isBeveled ? 'shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.4),inset_0px_-2px_0px_0px_rgba(0,0,0,0.2),0px_10px_15px_-3px_rgba(0,0,0,0.1)] border border-white/20' : 'shadow-lg hover:shadow-xl'}`}
                style={{
                    background: 'var(--brand-primary, #6366f1)',
                    borderRadius: 'calc(var(--brand-radius, 24px) * 0.6)'
                }}
            >
                {t('common.getStarted', 'Get Started')}
            </button>

            <a
                href="/docs/en/quick-start"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-slate-500 hover:text-[var(--brand-primary)] text-center w-full transition-colors"
            >
                Read the Quick Start Guide →
            </a>
        </div>
    );
}
