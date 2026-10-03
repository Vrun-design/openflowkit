// v1's `#/view?flow=` carries v1 DSL: `~` + base64url(zlib deflate), or older plain base64
// (main `viewerUrlCodec.ts`). v2 can't parse that DSL — the parser went in phase 0 — so the
// explainer page shows it as text. zlib is what `DecompressionStream('deflate')` reads.
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function decodeLegacyViewerParam(encoded: string): Promise<string> {
  // URLSearchParams turns a plain-base64 `+` into a space; put it back.
  if (!encoded.startsWith('~')) return decodeURIComponent(atob(encoded.replace(/ /g, '+')));
  const inflated = new Response(fromBase64Url(encoded.slice(1))).body!.pipeThrough(new DecompressionStream('deflate'));
  return new Response(inflated).text();
}
