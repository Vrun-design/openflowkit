// Mermaid import, end to end: paste into the code panel, convert, generate, and
// check what actually lands on the canvas. The unit suites cover text → DSL;
// this one covers DSL → real nodes the user can then edit.
import { expect, test, type Page } from '@playwright/test';
import { MERMAID_COMPAT_FIXTURES } from '../scripts/mermaid-compat-fixtures.mjs';
import { centreOf, clickNode, connect, doc, midpointOf, node, openCanvas, rect, state } from './helpers';

const META = process.platform === 'darwin' ? 'Meta' : 'Control';

interface Fixture {
  name: string;
  family?: string;
  bucket?: string;
  source: string;
  structuralAssertions?: { minNodes?: number; minEdges?: number; minSections?: number; requiredLabels?: string[] };
}

const fixtures = MERMAID_COMPAT_FIXTURES as unknown as Fixture[];

/** Families the converter bridges today; `journey` stays reserved in the DSL. */
const CONVERTIBLE = new Set(['flowchart', 'sequence', 'stateDiagram', 'erDiagram', 'classDiagram', 'mindmap', 'gitGraph', 'architecture']);

async function openCodePanel(page: Page) {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await expect(source).toBeVisible();
  return source;
}

/** Every label on page 1, frame included; labels are what the user reads. */
async function labels(page: Page): Promise<string[]> {
  const document = await doc(page);
  return (document?.pages[0]?.nodes ?? [])
    .map((candidate) => (candidate as unknown as { content?: { label?: unknown } }).content?.label)
    .filter((label): label is string => typeof label === 'string' && label.length > 0);
}

/** Connector labels, so an edge's text is checked as well as its existence. */
async function connectorLabels(page: Page): Promise<string[]> {
  const document = await doc(page);
  return (document?.pages[0]?.connectors ?? [])
    .flatMap((connector) => (connector as unknown as { labels?: { text: string }[] }).labels ?? [])
    .map(({ text }) => text);
}

/** Paste Mermaid, convert it in place, generate, and wait for the canvas to settle. */
async function importMermaid(page: Page, source: string, mermaid: string) {
  await source.fill(mermaid);
  await expect(page.getByText('Mermaid detected.')).toBeVisible();
  await page.getByRole('button', { name: /^Convert/ }).click();
  await expect.poll(async () => (await source.inputValue()) !== mermaid).toBe(true);
  const converted = await source.inputValue();
  await source.press(`${META}+Enter`);
  // Two fixtures can convert to byte-identical DSL, so the wait is "the canvas
  // has nodes", not "the revision moved": an unchanged document bumps nothing.
  await expect.poll(async () => (await state(page)).nodes.length, { timeout: 15_000 }).toBeGreaterThan(0);
  return converted;
}

/** Empties the canvas so the next fixture cannot pass on the last one's nodes. */
async function clearCanvas(page: Page) {
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press(`${META}+a`);
  await page.keyboard.press('Backspace');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(0);
}

test('flowchart: shapes, labelled edges, subgraphs and styles land on the canvas', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `flowchart LR
  A[Start] --> B{Check}
  B -->|yes| C(Go)
  B -.-> D[(Store)]
  subgraph API[API Layer]
    E[Edge] --> F[Fan]
  end
  C ==> D
  style A fill:#f66,stroke:#900`);
  const found = await labels(page);
  for (const label of ['Start', 'Check', 'Go', 'Store', 'Edge', 'Fan', 'API Layer']) expect(found).toContain(label);
  expect(await connectorLabels(page)).toContain('yes');
  expect((await state(page)).connectors.length).toBeGreaterThanOrEqual(5);
});

test('sequence: participants, messages, notes and fragments survive the import', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `sequenceDiagram
  autonumber
  actor User
  participant API
  participant DB
  User->>API: submit
  activate API
  Note over API: validating
  alt valid
    API->>DB: write
    DB-->>API: ok
  else invalid
    API-->>User: error
  end
  deactivate API`);
  const found = await labels(page);
  for (const label of ['User', 'API', 'DB']) expect(found).toContain(label);
  expect(await connectorLabels(page)).toEqual(expect.arrayContaining(['submit', 'write', 'ok', 'error']));
});

test('state: composites, pseudo-states and transition labels land', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `stateDiagram-v2
  [*] --> Idle
  Idle --> Running : start
  state Running {
    [*] --> Warm
    Warm --> Hot : heat
  }
  Running --> [*]`);
  const found = await labels(page);
  for (const label of ['Idle', 'Running', 'Warm', 'Hot']) expect(found).toContain(label);
  expect(await connectorLabels(page)).toEqual(expect.arrayContaining(['start', 'heat']));
});

