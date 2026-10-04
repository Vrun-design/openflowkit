import { useEffect, useRef, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { Button, Icon, IconButton, Popover } from '../design-system';
import { V2_TIPS, type V2TipId } from './v2FeatureTips';

/**
 * One hint beside the control it is about. Passive: it never takes focus or a key,
 * and only its buttons catch the pointer, so a gesture under it still reaches the canvas.
 */
export function V2FeatureTip({ id, onAction, onClose }: {
  readonly id: V2TipId;
  readonly onAction: () => void;
  readonly onClose: () => void;
}): React.JSX.Element | null {
  const tip = V2_TIPS[id];
  const anchor = useRef<HTMLElement | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [found, setFound] = useState(false);
  useEffect(() => {
    anchor.current = document.querySelector<HTMLElement>(tip.anchor);
    setFound(anchor.current !== null);
  }, [tip.anchor]);
  // Escape and any press elsewhere put it away; neither is consumed.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const onPointer = (event: PointerEvent) => {
      if (!layer.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, [onClose]);
  if (!found) return null;
  return (
    <Popover open passive anchorRef={anchor} onClose={onClose} placement={tip.placement} gap={10}
      className="ofk-v2-tip" data-tip={id}>
      <div ref={layer} className="ofk-v2-tip-body" aria-live="polite" aria-label="Tip">
        <span className="ofk-v2-tip-dot" aria-hidden="true" />
        <div>
          <strong>{tip.title}</strong>
          <p>{tip.text}</p>
          {tip.action ? <Button variant="secondary" onClick={onAction}>{tip.action}</Button> : null}
        </div>
        <IconButton variant="quiet" label="Dismiss tip" icon={<Icon icon={IconX} />} onClick={onClose} />
      </div>
    </Popover>
  );
}
