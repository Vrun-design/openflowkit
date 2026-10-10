import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The e2e runs on the dev server, which answers every path with index.html and sends no headers,
// so a deploy that drops the headers or 404s an old link passes it. These read the deploy config itself.
const read = (file: string) => readFileSync(file, 'utf8');

describe('deploy config', () => {
  it('ships the headers with the build: Cloudflare reads _headers from the deployed folder', () => {
    expect(read('wrangler.toml')).toMatch(/directory = "\.\/dist"/);
    expect(read('public/_headers')).toMatch(/Content-Security-Policy:/);
    expect(read('docs-site/wrangler.toml')).toMatch(/directory = "\.\/dist"/);
    expect(read('docs-site/public/_headers')).toMatch(/Content-Security-Policy:/);
  });

  it('nginx (self-host) sends the Cloudflare policy, verbatim, on every location', () => {
    const policy = /Content-Security-Policy: ([^\n]+)/.exec(read('public/_headers'))?.[1]?.trim();
    const sent = [...read('nginx/nginx.conf').matchAll(/add_header Content-Security-Policy "([^"]+)"/g)].map((match) => match[1]);
    expect(sent.length).toBeGreaterThan(0);
    for (const value of sent) expect(value).toBe(policy);
  });

  it('lets the docs search run: Pagefind is WebAssembly, blocked without wasm-unsafe-eval', () => {
    expect(/script-src([^;]*);/.exec(read('docs-site/public/_headers'))?.[1]).toContain("'wasm-unsafe-eval'");
  });

  it('answers unknown paths with the app, so an old /view?flow= link reaches its redirect', () => {
    expect(read('wrangler.toml')).toMatch(/not_found_handling = "single-page-application"/);
    expect(read('docs-site/wrangler.toml')).toMatch(/not_found_handling = "404-page"/);
  });
});
