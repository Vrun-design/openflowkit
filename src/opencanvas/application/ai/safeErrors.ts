export type AiSafeErrorCode =
  | 'INVALID_PROPOSAL' | 'SCHEMA_REJECTED' | 'PRECONDITION_FAILED'
  | 'PROVIDER_UNAVAILABLE' | 'RATE_LIMITED' | 'CANCELLED' | 'UNKNOWN';

export interface AiSafeError {
  readonly code: AiSafeErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly safeDetails?: string;
}

const SECRET_PATTERNS = [
  /\b(?:sk|pk|api)[-_][A-Za-z0-9_-]{12,}\b/g,
  /\b(?:Bearer\s+)[A-Za-z0-9._~+/=-]{12,}\b/gi,
  /\b[A-Fa-f0-9]{32,}\b/g,
];

export function redactAiText(value: string): string {
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[REDACTED]'), value)
    .slice(0, 2_000);
}

export function classifyAiError(error: unknown): AiSafeError {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const message = redactAiText(raw);
  if (/abort|cancel/i.test(raw)) return { code: 'CANCELLED', message: 'AI operation cancelled.', retryable: false };
  if (/rate|429|quota/i.test(raw)) return { code: 'RATE_LIMITED', message: 'AI service is temporarily rate limited.', retryable: true };
  if (/network|fetch|unavailable|503/i.test(raw)) return { code: 'PROVIDER_UNAVAILABLE', message: 'AI service is temporarily unavailable.', retryable: true };
  if (/precondition|not found|out of range/i.test(raw)) return { code: 'PRECONDITION_FAILED', message: 'The document changed before this edit could apply.', retryable: true };
  if (/invalid|schema|unsupported/i.test(raw)) return { code: 'SCHEMA_REJECTED', message: 'The proposed edit was not valid for this document.', retryable: false };
  return { code: 'UNKNOWN', message: 'The AI operation could not be completed.', retryable: false,
    ...(message ? { safeDetails: message } : {}) };
}
