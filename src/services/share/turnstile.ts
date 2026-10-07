import { ShareError } from './shareClient';

/** Cloudflare's documented always-pass test key: dev builds only, and the Worker must hold the matching test secret. */
const DEV_SITE_KEY = '1x00000000000000000000AA';
export const TURNSTILE_SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? (import.meta.env.DEV ? DEV_SITE_KEY : undefined);

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const CHALLENGE_TIMEOUT_MS = 60_000;

interface TurnstileApi {
  render(container: HTMLElement, options: {
    sitekey: string; appearance: 'interaction-only';
    callback: (token: string) => void; 'error-callback': () => void; 'timeout-callback': () => void;
  }): string;
  remove(widgetId: string): void;
}
declare global { interface Window { turnstile?: TurnstileApi } }

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('missing'));
    script.onerror = () => reject(new Error('blocked'));
    document.head.append(script);
  });
}

/** Renders the widget only now, when the user shares; it stays invisible unless Cloudflare needs a click. */
export async function getTurnstileToken(siteKey: string | undefined = TURNSTILE_SITE_KEY): Promise<string> {
  if (!siteKey) throw new ShareError('no-site-key', 'Share links aren’t set up in this build (no Turnstile site key).');
  let api: TurnstileApi;
  try { api = await loadScript(); } catch {
    throw new ShareError('offline', 'Couldn’t load the human check. Check your connection and try again.');
  }
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'turnstile-host');
  Object.assign(container.style, { position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: '2147483647' });
  document.body.append(container);
  let widget = '';
  let timer = 0;
  return new Promise<string>((resolve, reject) => {
    const fail = () => reject(new ShareError('turnstile', 'The human check didn’t finish. Try again.'));
    timer = window.setTimeout(fail, CHALLENGE_TIMEOUT_MS);
    widget = api.render(container, {
      sitekey: siteKey, appearance: 'interaction-only',
      callback: resolve, 'error-callback': fail, 'timeout-callback': fail,
    });
  }).finally(() => {
    window.clearTimeout(timer);
    if (widget) api.remove(widget);
    container.remove();
  });
}
