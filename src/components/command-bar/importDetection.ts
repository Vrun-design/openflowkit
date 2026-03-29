import {
  FILE_EXTENSION_TO_LANGUAGE,
  type SupportedLanguage,
} from '@/hooks/ai-generation/codeToArchitecture';
import type { InfraFormat } from '@/services/infraSync/types';

export type ImportCategory = 'sql' | 'infra' | 'openapi' | 'code' | 'codebase';

export const MAX_INPUT_BYTES = 200_000;
export const MAX_FILE_BYTES = 1_000_000;

const EXT_TO_CATEGORY: Record<string, ImportCategory> = {
  sql: 'sql',
  tfstate: 'infra',
  tf: 'infra',
  hcl: 'infra',
  yaml: 'infra',
  yml: 'infra',
  json: 'openapi',
};

const EXT_TO_LANGUAGE: Record<string, SupportedLanguage> = {};
for (const [ext, lang] of Object.entries(FILE_EXTENSION_TO_LANGUAGE)) {
  EXT_TO_LANGUAGE[ext] = lang;
}

export function detectCategoryFromExtension(filename: string): ImportCategory | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (EXT_TO_CATEGORY[ext]) return EXT_TO_CATEGORY[ext];
  if (EXT_TO_LANGUAGE[ext]) return 'code';
  return null;
}

export function detectInfraFormat(
  filename: string,
  content: string
): InfraFormat | 'terraform-hcl' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tfstate') || lower.endsWith('.tf.json')) return 'terraform-state';
  if (
    lower === 'docker-compose.yml' ||
    lower === 'docker-compose.yaml' ||
    lower === 'compose.yml' ||
    lower === 'compose.yaml'
  )
    return 'docker-compose';
  if (lower.endsWith('.tf') || lower.endsWith('.hcl')) return 'terraform-hcl';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    if (
      content.includes('kind:') &&
      (content.includes('apiVersion:') || content.includes('metadata:'))
    )
      return 'kubernetes';
    if (content.includes('services:') && (content.includes('image:') || content.includes('build:')))
      return 'docker-compose';
    return 'kubernetes';
  }
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'version' in parsed && 'resources' in parsed)
      return 'terraform-state';
  } catch {
    /* not JSON */
  }
  return 'terraform-state';
}

export function detectLanguage(filename: string): SupportedLanguage {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANGUAGE[ext] ?? 'typescript';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(0)}KB`;
}
