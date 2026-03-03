import React from 'react';
import { useTranslation } from 'react-i18next';
import { AISettings } from '../SettingsModal/AISettings';
import { BrandSettings } from '../SettingsModal/BrandSettings';
import { GeneralSettings } from '../SettingsModal/GeneralSettings';
import { PrivacySettings } from '../SettingsModal/PrivacySettings';
import { ShortcutsSettings } from '../SettingsModal/ShortcutsSettings';
import { SidebarItem } from '../ui/SidebarItem';

interface HomeSettingsViewProps {
    activeSettingsTab: 'brand' | 'general' | 'shortcuts' | 'privacy' | 'ai';
    onSettingsTabChange: (tab: 'brand' | 'general' | 'shortcuts' | 'privacy' | 'ai') => void;
}

export function HomeSettingsView({
    activeSettingsTab,
    onSettingsTabChange,
}: HomeSettingsViewProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden animate-in fade-in duration-300">
            <header className="px-8 py-6 border-b border-slate-100 bg-[var(--brand-surface)]">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('settings.title', 'Settings')}</h1>
            </header>

            <div className="flex-1 flex min-h-0 bg-[var(--brand-surface)]">
                <div className="w-48 border-r border-slate-100 p-2 space-y-1 overflow-y-auto">
                    <SidebarItem
                        isActive={activeSettingsTab === 'brand'}
                        onClick={() => onSettingsTabChange('brand')}
                    >
                        {t('settings.brand', 'Brand Kit')}
                    </SidebarItem>
                    <SidebarItem
                        isActive={activeSettingsTab === 'general'}
                        onClick={() => onSettingsTabChange('general')}
                    >
                        {t('settings.general', 'General')}
                    </SidebarItem>
                    <SidebarItem
                        isActive={activeSettingsTab === 'ai'}
                        onClick={() => onSettingsTabChange('ai')}
                    >
                        {t('settings.ai', 'Flowpilot AI')}
                    </SidebarItem>
                    <SidebarItem
                        isActive={activeSettingsTab === 'shortcuts'}
                        onClick={() => onSettingsTabChange('shortcuts')}
                    >
                        {t('settings.shortcuts', 'Shortcuts')}
                    </SidebarItem>
                    <SidebarItem
                        isActive={activeSettingsTab === 'privacy'}
                        onClick={() => onSettingsTabChange('privacy')}
                    >
                        {t('settings.privacy', 'Privacy')}
                    </SidebarItem>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-2xl">
                        {activeSettingsTab === 'brand' && <BrandSettings />}
                        {activeSettingsTab === 'general' && <GeneralSettings />}
                        {activeSettingsTab === 'ai' && <AISettings />}
                        {activeSettingsTab === 'shortcuts' && <ShortcutsSettings />}
                        {activeSettingsTab === 'privacy' && <PrivacySettings />}
                    </div>
                </div>
            </div>
        </div>
    );
}
