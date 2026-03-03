import { useEffect, useState } from 'react';
import type { i18n as I18nInstance } from 'i18next';

interface UseDocsLayoutStateParams {
    pathname: string;
    navigate: (path: string, options?: { replace?: boolean }) => void;
    i18n: I18nInstance;
    lang?: string;
}

interface UseDocsLayoutStateResult {
    mobileMenuOpen: boolean;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
}

export function useDocsLayoutState({
    pathname,
    navigate,
    i18n,
    lang,
}: UseDocsLayoutStateParams): UseDocsLayoutStateResult {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (pathname !== '/docs' && pathname !== '/docs/') return;
        const currentLang = i18n.language === 'en' || i18n.language === 'tr' ? i18n.language : 'en';
        navigate(`/docs/${currentLang}/ask-flowpilot`, { replace: true });
    }, [pathname, navigate, i18n.language]);

    useEffect(() => {
        if (lang && lang !== i18n.language) {
            i18n.changeLanguage(lang);
        }
    }, [lang, i18n]);

    function toggleMobileMenu(): void {
        setMobileMenuOpen((value) => !value);
    }

    function closeMobileMenu(): void {
        setMobileMenuOpen(false);
    }

    return { mobileMenuOpen, toggleMobileMenu, closeMobileMenu };
}
