import { useEffect, useState } from 'react';

export const REPO_URL = 'https://github.com/Vrun-design/openflowkit';
const API_URL = 'https://api.github.com/repos/Vrun-design/openflowkit';
const KEY = 'openflowkit-v2-stars';
const DAY = 86_400_000;

/** 999 → "999", 1234 → "1.2k", 12_345 → "12k", 1_500_000 → "1.5M". */
export function formatStars(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${count < 10_000 ? (count / 1000).toFixed(1).replace(/\.0$/, '') : Math.round(count / 1000)}k`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/** A lookup younger than a day: its count, or null when it failed (tried again tomorrow). Null when there is none. */
export function readCachedStars(raw: string | null, now = Date.now()): { readonly count: number | null } | null {
  try {
    const value = JSON.parse(raw ?? 'null') as { count?: unknown; at?: unknown } | null;
    if (typeof value?.at !== 'number' || now - value.at >= DAY) return null;
    return { count: typeof value.count === 'number' ? value.count : null };
  } catch {
    return null;
  }
}

/**
 * The repository's star count for the sidebar. One anonymous GitHub request a day at most, cached here
 * whether it worked or not; offline, rate-limited or blocked, the row simply shows no number.
 */
export function useGitHubStars(): number | null {
  const [cached] = useState(() => {
    try { return readCachedStars(localStorage.getItem(KEY)); } catch { return null; }
  });
  const [stars, setStars] = useState<number | null>(cached?.count ?? null);
  useEffect(() => {
    if (cached) return;
    const controller = new AbortController();
    const remember = (count: number | null) => {
      try { localStorage.setItem(KEY, JSON.stringify({ count, at: Date.now() })); } catch { /* shown, just not cached */ }
    };
    fetch(API_URL, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { stargazers_count?: unknown } | null) => {
        const count = typeof body?.stargazers_count === 'number' ? body.stargazers_count : null;
        setStars(count);
        remember(count);
      })
      .catch(() => {
        if (!controller.signal.aborted) remember(null);
      });
    return () => controller.abort();
  }, [cached]);
  return stars;
}
