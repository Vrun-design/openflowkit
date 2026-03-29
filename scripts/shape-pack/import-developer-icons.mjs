import fs from 'node:fs/promises';
import path from 'node:path';

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

const CATEGORY_RULES = [
  {
    category: 'Languages',
    patterns: [
      'javascript', 'typescript', 'python', 'java', 'kotlin', 'swift', 'php', 'ruby', 'rust',
      'scala', 'haskell', 'elixir', 'erlang', 'nim', 'dlang', 'solidity', 'bash', 'powershell',
      'json', 'markdown',
    ],
  },
  {
    category: 'Frontend',
    patterns: [
      'react', 'nextjs', 'vue', 'nuxt', 'angular', 'svelte', 'astro', 'vitejs', 'webpack',
      'tailwind', 'sass', 'jquery', 'chakraui', 'materialui', 'shadcnui', 'headlessui',
      'remix', 'gatsby', 'threejs', 'framer',
    ],
  },
  {
    category: 'Backend',
    patterns: [
      'nodejs', 'deno', 'bunjs', 'spring', 'symfony', 'cakephp', 'doctrine', 'nestjs',
      'graphql', 'trpc', 'convex', 'grafbase', 'i18next', 'zod', 'avajs',
    ],
  },
  {
    category: 'Database',
    patterns: [
      'postgres', 'mysql', 'mariadb', 'mongodb', 'redis', 'sqlite', 'supabase', 'firebase',
      'clickhouse', 'presto', 'microsoft-sql-server', 'oracle', 'kibana',
    ],
  },
  {
    category: 'Design',
    patterns: ['figma', 'sketch', 'indesign', 'photoshop', 'illustrator', 'miro'],
  },
  {
    category: 'Native-App',
    patterns: ['android', 'flutter', 'react-native', 'swiftui', 'xcode'],
  },
  {
    category: 'DevOps-AI-ML',
    patterns: [
      'aws', 'ec2', 'google-cloud', 'cloudflare', 'docker', 'kubernetes', 'pulumi', 'netlify',
      'railway', 'heroku', 'vercel', 'git', 'github', 'gitlab', 'bitbucket', 'linux',
      'tensorflow', 'openai', 'hugging-face', 'copilot', 'codefresh', 'k6', 'cypress',
      'vitest', 'nx', 'npm', 'pnpm', 'developer-icons', 'elastic',
    ],
  },
  {
    category: 'Productivity',
    patterns: ['notion', 'lokalise', 'gmail', 'outlook', 'onedrive'],
  },
  {
    category: 'Media',
    patterns: ['youtube', 'instagram', 'telegram', 'mastodon', 'threads', 'bluesky', 'vk', 'x-', 'stream', 'cloudinary', 'hotjar'],
  },
  {
    category: 'Companies',
    patterns: ['meta', 'microsoft', 'mozilla'],
  },
  {
    category: 'Browser',
    patterns: ['chrome', 'firefox', 'safari', 'edge', 'vivaldi'],
  },
];

function inferCategory(fileName) {
  const normalized = slugify(fileName);

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => normalized.includes(pattern))) {
      return rule.category;
    }
  }

  return 'Others';
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

const [, , sourceRootArg, outputRootArg] = process.argv;

if (!sourceRootArg || !outputRootArg) {
  console.error('Usage: node scripts/shape-pack/import-developer-icons.mjs <sourceRoot> <outputRoot>');
  process.exit(1);
}

const sourceRoot = path.resolve(sourceRootArg);
const outputRoot = path.resolve(outputRootArg);
const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
const iconEntries = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.svg'));

for (const entry of iconEntries) {
  const fileName = entry.name.replace(/\.svg$/i, '');
  const category = inferCategory(fileName);
  const categoryDir = path.join(outputRoot, category);

  await ensureDir(categoryDir);
  await fs.copyFile(
    path.join(sourceRoot, entry.name),
    path.join(categoryDir, `${entry.name}`),
  );
}

console.log(`Imported ${iconEntries.length} developer icon SVGs into ${outputRoot}`);
