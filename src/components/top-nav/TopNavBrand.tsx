import React from 'react';
import { useTranslation } from 'react-i18next';
import { OpenFlowLogo } from '../icons/OpenFlowLogo';
import { ShieldCheck } from 'lucide-react';
import { Tooltip } from '../Tooltip';

interface BrandUIConfig {
    showBeta?: boolean;
}

interface TopNavBrandProps {
    appName: string;
    logoUrl: string | null;
    logoStyle: 'icon' | 'text' | 'both' | 'wide';
    ui: BrandUIConfig;
}

export function TopNavBrand({ appName, logoUrl, logoStyle, ui }: TopNavBrandProps): React.ReactElement {
    const { t } = useTranslation();
    const showPrivacyBadge = ui.showBeta !== false;

    return (
        <div className="flex min-w-0 items-center gap-2">
            {(logoStyle === 'icon' || logoStyle === 'both') && (
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                        <OpenFlowLogo className="h-9 w-9" />
                    )}
                </div>
            )}

            {logoStyle === 'wide' && (
                <div className="h-8 flex-1 flex items-center justify-start text-[var(--brand-primary)] shrink-0 px-1 max-w-[180px] overflow-hidden">
                    {logoUrl ? (
                        <div className="flex items-center justify-start h-full">
                            <img
                                src={logoUrl}
                                alt="Logo"
                                className="h-[70%] w-auto max-w-full object-contain object-left"
                            />
                        </div>
                    ) : (
                        <Tooltip text={t('nav.uploadWideLogo', 'Upload a wide logo in Brand Settings to see it here')} side="bottom">
                            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--brand-primary-100)] px-3 py-1.5 opacity-80 transition-opacity hover:opacity-100 cursor-help">
                                <OpenFlowLogo className="h-4 w-4" />
                                <span className="text-xs font-semibold whitespace-nowrap">{t('nav.wideLogo', 'Your Wide Logo')}</span>
                            </div>
                        </Tooltip>
                    )}
                </div>
            )}

            {(logoStyle === 'text' || logoStyle === 'both') && (
                <div className="min-w-0 flex flex-col">
                    <span className="truncate text-base font-bold leading-none tracking-tight text-[var(--brand-text)] sm:text-lg">{appName}</span>
                </div>
            )}

            {showPrivacyBadge ? (
                <Tooltip text={t('nav.privacyMessage', { defaultValue: 'Your diagrams stay with you and do not reach our servers.' })} side="bottom">
                    <div className="hidden items-center justify-center text-[var(--brand-primary)] animate-in fade-in zoom-in-50 duration-300 sm:flex">
                        <ShieldCheck className="w-[18px] h-[18px] drop-shadow-sm text-white" fill="var(--brand-primary)" />
                    </div>
                </Tooltip>
            ) : null}
        </div>
    );
}
