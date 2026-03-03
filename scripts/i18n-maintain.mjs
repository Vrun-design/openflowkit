import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_LOCALES_ROOT = path.join(ROOT, 'src', 'i18n', 'locales');
const EN_SOURCE_FILE = path.join(SRC_LOCALES_ROOT, 'en', 'translation.json');
const ARGS = new Set(process.argv.slice(2));
const SHOULD_WRITE = ARGS.has('--sync');

const LEGACY_AI_KEYS = [
  'howToGetKey',
  'pasteKeyStep',
  'customEndpointTitle',
  'customModelHint',
  'privacyTitle',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), obj);
}

function hasPath(obj, dotted) {
  return getPath(obj, dotted) !== undefined;
}

function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function walkFiles(dir, matcher, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, matcher, out);
      continue;
    }
    if (matcher(full)) out.push(full);
  }
  return out;
}

function extractTranslationKeys(code) {
  const keys = new Set();
  const patterns = [
    /\bt\(\s*['"`]([^'"`]+)['"`]/g,
    /\bi18nKey\s*=\s*['"`]([^'"`]+)['"`]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const key = match[1];
      if (!key.includes('${') && key.includes('.')) {
        keys.add(key);
      }
    }
  }

  return keys;
}

function flattenStringPaths(obj, prefix = '', out = new Set()) {
  if (!isObject(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out.add(key);
    } else if (isObject(v)) {
      flattenStringPaths(v, key, out);
    }
  }
  return out;
}

function migrateLegacyAiKeys(doc) {
  let changed = false;
  for (const key of LEGACY_AI_KEYS) {
    const target = `settingsModal.ai.${key}`;
    const source = `ai.${key}`;
    const sourceValue = getPath(doc, source);
    if (!hasPath(doc, target) && typeof sourceValue === 'string' && sourceValue.trim()) {
      setPath(doc, target, sourceValue);
      changed = true;
    }
  }
  return changed;
}

function localeFileFor(root, lang) {
  const file = path.join(root, lang, 'translation.json');
  return fs.existsSync(file) ? file : null;
}

function syncMissingKeys(targetDoc, sourceDoc, requiredKeys) {
  let changed = false;
  for (const key of requiredKeys) {
    if (hasPath(targetDoc, key)) continue;
    const sourceValue = getPath(sourceDoc, key);
    if (sourceValue === undefined) continue;
    setPath(targetDoc, key, sourceValue);
    changed = true;
  }
  return changed;
}

function main() {
  const sourceEn = readJson(EN_SOURCE_FILE);
  let enChanged = migrateLegacyAiKeys(sourceEn);

  const codeFiles = walkFiles(
    path.join(ROOT, 'src'),
    (full) => /\.(ts|tsx|js|jsx)$/.test(full) && !full.includes(`${path.sep}dist${path.sep}`)
  );

  const usedKeys = new Set();
  for (const file of codeFiles) {
    const code = fs.readFileSync(file, 'utf8');
    for (const key of extractTranslationKeys(code)) {
      usedKeys.add(key);
    }
  }

  const enStringPaths = flattenStringPaths(sourceEn);
  const missingInEn = [...usedKeys].filter((k) => !enStringPaths.has(k));

  if (missingInEn.length > 0) {
    console.error('Missing translation keys in src/i18n/locales/en/translation.json:');
    for (const key of missingInEn.sort()) console.error(`- ${key}`);
    if (!SHOULD_WRITE) process.exit(1);
  }

  const langs = fs
    .readdirSync(SRC_LOCALES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const lang of langs) {
    const srcFile = localeFileFor(SRC_LOCALES_ROOT, lang);
    if (!srcFile) continue;
    const srcDoc = readJson(srcFile);

    let srcChanged = migrateLegacyAiKeys(srcDoc);
    srcChanged = syncMissingKeys(srcDoc, sourceEn, usedKeys) || srcChanged;
    if (SHOULD_WRITE && srcChanged) {
      writeJson(srcFile, srcDoc);
      console.log(`Updated src locale: ${lang}`);
    }

  }

  if (SHOULD_WRITE && enChanged) {
    writeJson(EN_SOURCE_FILE, sourceEn);
    console.log('Updated source EN locale with legacy AI key migration.');
  }

  if (!SHOULD_WRITE) {
    console.log('i18n check passed.');
  }
}

main();
