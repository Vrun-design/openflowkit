import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getKeyboardShortcuts, isMacLikePlatform } from '../../constants';
import { ROLLOUT_FLAGS } from '../../config/rolloutFlags';
import {
  DEFAULT_KEYBOARD_BINDINGS,
  KEYBOARD_ACTION_IDS,
  KEYBOARD_ACTION_LABEL_KEYS,
  chordFromEvent,
  formatChord,
  loadKeyboardBindings,
  resetKeyboardBindings,
  resolveKeyboardAction,
  saveKeyboardBindings,
  type KeyboardActionId,
  type KeyboardBindings,
} from '../../services/keyboardBindings';

/** Shared key-cap rendering for both the reference list and the editor rows. */
function KeyCaps({ keys }: { keys: string[] }): React.ReactElement {
  return (
    <div className="flex gap-1">
      {keys.map((key, keyIndex) => (
        <kbd
          key={`${key}-${keyIndex}`}
          className="min-w-[24px] rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 py-1 text-center text-xs font-semibold text-[var(--brand-secondary)] shadow-sm"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}

interface CustomizableShortcutsProps {
  isMacLike: boolean;
}

function CustomizableShortcuts({ isMacLike }: CustomizableShortcutsProps): React.ReactElement {
  const { t } = useTranslation();
  const [bindings, setBindings] = useState<KeyboardBindings>(() => loadKeyboardBindings());
  const [recordingAction, setRecordingAction] = useState<KeyboardActionId | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const applyBinding = useCallback(
    (actionId: KeyboardActionId, chord: string) => {
      const owner = resolveKeyboardAction(chord, bindings);
      if (owner && owner !== actionId) {
        setConflictMessage(
          t('settingsModal.shortcutsConflict', {
            action: t(KEYBOARD_ACTION_LABEL_KEYS[owner]),
          })
        );
        return;
      }

      const next: KeyboardBindings = { ...bindings, [actionId]: [chord] };
      setBindings(next);
      saveKeyboardBindings(next);
      setRecordingAction(null);
      setConflictMessage(null);
    },
    [bindings, t]
  );

  useEffect(() => {
    if (!recordingAction) return;

    function handleKeyDown(event: KeyboardEvent): void {
      // Capture phase plus stopPropagation keeps the editor's own global
      // handler from running the command we are trying to rebind.
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setRecordingAction(null);
        setConflictMessage(null);
        return;
      }

      const chord = chordFromEvent(event);
      if (!chord) return; // still holding modifiers only
      applyBinding(recordingAction, chord);
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingAction, applyBinding]);

  const resetOne = useCallback(
    (actionId: KeyboardActionId) => {
      const next: KeyboardBindings = {
        ...bindings,
        [actionId]: DEFAULT_KEYBOARD_BINDINGS[actionId],
      };
      setBindings(next);
      saveKeyboardBindings(next);
      setConflictMessage(null);
    },
    [bindings]
  );

  const resetAll = useCallback(() => {
    setBindings(resetKeyboardBindings());
    setRecordingAction(null);
    setConflictMessage(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-brand-border)] pb-2">
        <h3 className="font-semibold text-[var(--brand-text)]">
          {t('settingsModal.shortcutsCustomizable')}
        </h3>
        <button
          type="button"
          onClick={resetAll}
          className="print:hidden rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] px-2 py-1 text-xs font-medium text-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
        >
          {t('settingsModal.shortcutsResetAll')}
        </button>
      </div>

      {conflictMessage ? (
        <p role="alert" className="print:hidden text-xs font-medium text-[var(--brand-danger,#dc2626)]">
          {conflictMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        {KEYBOARD_ACTION_IDS.map((actionId) => {
          const actionLabel = t(KEYBOARD_ACTION_LABEL_KEYS[actionId]);
          const isRecording = recordingAction === actionId;
          const isCustomized =
            bindings[actionId].join('+') !== DEFAULT_KEYBOARD_BINDINGS[actionId].join('+');

          return (
            <div
              key={actionId}
              className="group flex items-center justify-between gap-3 rounded-[var(--radius-sm)] p-2 transition-colors hover:bg-[var(--brand-background)]/50"
            >
              <span className="text-sm font-medium text-[var(--brand-secondary)]">
                {actionLabel}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isRecording ? (
                  <span className="text-xs font-semibold text-[var(--brand-text)]">
                    {t('settingsModal.shortcutsRecording')}
                  </span>
                ) : (
                  bindings[actionId].map((chord, chordIndex) => (
                    <React.Fragment key={`${actionId}-${chord}`}>
                      {chordIndex > 0 ? (
                        <span className="text-[10px] font-semibold uppercase text-[var(--brand-secondary)]">
                          /
                        </span>
                      ) : null}
                      <KeyCaps keys={formatChord(chord, isMacLike)} />
                    </React.Fragment>
                  ))
                )}
                <button
                  type="button"
                  aria-pressed={isRecording}
                  aria-label={`${t('settingsModal.shortcutsRecord')}: ${actionLabel}`}
                  onClick={() => {
                    setConflictMessage(null);
                    setRecordingAction(isRecording ? null : actionId);
                  }}
                  className="print:hidden rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] px-2 py-1 text-xs font-medium text-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
                >
                  {isRecording ? t('common.cancel') : t('settingsModal.shortcutsRecord')}
                </button>
                {isCustomized ? (
                  <button
                    type="button"
                    aria-label={`${t('settingsModal.shortcutsResetOne')}: ${actionLabel}`}
                    onClick={() => resetOne(actionId)}
                    className="print:hidden rounded-[var(--radius-xs)] px-2 py-1 text-xs font-medium text-[var(--brand-secondary)] underline hover:bg-[var(--brand-background)]"
                  >
                    {t('settingsModal.shortcutsResetOne')}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ShortcutsSettings = () => {
  const { t } = useTranslation();
  const isMacLike = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      isMacLikePlatform(navigator.platform || navigator.userAgent),
    []
  );
  const keyboardShortcuts = useMemo(() => getKeyboardShortcuts(isMacLike), [isMacLike]);
  const canCustomize = ROLLOUT_FLAGS.openCanvasCustomShortcutsV1;

  return (
    <div id="shortcut-reference-sheet" className="space-y-8">
      {canCustomize ? <CustomizableShortcuts isMacLike={isMacLike} /> : null}

      {keyboardShortcuts.map((section) => (
        <div key={section.title} className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-brand-border)]">
            <h3 className="font-semibold text-[var(--brand-text)]">{t(section.title)}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {section.items.map((item) => (
              <div
                key={item.label}
                className="group flex items-center justify-between rounded-[var(--radius-sm)] p-2 transition-colors hover:bg-[var(--brand-background)]/50"
              >
                <span className="text-[var(--brand-secondary)] text-sm font-medium">
                  {t(item.label)}
                </span>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {item.shortcuts.map((shortcut, shortcutIndex) => (
                    <React.Fragment key={`${item.label}-${shortcutIndex}`}>
                      {shortcutIndex > 0 ? (
                        <span className="text-[10px] font-semibold uppercase text-[var(--brand-secondary)]">
                          /
                        </span>
                      ) : null}
                      <KeyCaps keys={shortcut} />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {canCustomize ? (
        <div className="print:hidden flex justify-center pt-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] px-3 py-1.5 text-xs font-medium text-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
          >
            {t('settingsModal.shortcutsPrint')}
          </button>
        </div>
      ) : null}

      <div className="text-xs text-[var(--brand-secondary)] text-center pt-4">
        {t('settingsModal.shortcutsHint')}
      </div>
    </div>
  );
};
