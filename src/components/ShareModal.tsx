import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { getShareStatusDefaultMessage, SHARE_MODAL_COPY, type ShareModalStatus } from './shareModalContent';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCopyInvite: () => void;
    roomId: string;
    inviteUrl: string;
    status: 'realtime' | 'waiting' | 'fallback';
    viewerCount: number;
    participants?: Array<{
        clientId: string;
        name: string;
        color: string;
        isLocal: boolean;
    }>;
}

function getShareStatusMessage(
    status: ShareModalStatus,
    t: ReturnType<typeof useTranslation>['t']
): string {
    return t(`share.statusMessage.${status}`, {
        defaultValue: getShareStatusDefaultMessage(status),
    });
}

export function ShareModal({
    isOpen,
    onClose,
    onCopyInvite,
    roomId,
    inviteUrl,
    status,
    viewerCount: _viewerCount,
    participants: _participants = [],
}: ShareModalProps): React.JSX.Element | null {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const modalRadius = 'var(--radius-xl)';
    const sectionRadius = 'var(--radius-md)';
    const fieldRadius = 'var(--radius-sm)';
    const primaryColor = 'var(--brand-primary, #6366f1)';
    const primary50Color = 'var(--brand-primary-50, #eef2ff)';
    const statusMessage = getShareStatusMessage(status, t);

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
                className="w-full max-w-md overflow-hidden border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200"
                style={{ borderRadius: modalRadius }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="relative p-6">
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="absolute right-5 top-5 rounded-full p-2 text-[var(--brand-secondary)] transition-all hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)] active:scale-95"
                        aria-label={t('share.close', { defaultValue: SHARE_MODAL_COPY.close })}
                    >
                        <X size={18} />
                    </button>

                    <div className="mb-6 flex flex-col items-center text-center">
                        <div
                            className="mb-4 flex h-12 w-12 items-center justify-center ring-8"
                            style={{
                                background: primary50Color,
                                color: primaryColor,
                                borderRadius: sectionRadius,
                                '--tw-ring-color': primary50Color,
                            } as React.CSSProperties}
                        >
                            <Share2 className="h-6 w-6" />
                        </div>

                        <h2 id="share-modal-title" className="text-xl font-bold tracking-tight text-[var(--brand-text)]">
                            {t('share.title', { defaultValue: SHARE_MODAL_COPY.title })}
                            <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                {t('share.betaBadge', { defaultValue: SHARE_MODAL_COPY.betaBadge })}
                            </span>
                        </h2>
                        <p id="share-modal-description" className="mt-2 max-w-[300px] text-sm leading-relaxed text-[var(--brand-secondary)]">
                            {t('share.description', { defaultValue: SHARE_MODAL_COPY.description })}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-secondary)]">
                                {t('share.roomId', { defaultValue: SHARE_MODAL_COPY.roomLabel })}
                            </div>
                            <div className="mt-2 break-all font-mono text-sm text-[var(--brand-text)]">{roomId}</div>
                        </div>

                        <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-secondary)]">
                                {t('share.link', { defaultValue: SHARE_MODAL_COPY.linkLabel })}
                            </div>
                            <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-3 py-2">
                                <p className="break-all font-mono text-xs leading-5 text-[var(--brand-text)]">{inviteUrl}</p>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-[var(--brand-secondary)]">{statusMessage}</p>
                        </div>

                        <Button
                            variant="primary"
                            onClick={handleCopyLink}
                            className={`w-full py-2.5 text-sm font-semibold transition-all ${copied ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                            icon={copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                            style={copied ? {} : { background: primaryColor, borderRadius: fieldRadius }}
                        >
                            {copied
                                ? t('share.copied', { defaultValue: SHARE_MODAL_COPY.copiedLink })
                                : t('share.copyLink', { defaultValue: SHARE_MODAL_COPY.copyLink })}
                        </Button>

                        <p className="text-center text-xs text-[var(--brand-secondary)]">
                            {t('share.footerNote', { defaultValue: SHARE_MODAL_COPY.footerNote })}
                        </p>
                    </div>
                </div>
            </div>

            <button
                type="button"
                className="absolute inset-0 -z-10"
                onClick={onClose}
                aria-label={t('share.closeDialog', { defaultValue: SHARE_MODAL_COPY.closeDialog })}
            />
        </div>,
        document.body
    );
}
