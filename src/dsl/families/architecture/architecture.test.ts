import { describe, expect, it } from 'vitest';
import { compile, compileWorkspace } from '../../compile';
import { format } from '../../serialize';
import { dslFrameRaw, dslNodeMeta } from '../../sceneMeta';

const CONTEXT = `architecture
model {
  person Customer
  system Shop @core
  external Stripe
  Customer -> Shop : buys
  Shop -> Stripe : charges [tech: HTTPS]
}
views {
  view context of Shop
}
`;

const CONTAINER = `architecture
model {
  person Customer
  system Shop {
    container Web [tech: React]
    container API [tech: Go]
    store DB [tech: Postgres]
    Web -> API : calls
    API -> DB : reads
  }
  Customer -> Shop.Web : uses
}
views { view container of Shop }
`;

const TWO_SYSTEMS = `architecture
model {
  system Shop {
    container API
  }
  system Billing {
    container Worker
  }
  Shop.API -> Billing.Worker : invoices
}
views {
  view landscape
  view context of Shop
  view container of Shop
}
`;

describe('architecture canonical text (grammar §14.16–14.20)', () => {
  it('context level', async () => {
    expect(await format(CONTEXT)).toBe(`%% ofk 1
architecture

model {
  person Customer
  system Shop [tags: core]
  external Stripe
  Customer -> Shop : buys
  Shop -> Stripe : charges [tech: HTTPS]
}
views {
  view context of Shop
}
`);
  });

  it('container level keeps store: cylinder', async () => {
    expect(await format(CONTAINER)).toBe(`%% ofk 1
architecture

model {
  person Customer
  system Shop {
    container Web [tech: React]
    container API [tech: Go]
    store DB [cylinder, tech: Postgres]
    Web -> API : calls
    API -> DB : reads
  }
  Customer -> Web : uses
}
views {
  view container of Shop
}
`);
  });

  it('component level with predicates', async () => {
    const text = `architecture
model {
  system Shop { container API { component Router; component Orders; component Auth @deprecated; Router -> Orders; Router -> Auth } }
}
views {
  view component of Shop.API { exclude * where tag is @deprecated }
}
`;
    expect(await format(text)).toBe(`%% ofk 1
architecture

model {
  system Shop {
    container API {
      component Router
      component Orders
      component Auth [tags: deprecated]
      Router -> Orders
      Router -> Auth
    }
  }
}
views {
  view component of Shop.API {
    exclude * where tag is @deprecated
  }
}
`);
  });

  it('deployment blocks and instances', async () => {
    const text = `architecture
model { system Shop { container API; store DB } }
deployment Prod {
  node AWS [aws/cloud] {
    node ECS { instance Shop.API }
    node RDS { instance Shop.DB }
  }
}
views { view deployment of Shop in Prod }
`;
    expect(await format(text)).toBe(`%% ofk 1
architecture

model {
  system Shop {
    container API
    store DB [cylinder]
  }
}
deployment Prod {
  node AWS [aws/cloud] {
    node ECS {
      instance Shop.API
    }
    node RDS {
      instance Shop.DB
    }
  }
}
views {
  view deployment of Shop in Prod
}
`);
  });

  it('flows with alt, par, goto and note round-trip', async () => {
    const text = `architecture
model { person Customer; system Shop { container Web; container API; store DB } }
flow "Checkout" {
  intro "Customer opens the cart"
  step Customer -> Web : opens cart
  alt "paid" {
    step Web -> API : POST /orders
  } else {
    process "Retry payment"
  }
  par {
    step API -> DB : write
  } and {
    step API -> Web : notify
  }
  goto "Fulfilment"
  note "Idempotent by order id"
  conclusion "Order confirmed"
}
`;
    const first = await format(text);
    expect(first).toContain('flow "Checkout" {');
    expect(first).toContain('  alt paid {');
    expect(first).toContain('  } else {');
    expect(first).toContain('    process Retry payment');
    expect(first).toContain('  par {');
    expect(first).toContain('  } and {');
    expect(first).toContain('  goto Fulfilment');
    expect(first).toContain('  note Idempotent by order id');
    expect(await format(first)).toBe(first);
  });

  it('keeps explicit ids, colours, links and view directions', async () => {
    const text = `architecture
model {
  api = system "Payments API" [blue]
  docs = system Docs [link: https://example.com/adr/1]
  api -> docs : links
}
views { view custom "Links" [right] { include api } }
`;
    const canonical = await format(text);
    expect(canonical).toContain('api = system Payments API [blue]');
    expect(canonical).toContain('system Docs [link: https://example.com/adr/1]');
    expect(canonical).toContain('view custom "Links" [right]');
    expect(await format(canonical)).toBe(canonical);
    const compiled = await compile(text);
    expect(compiled.nodes.find((node) => node.id === 'api')?.appearance.fill).toBe('#eff6ff');
  });

  it('names deployment instances after their target and keeps node origins', async () => {
    const compiled = await compile(`architecture
model { system Shop { container API } }
deployment Prod { node AWS { node ECS { instance Shop.API } } }
views { view deployment of Shop in Prod }
`);
    const instance = [...compiled.nodes, ...compiled.groups].find((node) => node.id.endsWith('shop-api'))!;
    expect(instance.content.label).toBe('API');
    expect(instance.metadata.model).toMatchObject({ elementId: instance.id, instanceOf: 'shop.api' });
    expect(compiled.groups.map((node) => node.id).sort()).toEqual(['aws', 'aws.ecs']);
    expect(await format(`architecture
model { system Shop { container API } }
deployment Prod { node AWS { node ECS { instance Shop.API } } }
`)).toContain('instance Shop.API');
  });

  it('resolves multi-word view scopes by name', async () => {
    const text = `architecture
model { system "Docs Site" { container Web; container API } }
views { view container of "Docs Site" }
`;
    const workspace = await compileWorkspace(text);
    expect(workspace.views[0]!.result.nodes.map((node) => node.id).sort()).toEqual(['docs-site.api', 'docs-site.web']);
    expect(await format(text)).toContain('view container of Docs Site');
  });

  it('is idempotent for every example', async () => {
    for (const text of [CONTEXT, CONTAINER, TWO_SYSTEMS]) {
      const canonical = await format(text);
      expect(await format(canonical)).toBe(canonical);
    }
  });
});

