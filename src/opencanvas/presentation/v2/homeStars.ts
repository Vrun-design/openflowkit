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

/** A cached count younger than a day, or null. */
export function readCachedStars(raw: string | null, now = Date.now()): number | null {
  try {
    const value = JSON.parse(raw ?? 'null') as { count?: unknown; at?: unknown } | null;
    return typeof value?.count === 'number' && typeof value.at === 'number' && now - value.at < DAY ? value.count : null;
  } catch {
    return null;
  }
}

/**
 * The repository's star count for the sidebar. One anonymous GitHub request a day at most, cached here;
 * offline, rate-limited or blocked, the row simply shows no number.
 */
export function useGitHubStars(): number | null {
  const [stars, setStars] = useState<number | null>(() => {
    try { return readCachedStars(localStorage.getItem(KEY)); } catch { return null; }
  });
  useEffect(() => {
    if (stars !== null) return;
    const controller = new AbortController();
    fetch(API_URL, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { stargazers_count?: unknown } | null) => {
        if (typeof body?.stargazers_count !== 'number') return;
        setStars(body.stargazers_count);
        try { localStorage.setItem(KEY, JSON.stringify({ count: body.stargazers_count, at: Date.now() })); } catch { /* shown, just not cached */ }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [stars]);
  return stars;
}