test('er: entities keep their fields and crow-foot relations', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    int id PK
  }`);
  const found = await labels(page);
  for (const label of ['CUSTOMER', 'ORDER', 'LINE_ITEM']) expect(found).toContain(label);
  expect(await connectorLabels(page)).toEqual(expect.arrayContaining(['places', 'contains']));
});

test('class: members, stereotypes and relation cardinalities land', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `classDiagram
  class Animal {
    +String name
    +eat() void
  }
  class Dog
  <<interface>> Animal
  Animal <|-- Dog
  Dog "1" --> "many" Toy : owns`);
  const found = await labels(page);
  for (const label of ['Animal', 'Dog', 'Toy']) expect(found).toContain(label);
  expect(await connectorLabels(page)).toContain('owns');
});

test('mindmap: the root and every branch land', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `mindmap
  root((Research))
    Sources
      Papers
      Talks
    Notes`);
  const found = await labels(page);
  for (const label of ['Research', 'Sources', 'Papers', 'Talks', 'Notes']) expect(found).toContain(label);
});

test('gitGraph: commits, branches, merges and tags land', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `gitGraph
  commit id: "Init"
  branch develop
  checkout develop
  commit id: "Feature" tag: "v1.0"
  checkout main
  merge develop`);
  const found = await labels(page);
  for (const label of ['Init', 'Feature']) expect(found).toContain(label);
  expect((await state(page)).nodes.length).toBeGreaterThanOrEqual(3);
});

test('architecture: groups, icons, junctions and pinned sides land', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `architecture-beta
  group api(cloud)[API]
  service db(database)[Database] in api
  service disk1(disk)[Storage] in api
  service gateway(internet)[Gateway]
  db:L -- R:disk1
  gateway:B --> T:db`);
  const found = await labels(page);
  for (const label of ['API', 'Database', 'Storage', 'Gateway']) expect(found).toContain(label);
  expect((await state(page)).connectors.length).toBeGreaterThanOrEqual(2);
});

test('an imported node is a real editable node: drag, undo, delete', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `flowchart LR
  A[Start] --> B[Ship]`);
  await page.getByRole('button', { name: 'Close' }).first().click();
  const document = await doc(page);
  const target = document!.pages[0]!.nodes.find((candidate) => (candidate as unknown as { content?: { label?: string } }).content?.label === 'Ship')!;
  expect(target).toBeTruthy();
  const startX = (await node(page, target.id)).transform!.translation.x;

  await clickNode(page, target.id);
  await expect.poll(async () => (await state(page)).selectedNodes).toContain(target.id);
  // One nudge = one undo step, so a single press keeps the undo check honest.
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await node(page, target.id)).transform!.translation.x).toBeGreaterThan(startX);

  await page.keyboard.press(`${META}+z`);
  await expect.poll(async () => (await node(page, target.id)).transform!.translation.x).toBe(startX);

  await page.keyboard.press('Backspace');
  await expect.poll(async () => (await state(page)).nodes).not.toContain(target.id);
});

test('a whole import is one undo step', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, `flowchart LR
  A[Start] --> B[Ship]`);
  expect((await state(page)).nodes.length).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await state(page)).nodes.length).toBe(0);
});

test('a reserved family reports an error instead of half a diagram', async ({ page }) => {
  const source = await openCodePanel(page);
  await source.fill(`journey
  title My day
  section Go to work
    Make tea: 5: Me`);
  await expect(page.getByText('Mermaid detected.')).toBeVisible();
  await page.getByRole('button', { name: /^Convert/ }).click();
  await expect(page.locator('#v2-code-diagnostics')).toBeVisible();
  expect((await state(page)).nodes).toEqual([]);
});

test('every editable corpus fixture imports onto the canvas', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const editable = fixtures.filter((fixture) =>
    (fixture.bucket === 'editable_full' || fixture.bucket === 'editable_partial') && CONVERTIBLE.has(fixture.family ?? ''));
  expect(editable.length).toBeGreaterThan(30);
  const source = await openCodePanel(page);
  const failures: string[] = [];
  for (const fixture of editable) {
    try {
      await clearCanvas(page);
      await importMermaid(page, source, fixture.source);
      const found = await labels(page);
      const wanted = fixture.structuralAssertions?.requiredLabels ?? [];
      const missing = wanted.filter((label) => !found.includes(label));
      if (missing.length > 0) failures.push(`${fixture.name}: missing labels ${missing.join(', ')}`);
      const minNodes = fixture.structuralAssertions?.minNodes ?? 1;
      if ((await state(page)).nodes.length < minNodes) failures.push(`${fixture.name}: fewer than ${minNodes} nodes`);
      const errors = await page.locator('#v2-code-diagnostics [data-tone="error"]').allInnerTexts();
      if (errors.length > 0) failures.push(`${fixture.name}: ${errors.join(' | ')}`);
    } catch (error) {
      failures.push(`${fixture.name}: ${(error as Error).message.split('\n')[0]}`);
    }
  }
  expect(failures).toEqual([]);
});

const COMPLEX_FLOW = `flowchart TD
  Start([Request]) --> Auth{Authenticated?}
  Auth -->|no| Login[Login Page]
  Login --> Auth
  Auth -->|yes| Router[Router]
  subgraph Services[Service Layer]
    Router --> Orders[Order Service]
    Router --> Billing[Billing Service]
    Orders -.-> Queue[(Queue)]
    Billing ==> Ledger[(Ledger)]
  end
  subgraph Storage[Storage Layer]
    Queue --> Worker[Worker]
    Worker --> Warehouse[(Warehouse)]
  end
  Ledger --> Warehouse
  Warehouse --> Report[/Report/]
  Report --> Done([Done])`;

/** The canvas node carrying this label, or a failure naming what was there. */
async function idForLabel(page: Page, label: string): Promise<string> {
  const document = await doc(page);
  const found = (document?.pages[0]?.nodes ?? [])
    .find((candidate) => (candidate as unknown as { content?: { label?: string } }).content?.label === label);
  if (!found) throw new Error(`no node labelled "${label}"`);
  return found.id;
}

const labelOf = async (page: Page, id: string): Promise<string | undefined> =>
  (await node(page, id) as unknown as { content?: { label?: string } }).content?.label;

test('a complex import is fully editable: rename, drag, resize, connect, delete, undo', async ({ page }) => {
  test.setTimeout(120_000);
  const source = await openCodePanel(page);
  await importMermaid(page, source, COMPLEX_FLOW);
  const imported = await labels(page);
  for (const label of ['Request', 'Authenticated?', 'Login Page', 'Router', 'Order Service', 'Billing Service', 'Queue', 'Ledger', 'Worker', 'Warehouse', 'Report', 'Done', 'Service Layer', 'Storage Layer']) {
    expect(imported).toContain(label);
  }
  const importedNodes = (await state(page)).nodes.length;
  const importedConnectors = (await state(page)).connectors.length;
  expect(importedConnectors).toBeGreaterThanOrEqual(13);
  await page.getByRole('button', { name: 'Close' }).first().click();

  // A 14-node import overflows the viewport; fit it so every node is clickable.
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press(`${META}+0`);

  // Rename a node that came out of a nested subgraph.
  const worker = await idForLabel(page, 'Worker');
  await clickNode(page, worker);
  const centre = await centreOf(page, worker);
  await page.mouse.dblclick(centre.x, centre.y);
  await expect(page.getByRole('textbox', { name: 'Edit node label' })).toBeVisible();
  await page.keyboard.press(`${META}+a`);
  await page.keyboard.type('Batch Worker');
  await page.keyboard.press(`${META}+Enter`);
  await expect.poll(async () => labelOf(page, worker)).toBe('Batch Worker');

  // Drag it; the connectors bound to it follow.
  const before = (await node(page, worker)).transform!.translation;
  await clickNode(page, worker);
  const grab = await centreOf(page, worker);
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 140, grab.y + 90, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await node(page, worker)).transform!.translation.x).toBeGreaterThan(before.x);

  // Resize from the south-east handle.
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const beforeRect = (await rect(page, worker))!;
  const corner = { x: box.x + beforeRect.x + beforeRect.width, y: box.y + beforeRect.y + beforeRect.height };
  await page.mouse.move(corner.x, corner.y);
  await page.mouse.down();
  await page.mouse.move(corner.x + 70, corner.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await rect(page, worker))!.width - beforeRect.width)).toBe(70);

  // Draw a new connector between two imported nodes, then delete an imported one.
  const billing = await idForLabel(page, 'Billing Service');
  const report = await idForLabel(page, 'Report');
  await connect(page, billing, report);
  expect((await state(page)).connectors.length).toBe(importedConnectors + 1);

  await page.keyboard.press('Escape');
  const doomed = (await state(page)).connectors[0]!;
  // Screen samples already carry the camera, which ⌘0 left at an odd zoom.
  const lane = await page.evaluate((id: string) =>
    (window as unknown as { __V2__: { getConnectorScreenSamples(id: string): { x: number; y: number }[] | null } })
      .__V2__.getConnectorScreenSamples(id), doomed);
  const mid = midpointOf(lane!);
  await page.mouse.click(box.x + mid.x, box.y + mid.y);
  await expect.poll(async () => (await state(page)).selectedConnector).toBe(doomed);
  await page.keyboard.press('Backspace');
  await expect.poll(async () => (await state(page)).connectors.length).toBe(importedConnectors);

  // Every edit undoes, one step each, back to the imported diagram.
  for (let step = 0; step < 5; step += 1) await page.keyboard.press(`${META}+z`);
  await expect.poll(async () => (await state(page)).connectors.length).toBe(importedConnectors);
  await expect.poll(async () => labelOf(page, worker)).toBe('Worker');
  expect((await state(page)).nodes.length).toBe(importedNodes);
  expect(Math.round((await node(page, worker)).transform!.translation.x)).toBe(Math.round(before.x));
});

test('a complex import keeps its groups: moving a group carries its members', async ({ page }) => {
  test.setTimeout(120_000);
  const source = await openCodePanel(page);
  await importMermaid(page, source, COMPLEX_FLOW);
  await page.getByRole('button', { name: 'Close' }).first().click();
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press(`${META}+0`);
  const group = await idForLabel(page, 'Service Layer');
  const member = await idForLabel(page, 'Order Service');
  expect((await node(page, member)).parentId).toBe(group);

  // A member's translation is parent-relative, so containment shows up as the
  // member's *screen* position following the group while its local offset holds.
  const localBefore = (await node(page, member)).transform!.translation;
  const screenBefore = (await rect(page, member))!;
  const groupBefore = (await node(page, group)).transform!.translation;
  const handle = (await rect(page, group))!;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.move(box.x + handle.x + handle.width / 2, box.y + handle.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + handle.x + handle.width / 2 + 120, box.y + handle.y + 12 + 60, { steps: 10 });
  await page.mouse.up();

  await expect.poll(async () => (await node(page, group)).transform!.translation.x).toBeGreaterThan(groupBefore.x);
  expect((await node(page, group)).transform!.translation.y).toBeGreaterThan(groupBefore.y);
  expect((await node(page, member)).transform!.translation).toEqual(localBefore);
  expect((await rect(page, member))!.x).toBeGreaterThan(screenBefore.x);
  expect((await rect(page, member))!.y).toBeGreaterThan(screenBefore.y);

  await page.keyboard.press(`${META}+z`);
  await expect.poll(async () => Math.round((await node(page, group)).transform!.translation.x)).toBe(Math.round(groupBefore.x));
  expect(Math.round((await rect(page, member))!.x)).toBe(Math.round(screenBefore.x));
});

/** One deliberately busy diagram per family, each exercising that family's own constructs. */
const COMPLEX_BY_FAMILY: ReadonlyArray<{ family: string; source: string; labels: string[]; minConnectors: number }> = [
  {
    family: 'sequence',
    minConnectors: 6,
    labels: ['Shopper', 'Storefront', 'Payments', 'Ledger'],
    source: `sequenceDiagram
  autonumber
  actor Shopper
  participant Storefront
  participant Payments
  participant Ledger
  Shopper->>Storefront: checkout
  activate Storefront
  Storefront->>Payments: authorise
  alt authorised
    Payments-->>Storefront: token
    Storefront->>Ledger: record
    Ledger-->>Storefront: entry
  else declined
    Payments-->>Storefront: decline
  end
  Note over Storefront,Ledger: receipts are async
  Storefront-->>Shopper: confirmation
  deactivate Storefront`,
  },
  {
    family: 'state',
    minConnectors: 7,
    labels: ['Queued', 'Running', 'Preparing', 'Working', 'Paused', 'Failed', 'Archived'],
    source: `stateDiagram-v2
  [*] --> Queued
  Queued --> Running : pick up
  state Running {
    [*] --> Preparing
    Preparing --> Working : ready
    Working --> [*] : finished
  }
  Running --> Paused : pause
  Paused --> Running : resume
  Running --> Failed : error
  Failed --> Archived : give up
  Archived --> [*]`,
  },
  {
    family: 'er',
    minConnectors: 4,
    labels: ['CUSTOMER', 'ORDER', 'LINE_ITEM', 'PRODUCT', 'ADDRESS'],
    source: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  CUSTOMER ||--|{ ADDRESS : "ships to"
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "sold as"
  CUSTOMER {
    string name
    string email UK
    int id PK
  }
  ORDER {
    int id PK
    int customerId FK
    string status
  }`,
  },
  {
    family: 'class',
    minConnectors: 4,
    labels: ['Shape', 'Circle', 'Square', 'Canvas', 'Renderer'],
    source: `classDiagram
  class Shape {
    <<abstract>>
    +String id
    +area() float
  }
  class Circle {
    +float radius
    +area() float
  }
  class Square
  class Canvas {
    +List~Shape~ shapes
    +draw() void
  }
  class Renderer
  Shape <|-- Circle
  Shape <|-- Square
  Canvas "1" o-- "many" Shape : holds
  Canvas --> Renderer : paints with`,
  },
  {
    family: 'architecture',
    minConnectors: 4,
    labels: ['Edge', 'Core', 'CDN', 'Gateway', 'Orders', 'Postgres', 'Cache'],
    source: `architecture-beta
  group edge(cloud)[Edge]
  service cdn(internet)[CDN] in edge
  service gateway(server)[Gateway] in edge
  group core(cloud)[Core]
  service orders(server)[Orders] in core
  service db(database)[Postgres] in core
  service cache(disk)[Cache] in core
  cdn:R --> L:gateway
  gateway:R --> L:orders
  orders:B --> T:db
  orders:R -- L:cache`,
  },
  {
    family: 'mindmap',
    minConnectors: 6,
    labels: ['Launch', 'Marketing', 'Docs', 'Pricing', 'Engineering', 'Migration', 'Load tests'],
    source: `mindmap
  root((Launch))
    Marketing
      Docs
      Pricing
    Engineering
      Migration
      Load tests`,
  },
];