describe('architecture view scenes', () => {
  it('compiles one scene per view with stable ids and page names', async () => {
    const workspace = await compileWorkspace(TWO_SYSTEMS);
    expect(workspace.views.map((view) => view.viewId)).toEqual([
      'view:landscape', 'view:context:shop', 'view:container:shop',
    ]);
    expect(workspace.views.map((view) => view.name)).toEqual([
      'System landscape', 'context of Shop', 'container of Shop',
    ]);
    const container = workspace.views[2]!;
    expect(container.result.groups.map((node) => node.id)).toEqual(['shop']);
    // Billing boxes in as a related external system; API lives inside the Shop boundary.
    expect(container.result.nodes.map((node) => node.id).sort()).toEqual(['billing', 'shop.api']);
    expect(container.result.connectors.map((c) => `${c.source.nodeId}->${c.target.nodeId}`)).toEqual([
      'shop.api->billing',
    ]);
  });

  it('projects relations to the nearest shown ancestor and marks them implied', async () => {
    const context = (await compileWorkspace(TWO_SYSTEMS)).views[1]!;
    expect(context.result.nodes.map((node) => node.id).sort()).toEqual(['billing', 'shop']);
    expect(context.result.groups).toEqual([]);
    const edge = context.result.connectors[0]!;
    expect(`${edge.source.nodeId}->${edge.target.nodeId}`).toBe('shop->billing');
    expect(edge.metadata.model).toMatchObject({ implied: true });
    expect(edge.appearance).toMatchObject({ dashPattern: 'dashed' });
  });

  it('lays a boundary around its shown children', async () => {
    const container = (await compileWorkspace(CONTAINER)).views[0]!;
    const shop = container.result.groups[0]!;
    const web = container.result.nodes.find((node) => node.id === 'shop.web')!;
    expect(web.parentId).toBe('shop');
    expect(web.transform.translation.x).toBeGreaterThanOrEqual(0);
    expect(web.transform.translation.x + web.size.width).toBeLessThanOrEqual(shop.size.width);
    expect(shop.size.width).toBeGreaterThan(0);
  });

  it('carries the model and view id on the frame for the code panel', async () => {
    const compiled = await compile(CONTAINER);
    const raw = dslFrameRaw(compiled.frame);
    expect(raw.arch).toMatchObject({ view: 'view:container:shop' });
    expect((raw.arch as { model: { elements: unknown[] } }).model.elements).toHaveLength(5);
    expect(raw.family).toBe('architecture');
    expect(raw.source).toBe(CONTAINER);
  });

  it('tags nodes with their element id, tech, desc and tags', async () => {
    const compiled = await compile(CONTAINER);
    const db = compiled.nodes.find((node) => node.id === 'shop.db')!;
    expect(db.content).toMatchObject({ label: 'DB', subLabel: 'Postgres', shape: 'cylinder' });
    expect(db.metadata.model).toMatchObject({ elementId: 'shop.db' });
    const customer = compiled.nodes.find((node) => node.id === 'customer')!;
    expect(customer.content.shape).toBe('actor');
    expect(dslNodeMeta(db).id).toBe('shop.db');
  });

  it('filters predicates and keeps unsupported ones verbatim', async () => {
    const workspace = await compileWorkspace(`architecture
model { system Shop { container A; container B [tags: legacy] } }
views {
  view container of Shop { exclude B }
}
`);
    const page = workspace.views[0]!;
    // `shop` draws as a boundary because `shop.a` is shown inside it.
    expect(page.result.nodes.map((node) => node.id)).toEqual(['shop.a']);
    expect(page.result.groups.map((node) => node.id)).toEqual(['shop']);
    const unsupported = await compileWorkspace(`architecture
model { system Shop { container A } }
views { view container of Shop { include Shop.** where technology is React } }
`);
    expect(unsupported.views[0]!.result.diagnostics.some((item) => item.code === 'W160')).toBe(true);
    const canonical = await format(`architecture
model { system Shop { container A } }
views { view container of Shop { include Shop.** where technology is React } }
`);
    expect(canonical).toContain('include Shop.** where technology is React');
  });

  it('warns and drops unknown references, and keeps unknown lines verbatim', async () => {
    const compiled = await compile(`architecture
model {
  system Shop
  Mystery -> Shop : nothing
  properties { key value }
}
`);
    expect(compiled.diagnostics.some((item) => item.code === 'W122')).toBe(true);
    expect(compiled.diagnostics.some((item) => item.code === 'W101')).toBe(true);
    const canonical = await format(`architecture
model {
  system Shop
  properties { key value }
}
`);
    expect(canonical).toContain('properties {\n  key value\n}');
  });

  it('keeps frame metadata JSON-clean when a flow is present', async () => {
    const compiled = await compile(`architecture
model { person Customer; system Shop { container Web; container API } }
flow "Checkout" { intro "Start"; step Customer -> Web : opens; step Web -> API : posts; conclusion "Done" }
`);
    const raw = dslFrameRaw(compiled.frame);
    expect(JSON.parse(JSON.stringify(raw))).toEqual(raw);
    const arch = raw.arch as { model: { flows: Array<{ steps: Array<Record<string, unknown>> }> } };
    expect(arch.model.flows[0]!.steps.map((step) => step.from).filter(Boolean)).toEqual(['customer', 'shop.web']);
  });

  it('falls back to graph syntax when no C4 block is present', async () => {
    const compiled = await compile('architecture right\nAPI [aws/lambda]\nDB [cylinder]\nAPI -> DB : reads');
    expect(compiled.nodes.map((node) => node.id)).toEqual(['api', 'db']);
    expect(dslFrameRaw(compiled.frame).arch).toBeUndefined();
    expect(await format('architecture\nA -> B : x')).toContain('A -> B : x');
  });
});
