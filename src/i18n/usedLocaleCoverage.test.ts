import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type JsonMap = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SRC_LOCALES_DIR = path.join(__dirname, 'locales');
const PUBLIC_LOCALES_DIR = path.join(ROOT_DIR, 'public', 'locales');
const SOURCE_DIR = path.join(ROOT_DIR, 'src');

const LOCALES = ['en', 'de', 'es', 'fr', 'ja', 'tr', 'zh'] as const;
const FLOWPILOT_LOCALIZED_KEY_PATHS = [
  'home.homeFlowpilotAI',
  'home.suggestionAI',
] as const;

function readJson(filePath: string): JsonMap {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as JsonMap;
}

function isObject(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getByPath(obj: JsonMap, dotPath: string): unknown {
  return dotPath.split('.').reduce<unknown>((current, segment) => {
    if (!isObject(current)) {
      return undefined;
    }

    return current[segment];
  }, obj);
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'dist') continue;
      walkFiles(fullPath, out);
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }

  return out;
}

function extractTranslationKeys(code: string): Set<string> {
  const keys = new Set<string>();
  const patterns = [
    /\bt\(\s*['"`]([^'"`]+)['"`]/g,
    /\bi18nKey\s*=\s*['"`]([^'"`]+)['"`]/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      const key = match[1];
      if (!key.includes('${') && key.includes('.')) {
        keys.add(key);
      }
    }
  }

  return keys;
}

function collectUsedKeys(): string[] {
  const keys = new Set<string>();

  for (const filePath of walkFiles(SOURCE_DIR)) {
    const code = fs.readFileSync(filePath, 'utf8');
    for (const key of extractTranslationKeys(code)) {
      keys.add(key);
    }
  }

  return [...keys].sort();
}

describe('used locale coverage', () => {
  it('has every code-referenced translation key in every source locale', () => {
    const usedKeys = collectUsedKeys();

    for (const locale of LOCALES) {
      const localePath = path.join(SRC_LOCALES_DIR, locale, 'translation.json');
      const dict = readJson(localePath);
      const missingKeys = usedKeys.filter((key) => typeof getByPath(dict, key) !== 'string');

      expect(missingKeys, `${locale} is missing used translation keys`).toEqual([]);
    }
  });

  it('keeps public locale mirrors in sync with source locales', () => {
    for (const locale of LOCALES) {
      const srcPath = path.join(SRC_LOCALES_DIR, locale, 'translation.json');
      const publicPath = path.join(PUBLIC_LOCALES_DIR, locale, 'translation.json');

      expect(readJson(publicPath), `${locale} public locale should match src locale`).toEqual(readJson(srcPath));
    }
  });

  it('keeps Flowpilot AI labels localized outside English', () => {
    const enDict = readJson(path.join(SRC_LOCALES_DIR, 'en', 'translation.json'));

    for (const locale of LOCALES) {
      if (locale === 'en') continue;

      const dict = readJson(path.join(SRC_LOCALES_DIR, locale, 'translation.json'));

      for (const keyPath of FLOWPILOT_LOCALIZED_KEY_PATHS) {
        const enValue = getByPath(enDict, keyPath);
        const localeValue = getByPath(dict, keyPath);

        expect(typeof localeValue, `${locale}.${keyPath} should be a string`).toBe('string');
        expect(localeValue, `${locale}.${keyPath} should differ from English`).not.toBe(enValue);
      }
    }
  });
});
