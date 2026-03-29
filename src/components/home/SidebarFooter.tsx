import React from 'react';
import { Moon, Sun, ChevronUp, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useVisualSettingsActions } from '@/store/viewHooks';

const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '/flags/us.svg' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '/flags/tr.svg' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '/flags/de.svg' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '/flags/fr.svg' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '/flags/es.svg' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '/flags/cn.svg' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '/flags/jp.svg' },
];

export function SidebarFooter(): React.ReactElement {
    const { i18n } = useTranslation();
    const { resolvedTheme, setTheme } = useTheme();
    const { setViewSettings } = useVisualSettingsActions();
    const [langOpen, setLangOpen] = React.useState(false);

    const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

    async function changeLanguage(code: string): Promise<void> {
        await i18n.changeLanguage(code);
        setViewSettings({ language: code });
        setLangOpen(false);
    }

    return (
        <div className="border-t border-[var(--color-brand-border)] px-3 py-3">
            <div className="flex items-center gap-1.5">
                {/* Language button — flag + name + chevron, fully clickable */}
                <div className="relative flex-1">
                    <button
                        onClick={() => setLangOpen((o) => !o)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--brand-text-muted)] transition-all hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                        title="Change language"
                    >
                        <img
                            src={currentLang.flag}
                            alt={currentLang.name}
                            className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
                        />
                        <span className="flex-1 text-left text-[11px] font-medium">
                            {currentLang.nativeName}
                        </span>
                        <ChevronUp
                            className={`h-3 w-3 shrink-0 transition-transform ${langOpen ? '' : 'rotate-180'}`}
                        />
                    </button>

                    {/* Language dropdown */}
                    {langOpen && (
                        <>
                            <button
                                type="button"
                                className="fixed inset-0 z-40"
                                onClick={() => setLangOpen(false)}
                                aria-label="Close language selector"
                            />
                            <div className="absolute bottom-full left-0 z-50 mb-2 w-44 origin-bottom-left animate-in fade-in zoom-in-95 duration-150 rounded-xl border border-[var(--color-brand-border)] bg-[var(--brand-surface)]/95 p-1 shadow-xl backdrop-blur-xl">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => changeLanguage(lang.code)}
                                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                                            lang.code === i18n.language
                                                ? 'bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
                                                : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={lang.flag}
                                                alt={lang.name}
                                                className="h-3.5 w-5 rounded-[2px] object-cover"
                                            />
                                            <span>{lang.nativeName}</span>
                                        </div>
                                        {lang.code === i18n.language && (
                                            <Check className="h-3 w-3 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Divider */}
                <div className="h-4 w-px bg-[var(--color-brand-border)]" />

                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--brand-text-muted)] transition-all hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                    title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {resolvedTheme === 'dark' ? (
                        <Sun className="h-4 w-4" />
                    ) : (
                        <Moon className="h-4 w-4" />
                    )}
                </button>
            </div>
        </div>
    );
}
