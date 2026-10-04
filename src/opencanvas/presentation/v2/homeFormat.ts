const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const absolute = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const STEPS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity],
];

/** "2 hours ago" for the card, the full date for its tooltip. Under a minute reads "just now". */
export function savedWhen(iso: string, now = Date.now()): { readonly relative: string; readonly absolute: string } {
  const at = new Date(iso);
  let value = (at.getTime() - now) / 1000;
  let text = 'just now';
  if (Math.abs(value) >= 60) {
    for (const [unit, size] of STEPS) {
      if (Math.abs(value) < size) { text = relative.format(Math.round(value), unit); break; }
      value /= size;
    }
  }
  return { relative: text, absolute: Number.isNaN(at.getTime()) ? '' : absolute.format(at) };
}
