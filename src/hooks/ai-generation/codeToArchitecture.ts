export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'java'
  | 'ruby'
  | 'csharp'
  | 'cpp'
  | 'rust';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
  java: 'Java',
  ruby: 'Ruby',
  csharp: 'C#',
  cpp: 'C++',
  rust: 'Rust',
};

export const FILE_EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  py: 'python',
  go: 'go',
  java: 'java',
  rb: 'ruby',
  cs: 'csharp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  rs: 'rust',
};

export interface CodeToArchitectureOptions {
  code: string;
  language: SupportedLanguage;
}

export function buildCodeToArchitecturePrompt({
  code,
  language,
}: CodeToArchitectureOptions): string {
  return `Analyze this ${LANGUAGE_LABELS[language]} source code and generate a clean architecture diagram.

Identify the main modules, services, classes, functions, and their dependencies. Focus on the high-level structure — not every line of code, only meaningful architectural components and relationships.

Guidelines:
- Use [system] nodes for services, classes, modules, databases, external APIs
- Use [browser] or [mobile] nodes for frontend surfaces if present
- Use [section] to group related components (e.g. "Frontend", "Backend", "Database Layer")
- Use [process] nodes for key operations or workflows
- Show data flow and dependencies as edges with clear labels
- Add appropriate icons and colors to make the diagram readable

SOURCE CODE (${LANGUAGE_LABELS[language]}):
\`\`\`${language}
${code}
\`\`\``;
}

export function buildCodebaseToArchitecturePrompt(codebaseSummary: string): string {
  return `Analyze this codebase structure and dependency graph, then generate a clean architecture diagram.

The codebase was analyzed statically — file imports and dependencies were parsed automatically. Use this structural data to create a meaningful architecture overview.

Guidelines:
- Use [section] containers for top-level directories/modules (e.g. "src/api", "src/auth", "src/frontend")
- Use [system] nodes for key files or modules that serve as services, controllers, models, or utilities
- Use [browser] or [mobile] nodes for frontend entry points if present
- Use [process] nodes for key workflows (e.g. authentication flow, data pipeline)
- Show dependency edges between modules — label them with what the import provides
- Group related modules that are heavily connected
- Focus on the highest-level picture — not every file, just the important ones
- Entry points should be prominent (they're the app's starting points)

CODEBASE ANALYSIS:
${codebaseSummary}`;
}
