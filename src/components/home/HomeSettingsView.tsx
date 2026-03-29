import React from 'react';
import { FLOWPILOT_NAME } from '@/lib/brand';
import { useTranslation } from 'react-i18next';
import { AISettings } from '../SettingsModal/AISettings';
import { CanvasSettings } from '../SettingsModal/CanvasSettings';
import { GeneralSettings } from '../SettingsModal/GeneralSettings';
import { ShortcutsSettings } from '../SettingsModal/ShortcutsSettings';
import { SidebarItem } from '../ui/SidebarItem';

type HomeSettingsTab = 'general' | 'canvas' | 'shortcuts' | 'ai';

interface HomeSettingsViewProps {
    activeSettingsTab: HomeSettingsTab;
    onSettingsTabChange: (tab: HomeSettingsTab) => void;
}

export function HomeSettingsView({
    activeSettingsTab,
    onSettingsTabChange,
}: HomeSettingsViewProps): React.ReactElement {
    const { t } = useTranslation();
    const settingsTabs: Array<{ key: HomeSettingsTab; label: string }> = [
        { key: 'general', label: t('settings.general', 'General') },
        { key: 'canvas', label: t('settings.canvas', 'Canvas') },
        { key: 'ai', label: t('settings.ai', FLOWPILOT_NAME) },
        { key: 'shortcuts', label: t('settings.shortcuts', 'Shortcuts') },
    ];

    function renderSettingsPanel(): React.ReactElement {
        switch (activeSettingsTab) {
            case 'general':
                return <GeneralSettings />;
            case 'canvas':
                return <CanvasSettings />;
            case 'ai':
                return <AISettings />;
            case 'shortcuts':
                return <ShortcutsSettings />;
        }
    }

    return (
        <div className="flex min-h-screen flex-1 flex-col overflow-hidden animate-in fade-in duration-300">
            <header className="border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-4 py-4 sm:px-6 md:px-8 md:py-6">
                <h1 className="text-xl font-bold text-[var(--brand-text)] tracking-tight">{t('settings.title', 'Settings')}</h1>
            </header>

            <div className="flex min-h-0 flex-1 flex-col bg-[var(--brand-surface)] md:flex-row">
                <div className="flex gap-2 overflow-x-auto border-b border-[var(--color-brand-border)] p-2 md:w-48 md:block md:space-y-1 md:overflow-y-auto md:border-b-0 md:border-r">
                    {settingsTabs.map((tab) => (
                        <SidebarItem
                            key={tab.key}
                            isActive={activeSettingsTab === tab.key}
                            onClick={() => onSettingsTabChange(tab.key)}
                            className="min-w-fit md:min-w-0"
                        >
                            {tab.label}
                        </SidebarItem>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                    <div className="max-w-2xl">{renderSettingsPanel()}</div>
                </div>
            </div>
        </div>
    );
}
