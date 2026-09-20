import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconArrowUp, IconAt, IconPlayerStop, IconX } from '@tabler/icons-react';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import { Segmented } from './Controls';
export type ComposerScope = 'selection' | 'page' | 'document';
export interface ComposerMention {
  id: string;
  label: string;
}
export interface ComposerProps {
  onSubmit: (text: string, scope: ComposerScope) => void;
  onCancel: () => void;
  busy: boolean;
  scope: ComposerScope;
  onScopeChange: (scope: ComposerScope) => void;
  /** Objects/pages the host attached as context; the host opens its picker on add. */
  mentions?: readonly ComposerMention[];
  onAddMention?: () => void;
  onRemoveMention?: (id: string) => void;
  /** Provider/model control rendered by the host (BYOK), e.g. a Menu trigger. */
  provider?: ReactNode;
  placeholder?: string;
  labels?: Partial<{
    selection: string;
    page: string;
    document: string;
    send: string;
    stop: string;
    addMention: string;
    removeMention: string;
    scope: string;
  }>;
  selectionDisabled?: boolean;
  autoFocus?: boolean;
}
const defaults = {
  selection: 'Selection',
  page: 'Page',
  document: 'Document',
  send: 'Send',
  stop: 'Stop',
  addMention: 'Mention an object',
  removeMention: 'Remove',
  scope: 'Scope',
};
/** Ask the agent. Scope is explicit, context is visible, generation is cancellable. Enter sends, Shift+Enter breaks a line. */
export function Composer({
  onSubmit,
  onCancel,
  busy,
  scope,
  onScopeChange,
  mentions = [],
  onAddMention,
  onRemoveMention,
  provider,
  placeholder = 'Ask the agent, or type @ to mention an object',
  labels,
  selectionDisabled,
  autoFocus,
}: ComposerProps) {
  const t = { ...defaults, ...labels };
  const id = useId();
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  function submit() {
    const value = text.trim();
    if (!value || busy) return;
    onSubmit(value, scope);
    setText('');
    if (area.current) area.current.style.height = '';
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape' && busy) onCancel();
    // ponytail: '@' notifies the host picker but stays in the text; the host
    // attaches the picked object as a mention. Never swallow the character.
    else if (e.key === '@' && onAddMention) {
      onAddMention();
    }
  }
  return (
    <form
      className="ofk-composer ofk-overlay"
      aria-busy={busy || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {mentions.length > 0 && (
        <ul className="ofk-composer-mentions" aria-label="Context">
          {mentions.map((m) => (
            <li key={m.id}>
              <span>@{m.label}</span>
              {onRemoveMention && (
                <button
                  type="button"
                  aria-label={`${t.removeMention} ${m.label}`}
                  onClick={() => onRemoveMention(m.id)}
                >
                  <Icon icon={IconX} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <label htmlFor={id} className="ofk-visually-hidden">
        {placeholder}
      </label>
      <textarea
        id={id}
        ref={area}
        rows={1}
        value={text}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = '';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
        }}
        onKeyDown={onKeyDown}
      />
      <div className="ofk-composer-bar">
        {onAddMention && (
          <IconButton
            variant="quiet"
            label={t.addMention}
            icon={<Icon icon={IconAt} />}
            onClick={onAddMention}
          />
        )}
        <Segmented
          label={t.scope}
          value={scope}
          onChange={onScopeChange}
          options={[
            { value: 'selection', label: t.selection, disabled: selectionDisabled },
            { value: 'page', label: t.page },
            { value: 'document', label: t.document },
          ]}
        />
        <span className="ofk-composer-spacer" />
        {provider}
        {busy ? (
          <Button variant="secondary" onClick={onCancel}>
            <Icon icon={IconPlayerStop} /> {t.stop}
          </Button>
        ) : (
          <IconButton
            variant="primary"
            type="submit"
            label={t.send}
            icon={<Icon icon={IconArrowUp} />}
            disabled={!text.trim()}
          />
        )}
      </div>
    </form>
  );
}
