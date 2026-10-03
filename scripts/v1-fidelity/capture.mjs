// Phase 12.0: capture REAL v1 storage records as fixtures. v1's own code writes every
// record — its UI for Mermaid import, pages, image drop and templates; its store actions
// for delete and the import-mode setting — and this script dumps what landed in
// IndexedDB / localStorage. Run once, commit the output.
//
//   (cd ../ofk-main && npx vite --port 5179)        # git worktree of `main`
//   (cd ../ofk-premarch && npx vite --port 5180)    # c3e3b92, last build before 2026-03-27
//   node scripts/v1-fidelity/capture.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const V1 = process.env.V1_URL ?? 'http://127.0.0.1:5179';
const PREMARCH = process.env.PREMARCH_URL ?? 'http://127.0.0.1:5180';
const OUT = 'src/services/storage/v2/__fixtures__/v1';

// Inputs only — what a user would paste. The fixtures are what v1 made of them.
const MERMAID = {
  flowchart: `flowchart TD
  A([Start]) --> B[Receive order]
  B --> C{In stock?}
  C -->|yes| D[Pack items]
  C -->|no| E[Back-order]
  E --> F[(Inventory DB)]
  D --> G[Ship]
  subgraph Fulfilment
    D
    G
  end
  G --> H([Done])`,
  stateDiagram: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading: fetch
  Loading --> Ready: ok
  Loading --> Failed: error
  Failed --> Loading: retry
  Ready --> [*]`,
  classDiagram: `classDiagram
  class Animal {
    +String name
    +int age
    +speak() void
  }
  class Dog {
    +fetch() void
  }
  class Owner {
    +String email
  }
  Animal <|-- Dog
  Owner "1" --> "*" Dog : owns`,
  erDiagram: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string id PK
    string email
  }
  ORDER {
    string id PK
    string customerId FK
    date placedAt
  }
  LINE_ITEM {
    string orderId FK
    int qty
  }`,
  mindmap: `mindmap
  root((Launch))
    Product
      Editor
      MCP server
    Marketing
      Blog post
      Video
    Ops
      Hosting`,
  journey: `journey
  title Checkout
  section Browse
    Find product: 5: Shopper
    Read reviews: 3: Shopper
  section Buy
    Add to cart: 4: Shopper
    Pay: 2: Shopper, Bank`,
  architecture: `architecture-beta
  group api(cloud)[API]
  service db(database)[Database] in api
  service disk(disk)[Storage] in api
  service server(server)[Server] in api
  service gateway(internet)[Gateway]
  db:L -- R:server
  disk:T -- B:server
  gateway:R --> L:server`,
  sequence: `sequenceDiagram
  participant U as User
  participant W as Web
  participant A as API
  U->>W: Open page
  W->>A: GET /items
  alt cached
    A-->>W: 304
  else fresh
    A-->>W: 200 items
  end
  W-->>U: Render
  Note over W,A: Retries twice`,
};

async function newEditor(page, base) {
  await page.goto(`${base}/#/home`);
  await page.getByTestId(/^home-create-new(-main|-header)?$/).first().click();
  await page.waitForURL(/#\/flow\//);
  await page.getByTestId(/^flow-(page-)?tab$/).first().waitFor();
  return decodeURIComponent(page.url().split('#/flow/')[1].split('?')[0]);
}

async function commandBar(page, item) {
  await page.mouse.click(60, 820); // empty canvas, so ⌘K reaches the editor
  await page.keyboard.press('Meta+k');
  await page.getByText(item).first().click();
}

async function applyMermaid(page, source) {
  const apply = page.getByRole('button', { name: 'Apply to canvas' });
  if (!(await apply.isVisible())) await commandBar(page, 'Edit Mermaid Code');
  await page.locator('textarea').last().fill(source);
  await apply.click();
  await page.locator('.react-flow__node').first().waitFor();
  await page.waitForTimeout(1500); // v1 persists on a debounce
}

async function addPage(page) {
  await page.getByTestId(/^flow-(page|tab)-add$/).click();
  await page.waitForTimeout(500);
}

async function dropImage(page) {
  await page.evaluate(async () => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 64, height: 48 });
    const paint = canvas.getContext('2d');
    paint.fillStyle = '#2563eb';
    paint.fillRect(0, 0, 64, 48);
    paint.fillStyle = '#facc15';
    paint.fillRect(16, 12, 32, 24);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'photo.png', { type: 'image/png' }));
    const target = document.querySelector('.react-flow');
    const box = target.getBoundingClientRect();
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, bubbles: true, dataTransfer: transfer };
    target.dispatchEvent(new DragEvent('dragover', at));
    target.dispatchEvent(new DragEvent('drop', at));
  });
  await page.locator('.react-flow__node img').first().waitFor();
  await page.waitForTimeout(1500);
}