for (const { family, source: mermaid, labels: wanted, minConnectors } of COMPLEX_BY_FAMILY) {
  test(`a complex ${family} diagram imports whole and stays editable`, async ({ page }) => {
    test.setTimeout(120_000);
    const source = await openCodePanel(page);
    await importMermaid(page, source, mermaid);
    const found = await labels(page);
    for (const label of wanted) expect(found).toContain(label);
    expect((await state(page)).connectors.length).toBeGreaterThanOrEqual(minConnectors);
    await page.getByRole('button', { name: 'Close' }).first().click();
    await page.getByTestId('v2-canvas').focus();
    await page.keyboard.press(`${META}+0`);

    // The busiest node of each family renames, moves and undoes like any other.
    const target = await idForLabel(page, wanted[wanted.length - 1]!);
    await clickNode(page, target);
    const centre = await centreOf(page, target);
    await page.mouse.dblclick(centre.x, centre.y);
    await expect(page.getByRole('textbox', { name: 'Edit node label' })).toBeVisible();
    await page.keyboard.press(`${META}+a`);
    await page.keyboard.type('Renamed');
    await page.keyboard.press(`${META}+Enter`);
    await expect.poll(async () => labelOf(page, target)).toBe('Renamed');

    const before = (await node(page, target)).transform!.translation;
    await clickNode(page, target);
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await node(page, target)).transform!.translation.x).toBeGreaterThan(before.x);
    await page.keyboard.press(`${META}+z`);
    await expect.poll(async () => (await node(page, target)).transform!.translation.x).toBe(before.x);
    await page.keyboard.press(`${META}+z`);
    await expect.poll(async () => labelOf(page, target)).toBe(wanted[wanted.length - 1]!);
  });
}

test('flowchart direction survives the import: TD stacks, LR spreads', async ({ page }) => {
  const source = await openCodePanel(page);
  await importMermaid(page, source, 'flowchart TD\n  A[Start] --> B[Middle] --> C[Ship]');
  const down = { start: await idForLabel(page, 'Start'), ship: await idForLabel(page, 'Ship') };
  const downStart = (await node(page, down.start)).transform!.translation;
  const downShip = (await node(page, down.ship)).transform!.translation;
  expect(downShip.y).toBeGreaterThan(downStart.y);

  await clearCanvas(page);
  await importMermaid(page, source, 'flowchart LR\n  A[Start] --> B[Middle] --> C[Ship]');
  const right = { start: await idForLabel(page, 'Start'), ship: await idForLabel(page, 'Ship') };
  const rightStart = (await node(page, right.start)).transform!.translation;
  const rightShip = (await node(page, right.ship)).transform!.translation;
  expect(rightShip.x).toBeGreaterThan(rightStart.x);
  expect(Math.abs(rightShip.y - rightStart.y)).toBeLessThan(Math.abs(downShip.y - downStart.y));
});
