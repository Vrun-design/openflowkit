import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X, Copy, Check, Link2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';

interface ShareModalParticipant {
    clientId: string;
    name: string;
    color: string;
    isLocal: boolean;
}

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCopyInvite: () => void;
    roomId: string;
    inviteUrl: string;
    status: 'realtime' | 'waiting' | 'fallback';
    viewerCount: number;
    participants?: ShareModalParticipant[];
}

function getStatusLabel(status: ShareModalProps['status'], t: ReturnType<typeof useTranslation>['t']): string {
    switch (status) {
        case 'realtime':
            return t('share.status.realtime', { defaultValue: 'Live sync' });
        case 'waiting':
            return t('share.status.waiting', { defaultValue: 'Connecting' });
        default:
            return t('share.status.fallback', { defaultValue: 'Local room' });
    }
}

export function ShareModal({
    isOpen,
    onClose,
    onCopyInvite,
    roomId,
    inviteUrl,
    status,
    viewerCount,
    participants = [],
}: ShareModalProps): React.JSX.Element | null {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const brandRadius = 'var(--brand-radius, 24px)';
    const primaryColor = 'var(--brand-primary, #6366f1)';
    const primary50Color = 'var(--brand-primary-50, #eef2ff)';

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

    const statusMessage = (() => {
        switch (status) {
            case 'realtime':
                return t('share.statusMessage.realtime', {
                    defaultValue: 'Anyone with this link can join the live canvas right away.',
                });
            case 'waiting':
                return t('share.statusMessage.waiting', {
                    defaultValue: 'The link is ready. Live sync is still connecting for this session.',
                });
            default:
                return t('share.statusMessage.fallback', {
                    defaultValue: 'This browser is in local-only mode right now. You can still copy the room link, but others will not join live until realtime sync is available.',
                });
        }
    })();

    function handleCopyLink(): void {
        onCopyInvite();
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-modal-title"
                aria-describedby="share-modal-description"
                data-testid="share-panel"
                className="w-full max-w-md overflow-hidden border border-slate-200/70 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
                style={{ borderRadius: brandRadius }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="relative p-6">
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95"
                        aria-label={t('share.close', { defaultValue: 'Close' })}
                    >
                        <X size={18} />
                    </button>

                    <div className="mb-6 flex flex-col items-center text-center">
                        <div
                            className="mb-4 flex h-12 w-12 items-center justify-center ring-8"
                            style={{
                                background: primary50Color,
                                color: primaryColor,
                                borderRadius: `calc(${brandRadius} * 0.75)`,
                                '--tw-ring-color': primary50Color,
                            } as React.CSSProperties}
                        >
                            <Share2 className="h-6 w-6" />
                        </div>

                        <h2 id="share-modal-title" className="text-xl font-bold tracking-tight text-slate-900">
                            {t('share.title', { defaultValue: 'Share live canvas' })}
                        </h2>
                        <p id="share-modal-description" className="mt-2 max-w-[300px] text-sm leading-relaxed text-slate-500">
                            {t('share.description', { defaultValue: 'Invite people with a room link so they can open this canvas and collaborate in the same workspace.' })}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                                <Users className="h-3.5 w-3.5" />
                                {viewerCount === 1
                                    ? t('share.viewerCount.one', { defaultValue: '1 person here' })
                                    : t('share.viewerCount.many', { defaultValue: '{{count}} people here', count: viewerCount })}
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                                <Link2 className="h-3.5 w-3.5" />
                                {getStatusLabel(status, t)}
                            </div>
                        </div>

                        {participants.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {participants.map((p) => (
                                    <div
                                        key={p.clientId}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                                    >
                                        <span
                                            className="h-3 w-3 rounded-full ring-2 ring-white"
                                            style={{ backgroundColor: p.color }}
                                        />
                                        <span>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="rounded-[calc(var(--brand-radius,24px)*0.5)] border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                {t('share.roomId', { defaultValue: 'Room' })}
                            </div>
                            <div className="mt-2 break-all font-mono text-sm text-slate-700">{roomId}</div>
                        </div>

                        <div className="rounded-[calc(var(--brand-radius,24px)*0.5)] border border-slate-200 bg-white px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                {t('share.link', { defaultValue: 'Invite link' })}
                            </div>
                            <div className="mt-2 rounded-[calc(var(--brand-radius,24px)*0.35)] border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="break-all font-mono text-xs leading-5 text-slate-700">{inviteUrl}</p>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{statusMessage}</p>
                        </div>

                        <Button
                            variant="primary"
                            onClick={handleCopyLink}
                            className={`w-full py-2.5 text-sm font-semibold transition-all ${copied ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                            icon={copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                            style={copied ? {} : { background: primaryColor, borderRadius: `calc(${brandRadius} * 0.6)` }}
                        >
                            {copied ? t('share.copied', { defaultValue: 'Copied invite link' }) : t('share.copyLink', { defaultValue: 'Copy invite link' })}
                        </Button>

                        <p className="text-center text-xs text-slate-400">
                            {t('share.localOnlyNote', { defaultValue: 'Your diagram stays browser-local unless you export it or share a live room.' })} {' '}
                            {t('share.copyFallback', { defaultValue: 'If clipboard access is blocked, copy the invite link above manually.' })}
                        </p>
                    </div>
                </div>
            </div>

            <button
                type="button"
                className="absolute inset-0 -z-10"
                onClick={onClose}
                aria-label={t('share.closeDialog', { defaultValue: 'Close share dialog' })}
            />
        </div>,
        document.body
    );
}
