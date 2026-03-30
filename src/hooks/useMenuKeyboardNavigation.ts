import { useCallback, useEffect } from 'react';

interface UseMenuKeyboardNavigationParams<T extends HTMLElement> {
  menuRef: React.RefObject<T | null>;
  isOpen?: boolean;
  onClose?: () => void;
}

function getFocusableMenuItems(container: HTMLElement | null): HTMLButtonElement[] {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
  );
}

export function useMenuKeyboardNavigation<T extends HTMLElement>({
  menuRef,
  isOpen = true,
  onClose,
}: UseMenuKeyboardNavigationParams<T>) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const firstItem = getFocusableMenuItems(menuRef.current)[0];
      firstItem?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, menuRef]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>): void => {
    const items = getFocusableMenuItems(menuRef.current);
    if (items.length === 0) {
      return;
    }

    const activeIndex = items.findIndex((item) => item === document.activeElement);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }, [menuRef, onClose]);

  return {
    onKeyDown,
  };
}
