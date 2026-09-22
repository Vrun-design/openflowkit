// The one test that keeps the CSP bug class dead: every default provider origin
// must be permitted by connect-src in _headers. The app was shipped once with
// NVIDIA and localhost missing, and the blocked calls looked exactly like CORS.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AI_PROVIDERS } from './providers';

const HEADERS = readFileSync(path.resolve(process.cwd(), '_headers'), 'utf8');
const CONNECT_SRC = /connect-src([^;]*);/.exec(HEADERS)?.[1]?.trim().split(/\s+/) ?? [];

/** CSP source matching for the subset we write: scheme-source, host-source, wildcard host/port. */
export function permits(sources: readonly string[], url: string): boolean {
  const parsed = new URL(url);
  for (const source of sources) {
    if (source === "'self'") continue; // every provider origin is cross-origin
    if (source === parsed.protocol) return true; // "https:"
    const hostSource = /^([a-z][a-z0-9+.-]*):\/\/([^/]+)$/.exec(source);
    if (!hostSource) continue;
    const [, scheme, hostPort] = hostSource as unknown as [string, string, string];
    if (scheme !== parsed.protocol.replace(':', '')) continue;
    const [host, port] = hostPort.includes(':') ? hostPort.split(':') as [string, string] : [hostPort, ''];
    const hostname = parsed.hostname;
    const hostOk = host.startsWith('*.')
      ? hostname.endsWith(host.slice(1)) && hostname !== host.slice(2)
      : hostname === host;
    if (!hostOk) continue;
    const defaultPort = parsed.protocol === 'https:' ? '443' : '80';
    if (port && port !== '*' && port !== (parsed.port || defaultPort)) continue;
    return true;
  }
  return false;
}

describe('Content-Security-Policy connect-src', () => {
  it('permits every catalogue default endpoint — the bug class this phase exists for', () => {
    expect(CONNECT_SRC.length).toBeGreaterThan(0);
    for (const { id, defaultBaseUrl } of AI_PROVIDERS) {
      if (!defaultBaseUrl) continue; // custom is user-supplied; decision (a) below covers it
      expect(permits(CONNECT_SRC, defaultBaseUrl), `${id} (${defaultBaseUrl}) is blocked by our own CSP`).toBe(true);
    }
  });

  it('would fail for a provider on an origin the policy does not cover', () => {
    // http beyond localhost is the one class the widened policy still refuses.
    expect(permits(CONNECT_SRC, 'http://192.168.1.5:8000/v1')).toBe(false);
  });

  it('has teeth against the policy that shipped: NVIDIA and Ollama blocked, now permitted', () => {
    const shipped = [
      "'self'", 'https://*.openai.com', 'https://*.anthropic.com', 'https://*.googleapis.com',
      'https://api.groq.com', 'https://*.mistral.ai', 'https://*.cerebras.ai', 'https://openrouter.ai',
    ];
    expect(permits(shipped, 'https://integrate.api.nvidia.com/v1')).toBe(false);
    expect(permits(shipped, 'http://localhost:11434/v1')).toBe(false);
    expect(permits(CONNECT_SRC, 'https://integrate.api.nvidia.com/v1')).toBe(true);
    expect(permits(CONNECT_SRC, 'http://localhost:11434/v1')).toBe(true);
  });

  it('drops the telemetry origins without a telemetry promise', () => {
    expect(HEADERS).not.toMatch(/posthog/);
    expect(HEADERS).not.toMatch(/yjs\.dev/);
    expect(HEADERS).not.toMatch(/openflowkit\.com/);
  });
});