// Every store in the v1 database plus all of localStorage, untouched.
function dumpStorage(page) {
  return page.evaluate(async () => {
    const indexedDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open('openflowkit-persistence');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const names = [...db.objectStoreNames];
        const out = {};
        if (names.length === 0) return resolve(out);
        const tx = db.transaction(names, 'readonly');
        let pending = names.length;
        for (const name of names) {
          const all = tx.objectStore(name).getAll();
          all.onsuccess = () => {
            out[name] = all.result;
            if (--pending === 0) resolve(out);
          };
        }
      };
    });
    // JSON drops Blobs (v1 assets keep `bytes: Blob`); keep them as data URLs.
    const encode = (blob) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ $blob: reader.result });
      reader.readAsDataURL(blob);
    });
    for (const records of Object.values(indexedDb)) {
      for (const record of records) {
        for (const [key, value] of Object.entries(record)) {
          if (value instanceof Blob) record[key] = await encode(value);
        }
      }
    }
    return { indexedDb, localStorage: { ...localStorage } };
  });
}

function write(name, value) {
  writeFileSync(`${OUT}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`wrote ${OUT}/${name}`);
}

// HEADED=1: headless Chromium can't measure Mermaid SVG text, so renderer_first imports
// fall back to a 100×480 box and native imports get ELK positions instead of Mermaid's.
// Headed capture needs the owner's go.
const browser = await chromium.launch({ headless: !process.env.HEADED });
const fresh = async (init) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('hasSeenWelcome_v1', 'true'));
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on('pageerror', (error) => console.warn('v1 page error:', error.message));
  return { context, page };
};
mkdirSync(OUT, { recursive: true });
const manifest = {};

// 1. IndexedDB `documents`: one doc per diagramType, multi-page, image, deleted.
{
  const { context, page } = await fresh();
  // v1's default Mermaid mode is renderer_first: most types land as one mermaid_svg
  // node. Users who switched Settings → Mermaid Import Mode got editable nodes.
  for (const mode of ['renderer_first', 'native_editable']) {
    await page.goto(`${V1}/#/home`);
    await page.evaluate(async (mermaidImportMode) => {
      const { useFlowStore } = await import('/src/store.ts');
      useFlowStore.getState().setViewSettings({ mermaidImportMode });
    }, mode);
    for (const [diagramType, source] of Object.entries(MERMAID)) {
      manifest[await newEditor(page, V1)] = `${diagramType} (${mode})`;
      await applyMermaid(page, source);
    }
  }
  const multi = await newEditor(page, V1);
  manifest[multi] = 'multi-page';
  await applyMermaid(page, MERMAID.flowchart);
  await addPage(page);
  await applyMermaid(page, MERMAID.sequence);

  manifest[await newEditor(page, V1)] = 'image';
  await dropImage(page);

  const deleted = await newEditor(page, V1);
  manifest[deleted] = 'deleted';
  await applyMermaid(page, MERMAID.stateDiagram);
  await page.goto(`${V1}/#/home`);
  await page.evaluate(async (id) => {
    const { useFlowStore } = await import('/src/store.ts');
    useFlowStore.getState().deleteDocumentRecord(id);
  }, deleted);
  await page.waitForTimeout(1500);

  // Templates as users hold them: inserted through the picker into a fresh doc.
  const templateNames = await page.evaluate(async () => {
    const { getFlowTemplates } = await import('/src/services/templates.ts');
    return getFlowTemplates().map((template) => template.name);
  });
  for (const name of templateNames) {
    manifest[await newEditor(page, V1)] = `template: ${name}`;
    await commandBar(page, 'Start from Template');
    await page.getByText(name, { exact: true }).click();
    await page.locator('.react-flow__node').first().waitFor();
    await page.waitForTimeout(1500);
  }
  write('indexeddb.json', await dumpStorage(page));
  await context.close();
}

// 2. localStorage `openflowkit-documents-fallback`: v1 with IndexedDB unavailable.
{
  const { context, page } = await fresh(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined });
  });
  manifest[await newEditor(page, V1)] = 'fallback';
  await applyMermaid(page, MERMAID.flowchart);
  await page.goto(`${V1}/#/home`);
  await page.waitForTimeout(1000);
  write('localstorage-fallback.json', { localStorage: await page.evaluate(() => ({ ...localStorage })) });
  await context.close();
}

// 3. Pre-March `openflowkit-storage` (zustand `tabs`): the last build before documents.
{
  const { context, page } = await fresh();
  manifest[await newEditor(page, PREMARCH)] = 'pre-march tabs';
  await applyMermaid(page, MERMAID.flowchart);
  await addPage(page);
  await applyMermaid(page, MERMAID.classDiagram);
  await page.goto(`${PREMARCH}/#/home`);
  await page.waitForTimeout(1500);
  write('premarch-tabs.json', await dumpStorage(page));
  await context.close();
}

write('manifest.json', manifest);
await browser.close();
