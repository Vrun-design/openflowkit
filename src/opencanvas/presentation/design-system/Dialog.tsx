import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import { IconButton } from './Button';
import { Icon } from './Icon';
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Primary/secondary actions; host owns confirmation semantics for destructive work. */
  actions?: ReactNode;
  /** Sheet slides from the bottom; a dialog also becomes a sheet on narrow viewports. */
  variant?: 'dialog' | 'sheet';
  closeLabel?: string;
}
/** Native <dialog>: modal focus trap, inert background, Escape and focus return come from the platform. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  variant = 'dialog',
  closeLabel = 'Close',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const generated = useId();
  const titleId = `${generated}-title`;
  const descriptionId = `${generated}-description`;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="ofk-dialog ofk-overlay"
      data-variant={variant}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // backdrop
      }}
    >
      <div className="ofk-dialog-body">
        <header className="ofk-dialog-header">
          <h2 id={titleId} className="ofk-title">
            {title}
          </h2>
          <IconButton
            variant="quiet"
            label={closeLabel}
            icon={<Icon icon={IconX} />}
            onClick={onClose}
          />
        </header>
        {description && (
          <p id={descriptionId} className="ofk-dialog-description">
            {description}
          </p>
        )}
        {children}
        {actions && <footer className="ofk-dialog-actions">{actions}</footer>}
      </div>
    </dialog>
  );
}
