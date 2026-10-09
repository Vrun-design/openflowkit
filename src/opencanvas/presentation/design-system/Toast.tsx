import { useEffect, useRef, type ReactNode } from 'react';
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconX } from '@tabler/icons-react';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import type { StatusTone } from './Status';
import { foundation } from './tokens';
export interface ToastItem {
  id: string;
  tone?: StatusTone;
  title: string;
  description?: string;
  /** Undo/retry/open. Host owns the behavior. */
  action?: { label: string; onClick: () => void };
  /** Errors and conflicts persist until dismissed; informational toasts auto-dismiss. */
  persistent?: boolean;
}
const TONE_ICON: Partial<Record<StatusTone, typeof IconX>> = { success: IconCircleCheck, warning: IconAlertTriangle, danger: IconAlertCircle };

/** One live region for transient outcomes (saved, failed, conflict). Never for streaming progress. */
export function ToastRegion({
  items,
  onDismiss,
  dismissLabel = 'Dismiss',
  children,
}: {
  items: readonly ToastItem[];
  onDismiss: (id: string) => void;
  dismissLabel?: string;
  children?: ReactNode;
}) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    const timers = items
      .filter((t) => !t.persistent && t.tone !== 'danger' && t.tone !== 'warning')
      .map((t) =>
        window.setTimeout(() => dismissRef.current(t.id), foundation.motion.toastDuration)
      );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [items]);
  return (
    <div className="ofk-toasts" role="region" aria-label="Notifications">
      <div role="status" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div
            key={t.id}
            className="ofk-toast ofk-overlay"
            data-tone={t.tone ?? 'neutral'}
            style={{ '--ofk-origin': 'bottom center' } as React.CSSProperties}
          >
            {/* Only an outcome gets a mark; a neutral or informational note is just words. */}
            {t.tone && TONE_ICON[t.tone] ? <span className="ofk-toast-mark"><Icon icon={TONE_ICON[t.tone]!} /></span> : null}
            <div className="ofk-toast-text">
              <strong>{t.title}</strong>
              {t.description && <p>{t.description}</p>}
            </div>
            {t.action && (
              <Button variant="secondary" onClick={t.action.onClick}>
                {t.action.label}
              </Button>
            )}
            <IconButton
              variant="quiet"
              label={dismissLabel}
              icon={<Icon icon={IconX} />}
              onClick={() => onDismiss(t.id)}
            />
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
