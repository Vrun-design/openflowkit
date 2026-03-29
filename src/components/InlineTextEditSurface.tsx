import React, { useEffect, useLayoutEffect, useRef } from 'react';

type InlineTextEditSurfaceProps = {
  isEditing: boolean;
  draft: string;
  displayValue: React.ReactNode;
  onBeginEdit: () => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  className?: string;
  inputClassName?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  inputMode?: 'single-line' | 'multiline';
  isSelected?: boolean;
  showCharacterCount?: boolean;
  maxCharacters?: number;
  spellCheck?: boolean;
};

const EDIT_GESTURE_DRAG_THRESHOLD_PX = 6;

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function InlineTextEditSurface({
  isEditing,
  draft,
  displayValue,
  onBeginEdit,
  onDraftChange,
  onCommit,
  onKeyDown,
  className,
  inputClassName,
  style,
  inputStyle,
  inputMode = 'single-line',
  isSelected = false,
  showCharacterCount = false,
  maxCharacters,
  spellCheck = false,
}: InlineTextEditSurfaceProps): React.ReactElement {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const blurCommitTimerRef = useRef<number | null>(null);
  const pointerDownPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragIntentRef = useRef(false);
  const inputClasses = joinClassNames(
    'w-full min-w-0 rounded-sm border border-transparent bg-transparent px-0 py-0 text-inherit shadow-none outline-none caret-[var(--brand-primary)] focus:border-transparent focus:outline-none focus:ring-0',
    inputClassName
  );
  const isMultiline = inputMode === 'multiline';
  const affordanceClasses =
    !isEditing && isSelected
      ? 'cursor-text decoration-dotted underline-offset-4 transition-decoration-color duration-150 hover:decoration-[var(--brand-primary)] hover:decoration-2'
      : undefined;

  useEffect(() => {
    return () => {
      if (blurCommitTimerRef.current !== null) {
        window.clearTimeout(blurCommitTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isEditing || !isMultiline || !textareaRef.current) return;
    textareaRef.current.style.height = '0px';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [isEditing, isMultiline]);

  useLayoutEffect(() => {
    if (!isEditing) {
      return;
    }

    const activeInput = isMultiline ? textareaRef.current : inputRef.current;
    if (!activeInput) {
      return;
    }

    const caretPosition = activeInput.value.length;
    activeInput.focus();
    activeInput.setSelectionRange(caretPosition, caretPosition);
  }, [isEditing, isMultiline]);

  function stopEditingPointerPropagation(
    event: React.PointerEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void {
    event.stopPropagation();
  }

  function handleBlur(): void {
    if (blurCommitTimerRef.current !== null) {
      window.clearTimeout(blurCommitTimerRef.current);
    }

    blurCommitTimerRef.current = window.setTimeout(() => {
      blurCommitTimerRef.current = null;
      const activeElement = document.activeElement;
      if (activeElement instanceof Node && rootRef.current?.contains(activeElement)) {
        return;
      }
      onCommit();
    }, 0);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    pointerDownPositionRef.current = { x: event.clientX, y: event.clientY };
    dragIntentRef.current = false;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    if (!pointerDownPositionRef.current || dragIntentRef.current) return;
    const deltaX = event.clientX - pointerDownPositionRef.current.x;
    const deltaY = event.clientY - pointerDownPositionRef.current.y;
    const movedPastThreshold = Math.hypot(deltaX, deltaY) >= EDIT_GESTURE_DRAG_THRESHOLD_PX;
    if (movedPastThreshold) {
      dragIntentRef.current = true;
    }
  }

  function clearPointerIntent(): void {
    pointerDownPositionRef.current = null;
    dragIntentRef.current = false;
  }

  return (
    <div
      ref={rootRef}
      className={joinClassNames(
        className,
        affordanceClasses,
        isEditing ? 'nodrag nopan nowheel' : undefined
      )}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearPointerIntent}
      onPointerCancel={clearPointerIntent}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (dragIntentRef.current) {
          clearPointerIntent();
          return;
        }
        onBeginEdit();
        clearPointerIntent();
      }}
    >
      {isEditing ? (
        <div className="relative w-full">
          {isMultiline ? (
            <textarea
              ref={textareaRef}
              autoFocus
              value={draft}
              rows={1}
              onChange={(event) => onDraftChange(event.target.value)}
              onBlur={handleBlur}
              onKeyDown={onKeyDown}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={stopEditingPointerPropagation}
              onPointerMove={stopEditingPointerPropagation}
              className={joinClassNames(
                inputClasses,
                'nodrag nopan nowheel resize-none overflow-hidden w-full'
              )}
              style={inputStyle}
              spellCheck={spellCheck}
            />
          ) : (
            <input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onBlur={handleBlur}
              onKeyDown={onKeyDown}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={stopEditingPointerPropagation}
              onPointerMove={stopEditingPointerPropagation}
              className={joinClassNames(inputClasses, 'nodrag nopan nowheel w-full')}
              style={inputStyle}
              spellCheck={spellCheck}
            />
          )}
          {showCharacterCount && (
            <div
              className={`absolute -bottom-4 right-0 text-[10px] ${
                maxCharacters && draft.length > maxCharacters
                  ? 'text-red-500 font-medium'
                  : 'text-[var(--brand-secondary)]'
              }`}
            >
              {draft.length}
              {maxCharacters && ` / ${maxCharacters}`}
            </div>
          )}
        </div>
      ) : (
        displayValue
      )}
    </div>
  );
}
