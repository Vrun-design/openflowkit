import type { ParseDiagnostic } from './importContracts';

const ARCHITECTURE_LINE_SNIPPET_PATTERN = /^(?<message>.+?) at line (?<line>\d+): "(?<snippet>.*)"$/;
const ARCHITECTURE_LINE_ONLY_PATTERN = /^(?<message>.+?) at line (?<line>\d+)(?<suffix>.*)$/;

function normalizeStringDiagnostic(input: string): ParseDiagnostic {
  const lineWithSnippetMatch = input.match(ARCHITECTURE_LINE_SNIPPET_PATTERN);
  if (lineWithSnippetMatch?.groups) {
    return {
      message: lineWithSnippetMatch.groups.message.trim(),
      line: Number(lineWithSnippetMatch.groups.line),
      snippet: lineWithSnippetMatch.groups.snippet.trim(),
    };
  }

  const lineOnlyMatch = input.match(ARCHITECTURE_LINE_ONLY_PATTERN);
  if (lineOnlyMatch?.groups) {
    const suffix = lineOnlyMatch.groups.suffix?.trim();
    return {
      message: `${lineOnlyMatch.groups.message}${suffix ? ` ${suffix}` : ''}`.trim(),
      line: Number(lineOnlyMatch.groups.line),
    };
  }

  return { message: input };
}

export function normalizeParseDiagnostics(value: unknown): ParseDiagnostic[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (typeof item === 'string') {
      return normalizeStringDiagnostic(item);
    }
    return item as ParseDiagnostic;
  });
}
