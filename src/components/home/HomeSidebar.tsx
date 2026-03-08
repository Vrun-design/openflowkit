import React from 'react';
import { Book, Home, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OpenFlowLogo } from '../icons/OpenFlowLogo';
import { LanguageSelector } from '../LanguageSelector';
import { SidebarItem } from '../ui/SidebarItem';
import type { BrandConfig } from '@/store';

interface HomeSidebarProps {
    brandConfig: BrandConfig;
    activeTab: 'home' | 'settings';
    onTabChange: (tab: 'home' | 'settings') => void;
}

export function HomeSidebar({
    brandConfig,
    activeTab,
    onTabChange,
}: HomeSidebarProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <aside className="w-64 border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-20 bg-[var(--brand-surface)]">
            <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-100">
                {(brandConfig.logoStyle === 'icon' || brandConfig.logoStyle === 'both' || !brandConfig.logoStyle) && (
                    <div className="w-8 h-8 flex items-center justify-center bg-[var(--brand-primary)]/10 rounded-lg text-[var(--brand-primary)] overflow-hidden shrink-0">
                        {brandConfig.logoUrl ? (
                            <img src={brandConfig.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                            <OpenFlowLogo className="w-5 h-5" />
                        )}
                    </div>
                )}

                {brandConfig.logoStyle === 'wide' && (
                    <div className="h-8 flex-1 flex items-center justify-start overflow-hidden">
                        {brandConfig.logoUrl ? (
                            <img src={brandConfig.logoUrl} alt="Logo" className="h-[70%] w-auto object-contain max-w-[180px]" />
                        ) : (
                            <span className="text-sm font-semibold text-[var(--brand-primary)] truncate">Wide Logo</span>
                        )}
                    </div>
                )}

                {(brandConfig.logoStyle === 'text' || brandConfig.logoStyle === 'both' || !brandConfig.logoStyle) && (
                    <span className="font-semibold text-base tracking-tight text-slate-900 truncate">{brandConfig.appName}</span>
                )}

                {(brandConfig.ui.showBeta ?? true) && (
                    <div className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-[var(--brand-primary-50)] border border-[var(--brand-primary-200)]">
                        <span className="text-[10px] font-extrabold text-[var(--brand-primary)] tracking-widest leading-none">BETA</span>
                    </div>
                )}
            </div>

            <div className="p-3 space-y-1">
                <SidebarItem
                    icon={<Home className="w-4 h-4" />}
                    isActive={activeTab === 'home'}
                    onClick={() => onTabChange('home')}
                    testId="sidebar-home"
                >
                    {t('nav.home', 'Home')}
                </SidebarItem>
                <SidebarItem
                    icon={<Settings className="w-4 h-4" />}
                    isActive={activeTab === 'settings'}
                    onClick={() => onTabChange('settings')}
                    testId="sidebar-settings"
                >
                    {t('nav.settings', 'Settings')}
                </SidebarItem>
                <SidebarItem
                    icon={<Book className="w-4 h-4" />}
                    to="/docs"
                    testId="sidebar-docs"
                >
                    {t('nav.documentation', 'Documentation')}
                </SidebarItem>
            </div>

            <div className="mt-auto p-4 space-y-3">
                <LanguageSelector variant="compact" placement="top" />
                <div className="border-t border-slate-100 pt-3">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        v1.0 BETA • {brandConfig.appName}
                    </div>
                </div>
            </div>
        </aside>
    );
}
