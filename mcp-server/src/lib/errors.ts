/**
 * Returns a CallToolResult error payload that surfaces a clean message in
 * MCP clients without leaking stack traces or env-specific paths.
 */
export function toolError(message: string, details?: unknown): {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
} {
  const trailer = details ? `\n\n${JSON.stringify(details, null, 2)}` : '';
  return {
    isError: true,
    content: [{ type: 'text', text: `${message}${trailer}` }],
  };
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}
