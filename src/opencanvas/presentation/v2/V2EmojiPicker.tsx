import { useMemo, useState, type KeyboardEvent } from 'react';
import { Field, Popover } from '../design-system';
import { EMOJI_GROUPS, searchEmoji } from './emojiCatalog';

export interface V2EmojiPickerProps {
  readonly recent: readonly string[];
  readonly onPick: (glyph: string) => void;
  readonly onClose: () => void;
}

// Search over a static catalogue, grouped like the OS picker, with the last
// picks on top. Enter takes the first result; arrows move; Esc closes.
export function V2EmojiPicker({ recent, onPick, onClose }: V2EmojiPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchEmoji(query), [query]);
  const glyphs = query.trim() ? results : null;

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && results[0]) {
      event.preventDefault();
      onPick(results[0]);
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div className="ofk-emoji-picker">
      <Field label="Search emoji" className="ofk-emoji-search" placeholder="Search emoji…"
        value={query} data-autofocus onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onSearchKeyDown} />
      <div className="ofk-emoji-body">
        {glyphs ? (
          glyphs.length > 0 ? (
            <div className="ofk-emoji-grid" role="listbox" aria-label="Emoji results">
              {glyphs.map((glyph) => (
                <button key={glyph} type="button" role="option" aria-selected={false}
                  aria-label={glyph} className="ofk-emoji-cell" onClick={() => onPick(glyph)}>
                  {glyph}
                </button>
              ))}
            </div>
          ) : <p className="ofk-caption">No emoji matches that.</p>
        ) : (
          <>
            {recent.length > 0 ? (
              <section aria-label="Recently used">
                <h3 className="ofk-caption">Recent</h3>
                <div className="ofk-emoji-grid" role="listbox" aria-label="Recent emoji">
                  {recent.map((glyph) => (
                    <button key={glyph} type="button" role="option" aria-selected={false}
                      aria-label={glyph} className="ofk-emoji-cell" onClick={() => onPick(glyph)}>
                      {glyph}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            {EMOJI_GROUPS.map((group) => (
              <section key={group.id} aria-label={group.label}>
                <h3 className="ofk-caption">{group.label}</h3>
                <div className="ofk-emoji-grid" role="listbox" aria-label={group.label}>
                  {group.glyphs.map((glyph) => (
                    <button key={`${group.id}:${glyph}`} type="button" role="option"
                      aria-selected={false} aria-label={glyph} className="ofk-emoji-cell"
                      onClick={() => onPick(glyph)}>
                      {glyph}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** Only the anchor needs the popover; the rail owns which one is open. */
export { Popover as EmojiPopover };
