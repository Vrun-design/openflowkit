import React from 'react';
import { NavLink, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { docsNavigation } from './docsData';
import { Book, ArrowLeft } from 'lucide-react';
import { LanguageSelector } from '../LanguageSelector';
import { SidebarItem } from '../ui/SidebarItem';
import { useBrandConfig } from '@/store/brandHooks';

interface DocsSidebarProps {
    className?: string;
    onClose?: () => void;
}

export const DocsSidebar: React.FC<DocsSidebarProps> = ({ className = '', onClose }) => {
    const { t, i18n } = useTranslation();
    const brandConfig = useBrandConfig();
    const { lang } = useParams();
    const currentLang = lang || i18n.language || 'en';

    return (
        <aside className={`w-64 border-r border-slate-200 bg-[var(--brand-surface)] flex flex-col h-full fixed inset-y-0 left-0 z-20 transition-transform duration-300 lg:translate-x-0 ${className}`}>
            <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
                <Link
                    to="/home"
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                    title={t('docs.returnToDashboard', 'Back to dashboard')}
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>

                <div className="w-px h-4 bg-slate-200"></div>

                <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <div className="p-1 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                        <Book className="w-3.5 h-3.5" />
                    </div>
                    <span>{t('docs.documentation')}</span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {docsNavigation.map((section, idx) => (
                    <div key={`${section.title}-${idx}`}>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                            {section.title}
                        </h3>
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <SidebarItem
                                    key={item.slug}
                                    to={`/docs/${currentLang}/${item.slug}`}
                                    onClick={onClose}
                                >
                                    {item.title.replace(/FlowMind|OpenFlowKit/g, brandConfig.appName)}
                                </SidebarItem>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="p-4 space-y-3">
                <div className="hidden lg:block">
                    <LanguageSelector variant="compact" placement="top" />
                </div>
                <div className="border-t border-slate-100 pt-3">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {brandConfig.appName} Docs v1.0
                    </div>
                </div>
            </div>
        </aside>
    );
};
