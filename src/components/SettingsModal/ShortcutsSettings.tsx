import React from 'react';
import { KEYBOARD_SHORTCUTS } from '../../constants';

export const ShortcutsSettings = () => {
    return (
        <div className="space-y-8">
            {KEYBOARD_SHORTCUTS.map((section) => (
                <div key={section.title} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">{section.title}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {section.items.map((item) => (
                            <div key={item.label} className="flex items-center justify-between group p-2 hover:bg-slate-50/50 rounded-lg transition-colors">
                                <span className="text-slate-600 text-sm font-medium">{item.label}</span>
                                <div className="flex gap-1">
                                    {item.keys.map((key, i) => (
                                        <kbd key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-500 min-w-[24px] text-center shadow-sm">
                                            {key}
                                        </kbd>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <div className="text-xs text-slate-400 text-center pt-4">
                You can also press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded mx-1 font-sans">?</kbd> to view these anytime.
            </div>
        </div>
    );
};
