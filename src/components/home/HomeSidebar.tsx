import React from 'react';
import { Book, Home, LayoutTemplate, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OpenFlowLogo } from '../icons/OpenFlowLogo';
import { SidebarFooter } from './SidebarFooter';
import { SidebarItem } from '../ui/SidebarItem';
import { APP_NAME } from '@/lib/brand';

type HomeSidebarTab = 'home' | 'templates' | 'settings';

interface HomeSidebarProps {
    activeTab: HomeSidebarTab;
    onTabChange: (tab: HomeSidebarTab) => void;
}

export function HomeSidebar({
    activeTab,
    onTabChange,
}: HomeSidebarProps): React.ReactElement {
    const { t } = useTranslation();
    const navigationItems: Array<{
        icon: React.ReactNode;
        label: string;
        tab?: HomeSidebarTab;
        testId: string;
        to?: string;
    }> = [
        {
            icon: <Home className="w-4 h-4" />,
            label: t('nav.home', 'Home'),
            tab: 'home',
            testId: 'sidebar-home',
        },
        {
            icon: <LayoutTemplate className="w-4 h-4" />,
            label: t('nav.templates', 'Templates'),
            tab: 'templates',
            testId: 'sidebar-templates',
        },
        {
            icon: <Settings className="w-4 h-4" />,
            label: t('nav.settings', 'Settings'),
            tab: 'settings',
            testId: 'sidebar-settings',
        },
        {
            icon: <Book className="w-4 h-4" />,
            label: t('nav.documentation', 'Documentation'),
            testId: 'sidebar-docs',
            to: 'https://docs.openflowkit.com',
        },
    ];

    return (
        <aside className="sticky top-0 z-20 flex w-full flex-col border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)] md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
            <div className="flex h-14 items-center gap-3 border-b border-[var(--color-brand-border)] px-4">
                <OpenFlowLogo className="h-8 w-8 shrink-0" />

                <span className="font-semibold text-base tracking-tight text-[var(--brand-text)] truncate">{APP_NAME}</span>

                <div className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-[var(--brand-surface-hover)] border border-[var(--color-brand-border)]">
                    <span className="text-[10px] font-medium text-[var(--brand-text-muted)] tracking-wide leading-none">v1.0</span>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto p-3 md:block md:flex-1 md:space-y-5 md:overflow-y-auto">
                <div className="flex gap-2 md:block md:space-y-1">
                    {navigationItems.map((item) => (
                        <SidebarItem
                            key={item.testId}
                            icon={item.icon}
                            isActive={item.tab ? activeTab === item.tab : false}
                            onClick={item.tab ? () => onTabChange(item.tab) : undefined}
                            to={item.to}
                            testId={item.testId}
                            className="min-w-fit md:min-w-0"
                        >
                            {item.label}
                        </SidebarItem>
                    ))}
                </div>
            </div>

            <div className="hidden md:mt-auto md:block">
                <SidebarFooter />
            </div>
        </aside>
    );
}
