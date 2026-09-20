/** Shortcut hint. Host formats platform keys (⌘ vs Ctrl); this renders what it is given. */
export function Kbd({ keys }: { keys: string | readonly string[] }) {
  const list = typeof keys === 'string' ? [keys] : keys;
  return (
    <kbd className="ofk-kbd" aria-label={list.join(' ')}>
      {list.map((key, index) => (
        <kbd key={index}>{key}</kbd>
      ))}
    </kbd>
  );
}
