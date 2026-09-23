// The Markdown subset chat replies use, parsed to plain data the panel renders
// as React elements — model text never reaches innerHTML.
// ponytail: no tables, blockquotes or nested lists; marked + DOMPurify if replies need them.
export type MdInline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code' | 'strong' | 'em'; readonly text: string }
  | { readonly kind: 'link'; readonly text: string; readonly href: string };

export type MdBlock =
  | { readonly kind: 'p'; readonly lines: readonly MdInline[][] }
  | { readonly kind: 'h'; readonly level: 1 | 2 | 3; readonly inline: MdInline[] }
  | { readonly kind: 'ul' | 'ol'; readonly items: readonly MdInline[][] }
  | { readonly kind: 'pre'; readonly lang: string; readonly text: string };

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseInline(text: string): MdInline[] {
  const out: MdInline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) out.push({ kind: 'text', text: text.slice(last, match.index) });
    const [, code, strong, strong2, em, em2, linkText, href] = match;
    if (code !== undefined) out.push({ kind: 'code', text: code });
    else if (strong !== undefined || strong2 !== undefined) out.push({ kind: 'strong', text: (strong ?? strong2)! });
    else if (em !== undefined || em2 !== undefined) out.push({ kind: 'em', text: (em ?? em2)! });
    else out.push({ kind: 'link', text: linkText!, href: href! });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdown(source: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    const fence = /^\s*```(\S*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index]!)) body.push(lines[index++]!);
      index += 1;
      blocks.push({ kind: 'pre', lang: fence[1] ?? '', text: body.join('\n') });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: 'h', level: Math.min(heading[1]!.length, 3) as 1 | 2 | 3, inline: parseInline(heading[2]!) });
      index += 1;
      continue;
    }
    const list = BULLET.test(line) ? BULLET : NUMBER.test(line) ? NUMBER : null;
    if (list) {
      const items: MdInline[][] = [];
      while (index < lines.length && list.test(lines[index]!)) items.push(parseInline(list.exec(lines[index++]!)![1]!));
      blocks.push({ kind: list === BULLET ? 'ul' : 'ol', items });
      continue;
    }
    if (!line.trim()) { index += 1; continue; }
    const paragraph: MdInline[][] = [];
    while (index < lines.length && lines[index]!.trim() && !/^\s*```|^#{1,6}\s/.test(lines[index]!)
      && !BULLET.test(lines[index]!) && !NUMBER.test(lines[index]!)) {
      paragraph.push(parseInline(lines[index++]!));
    }
    blocks.push({ kind: 'p', lines: paragraph });
  }
  return blocks;
}
