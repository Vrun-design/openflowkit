import React from 'react';
import { Book, Home, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OpenFlowLogo } from '../icons/OpenFlowLogo';
import { LanguageSelector } from '../LanguageSelector';
import { SidebarItem } from '../ui/SidebarItem';
import { APP_NAME } from '@/lib/brand';

interface HomeSidebarProps {
    activeTab: 'home' | 'settings';
    onTabChange: (tab: 'home' | 'settings') => void;
}

export function HomeSidebar({
    activeTab,
    onTabChange,
}: HomeSidebarProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <aside className="sticky top-0 z-20 flex w-full flex-col border-b border-slate-200 bg-[var(--brand-surface)] md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
            <div className="flex h-14 items-center gap-3 border-b border-slate-100 px-4">
                <OpenFlowLogo className="h-8 w-8 shrink-0" />

                <span className="font-semibold text-base tracking-tight text-slate-900 truncate">{APP_NAME}</span>

                <div className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-[var(--brand-primary-50)] border border-[var(--brand-primary-200)]">
                    <span className="text-[10px] font-extrabold text-[var(--brand-primary)] tracking-widest leading-none">BETA</span>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto p-3 md:block md:space-y-1">
                <SidebarItem
                    icon={<Home className="w-4 h-4" />}
                    isActive={activeTab === 'home'}
                    onClick={() => onTabChange('home')}
                    testId="sidebar-home"
                    className="min-w-fit md:min-w-0"
                >
                    {t('nav.home', 'Home')}
                </SidebarItem>
                <SidebarItem
                    icon={<Settings className="w-4 h-4" />}
                    isActive={activeTab === 'settings'}
                    onClick={() => onTabChange('settings')}
                    testId="sidebar-settings"
                    className="min-w-fit md:min-w-0"
                >
                    {t('nav.settings', 'Settings')}
                </SidebarItem>
                <SidebarItem
                    icon={<Book className="w-4 h-4" />}
                    to="https://docs.openflowkit.com"
                    testId="sidebar-docs"
                    className="min-w-fit md:min-w-0"
                >
                    {t('nav.documentation', 'Documentation')}
                </SidebarItem>
            </div>

            <div className="hidden p-4 md:mt-auto md:block md:space-y-3">
                <LanguageSelector variant="compact" placement="top" />
                <div className="border-t border-slate-100 pt-3">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        v1.0 BETA • {APP_NAME}
                    </div>
                </div>
            </div>
        </aside>
    );
}
