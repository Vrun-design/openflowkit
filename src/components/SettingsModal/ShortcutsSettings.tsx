import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getKeyboardShortcuts, isMacLikePlatform } from '../../constants';

export const ShortcutsSettings = () => {
    const { t } = useTranslation();
    const keyboardShortcuts = useMemo(
        () => getKeyboardShortcuts(typeof navigator !== 'undefined' && isMacLikePlatform(navigator.platform || navigator.userAgent)),
        []
    );
    return (
        <div className="space-y-8">
            {keyboardShortcuts.map((section) => (
                <div key={section.title} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">{t(section.title)}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {section.items.map((item) => (
                            <div key={item.label} className="group flex items-center justify-between rounded-[var(--radius-sm)] p-2 transition-colors hover:bg-slate-50/50">
                                <span className="text-slate-600 text-sm font-medium">{t(item.label)}</span>
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                    {item.shortcuts.map((shortcut, shortcutIndex) => (
                                        <React.Fragment key={`${item.label}-${shortcutIndex}`}>
                                            {shortcutIndex > 0 ? <span className="text-[10px] font-semibold uppercase text-slate-300">/</span> : null}
                                            <div className="flex gap-1">
                                                {shortcut.map((key, keyIndex) => (
                                                    <kbd key={`${item.label}-${shortcutIndex}-${keyIndex}`} className="min-w-[24px] rounded-[var(--radius-xs)] border border-slate-200 bg-white px-2 py-1 text-center text-xs font-semibold text-slate-500 shadow-sm">
                                                        {key}
                                                    </kbd>
                                                ))}
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <div className="text-xs text-slate-400 text-center pt-4">
                {t('settingsModal.shortcutsHint')}
            </div>
        </div>
    );
};
