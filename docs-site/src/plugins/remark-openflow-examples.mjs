// Turns a ```` ```openflow ```` fence into a figure that shows the compiled
// diagram beside its source. The SVGs and their manifest are produced by
// scripts/build-examples.mts from the same block (content-addressed hash), so
// the picture on the page is the repository's own compiler output, never a
// pasted render. A block the build script never saw fails here, loudly.
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXAMPLE_LANG, hashExample } from '../../scripts/example-blocks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const MANIFEST = resolve(HERE, '..', '..', 'public', 'examples', 'examples.json');

function xml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function loadManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    throw new Error(`Rendered examples are missing (${relative(REPO_ROOT, MANIFEST)}). Run \`npm run generate:examples\`.`);
  }
}

function viewMarkup(view, family) {
  const alt = `${family} diagram rendered by OpenFlowKit from the source beside it`;
  const images = `<img class="ofk-example-light" src="/examples/${xml(view.light)}" alt="${xml(alt)}" width="${view.width}" height="${view.height}" loading="lazy" decoding="async">`
    + `<img class="ofk-example-dark" src="/examples/${xml(view.dark)}" alt="${xml(alt)}" width="${view.width}" height="${view.height}" loading="lazy" decoding="async">`;
  return view.name
    ? `<div class="ofk-example-view">${images}<span class="ofk-example-view-name">${xml(view.name)}</span></div>`
    : `<div class="ofk-example-view">${images}</div>`;
}

function figureFor(value, file) {
  const manifest = loadManifest();
  const entry = manifest[hashExample(value)];
  const where = file?.path ? relative(REPO_ROOT, file.path) : 'a markdown file';
  if (!entry) throw new Error(`${where}: an \`\`\`openflow block is not in examples.json; run \`npm run generate:examples\`.`);
  const views = entry.views.map((view) => viewMarkup(view, entry.family)).join('');
  return [
    `<figure class="ofk-example" data-family="${xml(entry.family)}"><div class="ofk-example-render">${views}</div><div class="ofk-example-source">`,
    '</div></figure>',
  ];
}

function html(value) {
  return { type: 'html', value };
}

/** Replaces code nodes in place; recurses into every children array. */
function transform(children, file) {
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.type === 'code' && node.lang === EXAMPLE_LANG) {
      const [open, close] = figureFor(node.value, file);
      // Expressive Code has no `openflow` grammar; `text` is the honest
      // fallback and keeps the build quiet. The rendered diagram is the point.
      node.lang = 'text';
      children.splice(index, 1, html(open), node, html(close));
      index += 2;
      continue;
    }
    if (Array.isArray(node?.children)) transform(node.children, file);
  }
}

export function remarkOpenflowExamples() {
  return (tree, file) => {
    transform(tree.children ?? [], file);
  };
}
