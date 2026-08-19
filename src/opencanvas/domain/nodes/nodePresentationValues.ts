export function presentationString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function optionalPresentationString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function safeImageUrl(value: unknown): string | null {
  const url = optionalPresentationString(value);
  if (!url) return null;
  return /^(?:https?:|data:image\/|blob:)/i.test(url) ? url : null;
}
