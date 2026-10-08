// POSIX path arithmetic over repo-relative paths.

/** Parent folder, `''` at the repo root (so it joins cleanly, unlike `dirname`'s `.`). */
export function dirOf(path: string): string {
  return path.slice(0, Math.max(path.lastIndexOf('/'), 0));
}

/** Joins and normalizes; `..` past the repo root stays as `..` so the result matches no file. */
export function joinPath(...parts: string[]): string {
  const out: string[] = [];
  for (const segment of parts.join('/').split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment !== '..') out.push(segment);
    else if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
    else out.push('..');
  }
  return out.join('/');
}

/** The capture of a single-`*` pattern (tsconfig `paths`, package `exports`), or undefined when it does not match. */
export function matchStar(pattern: string, spec: string): string | undefined {
  const star = pattern.indexOf('*');
  if (star < 0) return pattern === spec ? '' : undefined;
  const head = pattern.slice(0, star);
  const tail = pattern.slice(star + 1);
  if (spec.length < head.length + tail.length || !spec.startsWith(head) || !spec.endsWith(tail)) return undefined;
  return spec.slice(head.length, spec.length - tail.length);
}
