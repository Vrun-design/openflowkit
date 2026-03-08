import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCopyInvite: () => void;
    roomId: string;
    cacheState: 'unavailable' | 'syncing' | 'ready' | 'hydrated';
    status: 'realtime' | 'waiting' | 'fallback';
    viewerCount: number;
}

function getCollaborationModeSummary(status: ShareModalProps['status']): {
    titleKey: string;
    titleFallback: string;
    bodyKey: string;
    bodyFallback: string;
    toneClassName: string;
} {
    switch (status) {
        case 'realtime':
            return {
                titleKey: 'share.mode.realtime.title',
                titleFallback: 'Realtime sync active',
                bodyKey: 'share.mode.realtime.body',
                bodyFallback: 'Peers who open this link can see live updates and cursors over the current peer transport.',
                toneClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
            };
        case 'waiting':
            return {
                titleKey: 'share.mode.waiting.title',
                titleFallback: 'Connecting to realtime sync',
                bodyKey: 'share.mode.waiting.body',
                bodyFallback: 'This canvas is still trying to establish live peer sync. If it cannot, the session will stay local-only in this browser.',
                toneClassName: 'border-amber-200 bg-amber-50 text-amber-800',
            };
        default:
            return {
                titleKey: 'share.mode.fallback.title',
                titleFallback: 'Local-only collaboration',
                bodyKey: 'share.mode.fallback.body',
                bodyFallback: 'Without a backend relay or supported peer transport, this session does not provide durable multi-user live sync outside the current browser runtime.',
                toneClassName: 'border-slate-200 bg-slate-50 text-slate-700',
            };
    }
}

function getCacheSummary(cacheState: ShareModalProps['cacheState']): {
    titleKey: string;
    titleFallback: string;
    bodyKey: string;
    bodyFallback: string;
    toneClassName: string;
} {
    switch (cacheState) {
        case 'syncing':
            return {
                titleKey: 'share.cache.syncing.title',
                titleFallback: 'Local room cache syncing',
                bodyKey: 'share.cache.syncing.body',
                bodyFallback: 'This browser is still restoring any IndexedDB-cached room state before peer sync fully settles.',
                toneClassName: 'border-amber-200 bg-amber-50 text-amber-800',
            };
        case 'hydrated':
            return {
                titleKey: 'share.cache.hydrated.title',
                titleFallback: 'Recovered from local cache',
                bodyKey: 'share.cache.hydrated.body',
                bodyFallback: 'This room already had locally cached state in this browser, so the canvas could restore before peers reconnected.',
                toneClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
            };
        case 'ready':
            return {
                titleKey: 'share.cache.ready.title',
                titleFallback: 'Local cache ready',
                bodyKey: 'share.cache.ready.body',
                bodyFallback: 'This browser can keep a local IndexedDB copy of the room for reload and offline recovery in this device.',
                toneClassName: 'border-sky-200 bg-sky-50 text-sky-800',
            };
        default:
            return {
                titleKey: 'share.cache.unavailable.title',
                titleFallback: 'No local room cache',
                bodyKey: 'share.cache.unavailable.body',
                bodyFallback: 'This collaboration session is not using browser IndexedDB room persistence right now.',
                toneClassName: 'border-slate-200 bg-slate-50 text-slate-700',
            };
    }
}

export function ShareModal({
    isOpen,
    onClose,
    onCopyInvite,
    roomId,
    cacheState,
    status,
    viewerCount,
}: ShareModalProps): React.JSX.Element | null {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const brandRadius = 'var(--brand-radius, 24px)';
    const primaryColor = 'var(--brand-primary, #6366f1)';
    const primary50Color = 'var(--brand-primary-50, #eef2ff)';
    const modeSummary = getCollaborationModeSummary(status);
    const cacheSummary = getCacheSummary(cacheState);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        closeButtonRef.current?.focus();

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    function handleCopyLink(): void {
        onCopyInvite();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-modal-title"
                className="bg-white shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200/50 animate-in zoom-in-95 duration-200"
                style={{ borderRadius: brandRadius }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 relative">
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                        aria-label={t('share.close', 'Close')}
                    >
                        <X size={18} />
                    </button>

                    <div className="flex flex-col items-center text-center mt-2 mb-6">
                        <div
                            className="w-12 h-12 flex items-center justify-center mb-4 ring-8"
                            style={{
                                background: primary50Color,
                                color: primaryColor,
                                borderRadius: `calc(${brandRadius} * 0.75)`,
                                '--tw-ring-color': primary50Color,
                            } as React.CSSProperties}
                        >
                            <Share2 className="w-6 h-6" />
                        </div>

                        <h2
                            id="share-modal-title"
                            className="text-xl font-bold text-slate-900 mb-1 tracking-tight"
                            style={{ fontFamily: 'var(--brand-font-family, inherit)' }}
                        >
                            {t('share.title', 'Collaboration Link')}
                        </h2>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-[260px]">
                            {t('share.description', 'Copy a collaboration link for this live canvas session. This does not package the diagram into the URL.')}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className={`rounded-[calc(${brandRadius}*0.5)] border px-3 py-3 text-left text-sm ${modeSummary.toneClassName}`}>
                            <div className="font-semibold">{t(modeSummary.titleKey, modeSummary.titleFallback)}</div>
                            <p className="mt-1 text-xs leading-relaxed opacity-90">{t(modeSummary.bodyKey, modeSummary.bodyFallback)}</p>
                            <p className="mt-2 text-[11px] font-medium opacity-80">
                                {viewerCount === 1
                                    ? t('share.viewerCount.one', '1 viewer in this session.')
                                    : t('share.viewerCount.many', '{{count}} viewers in this session.', { count: viewerCount })}
                            </p>
                        </div>

                        <div className={`rounded-[calc(${brandRadius}*0.5)] border px-3 py-3 text-left text-sm ${cacheSummary.toneClassName}`}>
                            <div className="font-semibold">{t(cacheSummary.titleKey, cacheSummary.titleFallback)}</div>
                            <p className="mt-1 text-xs leading-relaxed opacity-90">{t(cacheSummary.bodyKey, cacheSummary.bodyFallback)}</p>
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                                {t('share.roomLink', 'Collaboration Link')}
                            </label>
                            <div className="flex items-center gap-2">
                            <div
                                tabIndex={0}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 font-mono truncate select-all outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                            >
                                {roomId}
                            </div>
                        </div>
                    </div>

                        <Button
                            variant="primary"
                            onClick={handleCopyLink}
                            className={`w-full py-2.5 text-sm font-semibold transition-all ${copied ? 'bg-emerald-500 hover:bg-emerald-600' : ''
                                }`}
                            icon={copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                            style={copied ? {} : {
                                background: primaryColor,
                                borderRadius: `calc(${brandRadius} * 0.6)`,
                            }}
                        >
                            {copied ? t('share.copied', 'Copied Link!') : t('share.copyLink', 'Copy Link')}
                        </Button>

                        <p className="text-center text-slate-400 text-xs mt-4">
                            {t('share.permissionsNote', 'Anyone with the link can join.')}<br />
                            <span className="opacity-70 italic text-[10px]">
                                {t('share.permissionsNoteSecondary', 'This link opens the live collaboration room only. Use export for portable file sharing or backup.')}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Backdrop click to close */}
            <button
                type="button"
                className="absolute inset-0 -z-10"
                onClick={onClose}
                aria-label={t('share.closeDialog', 'Close share dialog')}
            />
        </div>,
        document.body
    );
}
