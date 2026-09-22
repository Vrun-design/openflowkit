import { describe, expect, it } from 'vitest';
import { compile, compileWorkspace } from '../../dsl/compile';
import { format } from '../../dsl/serialize';
import { looksLikeStructurizr, structurizrToDsl, type StructurizrConversion } from './structurizrToDsl';

const fixtures = import.meta.glob('./fixtures/structurizr/*.txt', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const fixturePaths = Object.keys(fixtures).sort();

function convert(source: string): StructurizrConversion {
  const result = structurizrToDsl(source);
  if ('error' in result) throw new Error(`unexpected error: ${result.error}`);
  return result;
}

/** E, W101 and W122 are the import's red lines: the emitted text must never hit them. */
function hardDiagnostics(diagnostics: readonly { code: string; severity: string; line: number; message: string }[]): string[] {
  return diagnostics
    .filter((item) => item.severity === 'error' || item.code === 'W101' || item.code === 'W122')
    .map((item) => `${item.code} L${item.line}: ${item.message}`);
}

async function expectClean(dsl: string): Promise<void> {
  const workspace = await compileWorkspace(dsl);
  for (const view of workspace.views) expect(hardDiagnostics(view.result.diagnostics)).toEqual([]);
}

/** The emitted text is a fixed point of format after one pass (see the direction/id notes). */
async function expectIdempotent(dsl: string): Promise<void> {
  const once = await format(dsl);
  expect(await format(once)).toBe(once);
}

async function expectCleanAndIdempotent(dsl: string): Promise<void> {
  await expectClean(dsl);
  await expectIdempotent(dsl);
}

/** Every element drawn by any view: nodes plus the boundary containers. */
async function viewElementIds(dsl: string): Promise<string[]> {
  const workspace = await compileWorkspace(dsl);
  return [...new Set(workspace.views.flatMap((view) => [...view.result.nodes, ...view.result.groups].map((node) => node.id)))];
}

async function viewConnectorIds(dsl: string): Promise<string[]> {
  const workspace = await compileWorkspace(dsl);
  return [...new Set(workspace.views.flatMap((view) => view.result.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`)))];
}

describe('looksLikeStructurizr', () => {
  it('accepts workspace blocks and model + Structurizr-only keywords', () => {
    expect(looksLikeStructurizr('workspace "Bank" { model { person Customer } }')).toBe(true);
    expect(looksLikeStructurizr('model {\n  softwareSystem Shop\n}')).toBe(true);
    expect(looksLikeStructurizr('!identifiers flat\nmodel { system Shop }')).toBe(true);
    expect(looksLikeStructurizr('workspace { }')).toBe(true);
  });

  it('rejects OFK, Mermaid and prose', () => {
    expect(looksLikeStructurizr('%% ofk 1\narchitecture\nmodel { person Customer }')).toBe(false);
    expect(looksLikeStructurizr('architecture\nmodel { person Customer }')).toBe(false);
    expect(looksLikeStructurizr('flowchart LR\nA --> B')).toBe(false);
    expect(looksLikeStructurizr('model { a -> b }')).toBe(false);
    expect(looksLikeStructurizr('just some prose')).toBe(false);
  });
});

describe('header', () => {
  it('returns an error only when no workspace or model block exists', () => {
    expect(structurizrToDsl('person Customer')).toEqual({ error: 'No Structurizr workspace or model block found' });
    expect(structurizrToDsl('views { systemLandscape }')).toEqual({ error: 'No Structurizr workspace or model block found' });
    expect(convert('workspace { model { } }').dsl).toBe('%% ofk 1\narchitecture\n');
  });

  it('turns the workspace name into the title and drops the description with a loss', async () => {
    const result = convert('workspace "Big Bank" "The bank" { model { person "Customer" } }');
    expect(result.dsl.startsWith('%% ofk 1\narchitecture\ntitle: Big Bank\n\nmodel {')).toBe(true);
    expect(result.losses).toContain('workspace description dropped');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('accepts a bare model block without a workspace', async () => {
    const result = convert('model { softwareSystem "Shop" }');
    expect(result.dsl).not.toContain('title:');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('ignores // and # comments but keeps #hex colours', async () => {
    const result = convert(`workspace {
      // a workspace
      model {
        # a person
        person "Customer" // trailing comment
        softwareSystem "Shop" "desc" "core" # trailing hash
      }
      views {
        systemLandscape {
          include *
        }
        styles {
          element "core" {
            background #1168bd
            shape Box
          }
        }
      }
    }`);
    expect(result.dsl).toContain('person Customer');
    expect(result.dsl).toContain('system Shop [rect, color: #1168bd, desc: desc, tags: core]');
    await expectCleanAndIdempotent(result.dsl);
  });
});

describe('elements', () => {
  it('maps kinds, positional strings and nesting', async () => {
    const result = convert(`model {
      person "P" "the description" "the tech" "tag one, tag two"
      softwareSystem "S" "sys desc" "sys tech" "sys tag" {
        container "C" "c desc" "c tech" "c tag" {
          component "K" "k desc" "k tech" "k tag"
        }
      }
    }`);
    expect(result.dsl).toContain('person P [tech: the tech, desc: the description, tags: "tag one, tag two"]');
    expect(result.dsl).toContain('system S [tech: sys tech, desc: sys desc, tags: sys tag] {');
    expect(result.dsl).toContain('container C [tech: c tech, desc: c desc, tags: c tag] {');
    expect(result.dsl).toContain('component K [tech: k tech, desc: k desc, tags: k tag]');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('keeps an explicit id and the display label', async () => {
    const result = convert('workspace { model { x = container "Web API" "desc" { component "Router" } } }');
    expect(result.dsl).toContain('x = container Web API [desc: desc] {');
    expect(result.dsl).toContain('component Router');
    await expectClean(result.dsl);
    const compiled = await compile(result.dsl);
    expect(compiled.groups.map((group) => group.id)).toEqual(['x']);
    expect(compiled.nodes.map((node) => node.id)).toEqual(['x.router']);
  });

  it('emits a container with no parent', async () => {
    const result = convert('model { container "Orphan" }');
    expect(result.dsl).toContain('container Orphan');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('reads tags statements and drops url/properties/perspectives', async () => {
    const result = convert(`model {
      container "API" "desc" "Go" {
        tags "core, internal"
        url "https://wiki/api"
        properties { "team" "core" }
        perspectives { "Security" "high" "1" }
      }
    }`);
    expect(result.dsl).toContain('tags: "core, internal"');
    expect(result.dsl).not.toContain('wiki/api');
    expect(result.losses).toContain('url https://wiki/api dropped');
    expect(result.losses).toContain('properties dropped');
    expect(result.losses).toContain('perspectives dropped');
    expect(result.dsl).not.toContain('properties');
    await expectCleanAndIdempotent(result.dsl);
  });
});

describe('relations', () => {
  it('maps description, technology and tags', async () => {
    const result = convert(`model {
      softwareSystem "Shop"
      softwareSystem "Billing"
      Shop -> Billing "calls" "HTTPS" "sync, core"
    }`);
    expect(result.dsl).toContain('Shop -> Billing : calls [tech: HTTPS, tags: "sync, core"]');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('resolves a scoped arrow to the enclosing element', async () => {
    const result = convert(`model {
      softwareSystem "Shop" {
        container "Web"
        container "API"
        -> API "calls"
      }
    }`);
    expect(result.dsl).toContain('Shop -> API : calls');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('drops a nested relationship block with a loss', async () => {
    const result = convert(`model {
      softwareSystem "A"
      softwareSystem "B"
      A -> B "calls" { tags "async" }
    }`);
    expect(result.dsl).toContain('A -> B : calls');
    expect(result.dsl).not.toContain('async');
    expect(result.losses).toContain('relationship block A -> B flattened');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('uses dotted paths when display names repeat', async () => {
    const result = convert(`model {
      softwareSystem "A" { container "API" }
      softwareSystem "B" { container "API" }
      A.API -> B.API "calls"
    }`);
    expect(result.dsl).toContain('a.api -> b.api : calls');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('drops unknown endpoints instead of emitting W122', async () => {
    const result = convert(`model {
      softwareSystem "Shop"
      Mystery -> Shop "x"
    }`);
    expect(result.dsl).not.toContain('Mystery');
    expect(result.losses.some((loss) => loss.includes('unknown element'))).toBe(true);
    await expectCleanAndIdempotent(result.dsl);
  });

  it('promotes technology to the label when there is no description', async () => {
    const result = convert(`model {
      softwareSystem "A"
      softwareSystem "B"
      A -> B "" "HTTPS"
    }`);
    expect(result.dsl).toContain('A -> B : HTTPS [tech: HTTPS]');
    expect(result.losses.some((loss) => loss.includes('technology shown as the label'))).toBe(true);
    await expectCleanAndIdempotent(result.dsl);
  });
});

describe('groups', () => {
  it('flattens nested groups and keeps member order', async () => {
    const result = convert(`model {
      group "Frontend" {
        softwareSystem "Web"
        group "Inner" { softwareSystem "Widget" }
      }
      softwareSystem "Backend"
    }`);
    expect(result.losses).toContain('group "Frontend" flattened');
    expect(result.losses).toContain('group "Inner" flattened');
    expect(result.dsl.indexOf('system Web')).toBeLessThan(result.dsl.indexOf('system Widget'));
    expect(result.dsl.indexOf('system Widget')).toBeLessThan(result.dsl.indexOf('system Backend'));
    await expectCleanAndIdempotent(result.dsl);
  });
});

describe('deployment', () => {
  it('maps environments, nodes, infrastructure nodes and instances', async () => {
    const result = convert(`model {
      softwareSystem "Shop" { container "API" "desc" "Go" }
      deploymentEnvironment "Live" {
        deploymentNode "AWS" "Cloud" "Amazon" "cloud" {
          deploymentNode "ECS" {
            containerInstance API
          }
          infrastructureNode "Load Balancer" "Balances" "ELB"
        }
      }
    }`);
    expect(result.dsl).toContain('deployment Live {');
    expect(result.dsl).toContain('node AWS [tech: Amazon, desc: Cloud, tags: cloud] {');
    expect(result.dsl).toContain('node ECS {');
    expect(result.dsl).toContain('instance Shop.API');
    expect(result.dsl).toContain('node Load Balancer [tech: ELB, desc: Balances]');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('accepts deployment nodes declared inside the deployment view', async () => {
    const result = convert(`model { softwareSystem "Shop" { container "API" } }
      views {
        deployment Shop Live {
          include *
          deploymentNode "AWS" {
            containerInstance API
          }
        }
      }`);
    expect(result.dsl).toContain('deployment Live {');
    expect(result.dsl).toContain('instance Shop.API');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('drops an instance of an unknown element', async () => {
    const result = convert(`model {
      deploymentEnvironment "Live" {
        deploymentNode "AWS" { containerInstance Mystery }
      }
    }`);
    expect(result.dsl).not.toContain('Mystery');
    expect(result.losses.some((loss) => loss.includes('containerInstance Mystery dropped'))).toBe(true);
  });
});

describe('views', () => {
  const WORKSPACE = `model {
      person "P"
      softwareSystem "Shop" { container "Web" { component "Router" } }
      softwareSystem "Ext"
      deploymentEnvironment "Live" { deploymentNode "AWS" }
    }`;

  it('maps every supported view kind', async () => {
    const result = convert(`${WORKSPACE}
      views {
        systemLandscape
        systemContext Shop
        container Shop
        component Shop.Web
        deployment Shop Live
        dynamic Shop { P -> Web "uses" }
      }`);
    expect(result.dsl).toContain('view landscape');
    expect(result.dsl).toContain('view context of Shop');
    expect(result.dsl).toContain('view container of Shop');
    expect(result.dsl).toContain('view component of Shop.Web');
    expect(result.dsl).toContain('view deployment of Shop in Live');
    expect(result.dsl).toContain('flow "Shop" {');
    expect(result.dsl).toContain('step P -> Web : uses');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('translates supported include/exclude expressions', async () => {
    const result = convert(`${WORKSPACE}
      views {
        systemLandscape {
          include *
          include Shop Ext
          exclude Ext
          include -> Web ->
          include Web ->
          include -> Web
          include element.type==Container
          include element.tag==core
          include element.type==Container || element.tag==core
        }
      }`);
    expect(result.dsl).toContain('include *');
    expect(result.dsl).toContain('include Shop');
    expect(result.dsl).toContain('include Ext');
    expect(result.dsl).toContain('exclude Ext');
    expect(result.dsl).toContain('include -> Web');
    expect(result.dsl).toContain('include Web ->');
    expect(result.dsl).toContain('include * where kind is container');
    expect(result.dsl).toContain('include * where tag is @core');
    expect(result.losses.some((loss) => loss.includes('no OFK equivalent'))).toBe(false);
    await expectCleanAndIdempotent(result.dsl);
  });

  it('keeps unsupported expressions verbatim and reports them', async () => {
    const result = convert(`${WORKSPACE}
      views {
        container Shop {
          include element.parent==Shop
          include technology==React
          include relationship.tag==async
        }
      }`);
    expect(result.dsl).toContain('include element.parent==Shop');
    expect(result.dsl).toContain('include technology==React');
    expect(result.dsl).toContain('include relationship.tag==async');
    expect(result.losses.filter((loss) => loss.includes('no OFK equivalent'))).toHaveLength(3);
    // OFK's parseRule accepts any `include <text>` without a diagnostic; the loss notes are
    // the only signal, and the kept lines match nothing in the view.
    await expectClean(result.dsl);
    await expectIdempotent(result.dsl);
  });

  it('flattens && conjunctions to a union with a loss', async () => {
    const result = convert(`${WORKSPACE}
      views {
        container Shop {
          include element.type==Container && element.tag==core
        }
      }`);
    expect(result.dsl).toContain('include * where kind is container');
    expect(result.dsl).toContain('include * where tag is @core');
    expect(result.losses.some((loss) => loss.includes('conjunction flattened to a union'))).toBe(true);
    await expectCleanAndIdempotent(result.dsl);
  });

  it('maps autoLayout to the view direction and drops separations', async () => {
    const result = convert(`${WORKSPACE}
      views {
        systemLandscape {
          autoLayout tb
        }
        systemContext Shop {
          autoLayout lr 300 300
        }
        container Shop {
          autoLayout rl
        }
        component Shop.Web {
          autoLayout bt
        }
      }`);
    expect(result.dsl).toContain('view landscape down');
    expect(result.dsl).toContain('view context of Shop right');
    expect(result.dsl).toContain('view container of Shop left');
    expect(result.dsl).toContain('view component of Shop.Web up');
    expect(result.losses.filter((loss) => loss === 'autoLayout separations dropped')).toHaveLength(4);
    await expectCleanAndIdempotent(result.dsl);
  });

  it('drops view keys, titles and unknown view kinds', async () => {
    const result = convert(`${WORKSPACE}
      views {
        systemContext Shop "Context" {
          include *
          title "Ctx"
        }
        filtered Shop {
          include *
        }
      }`);
    expect(result.losses).toContain('view key "Context" dropped');
    expect(result.losses).toContain('title "Ctx" inside a view dropped');
    expect(result.losses).toContain('view "filtered" dropped');
    expect(result.dsl).not.toContain('filtered');
    expect(result.dsl).not.toContain('Ctx');
    await expectCleanAndIdempotent(result.dsl);
  });
});

describe('dynamic views', () => {
  it('turns steps into flow steps, including numbering and scoped arrows', async () => {
    const result = convert(`model {
      person "P"
      softwareSystem "Shop" {
        container "Web"
        container "API"
        container "DB"
      }
    }
    views {
      dynamic Shop "Checkout" {
        P -> Web "opens cart"
        1. Web -> API "POST /orders" "HTTPS"
        -> DB "reads"
      }
    }`);
    expect(result.dsl).toContain('flow "Checkout" {');
    expect(result.dsl).toContain('step P -> Web : opens cart');
    expect(result.dsl).toContain('step Web -> API : POST /orders (HTTPS)');
    expect(result.dsl).toContain('step API -> DB : reads');
    expect(result.losses).toContain('flow step technology/tags folded into the labels');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('names an unnamed dynamic view after its scope and drops unknown steps', async () => {
    const result = convert(`model { softwareSystem "Shop" { container "Web" } }
      views {
        dynamic Shop {
          Web -> Mystery "lost"
        }
      }`);
    expect(result.dsl).toContain('flow "Shop"');
    expect(result.dsl).not.toContain('Mystery');
    expect(result.losses.some((loss) => loss.includes('flow step Web -> Mystery dropped'))).toBe(true);
    await expectCleanAndIdempotent(result.dsl);
  });

  it('flattens nested scopes inside a dynamic view', async () => {
    const result = convert(`model {
      softwareSystem "Shop" {
        container "Web"
        container "API"
      }
    }
    views {
      dynamic Shop {
        group "Checkout" {
          Web -> API "calls"
        }
      }
    }`);
    expect(result.dsl).toContain('step Web -> API : calls');
    await expectCleanAndIdempotent(result.dsl);
  });
});

describe('styles and dropped blocks', () => {
  it('copies colour, shape and icon onto tagged elements with one W180', async () => {
    const result = convert(`model {
      person "Plain" "desc"
      person "Guest" "desc" "external"
      softwareSystem "Shop" {
        container "DB" "desc" "Postgres" "database"
      }
    }
    views {
      styles {
        element "Person" {
          background #08427b
        }
        element "external" {
          background #999999
          shape Box
        }
        element "database" {
          background #438dd5
          shape Cylinder
          icon "aws:rds"
        }
        relationship "async" {
          thickness 2
        }
      }
    }`);
    expect(result.dsl).toContain('person Plain [color: #08427b, desc: desc]');
    expect(result.dsl).toContain('person Guest [rect, color: #999999, desc: desc, tags: external]');
    expect(result.dsl).toContain('container DB [cylinder, color: #438dd5, icon: aws/rds, tech: Postgres, desc: desc, tags: database]');
    expect(result.losses.filter((loss) => loss.startsWith('styles'))).toHaveLength(1);
    const styleDiagnostics = result.diagnostics.filter((item) => item.message.startsWith('styles'));
    expect(styleDiagnostics).toHaveLength(1);
    expect(styleDiagnostics[0]).toMatchObject({ code: 'W180', severity: 'warning', source: 'import' });
    await expectCleanAndIdempotent(result.dsl);
  });

  it('drops theme, branding, terminology, configuration, docs, adrs and includes', async () => {
    const result = convert(`workspace {
      model { softwareSystem "Shop" }
      views {
        systemLandscape { include * }
        theme default
        branding {
          logo "https://example.com/logo.png"
        }
        terminology {
          person "User"
        }
        configuration {
          scope softwareSystem
        }
      }
      !docs docs
      !adrs adrs
      !include extra.dsl
    }`);
    for (const loss of ['theme dropped', 'branding dropped', 'terminology dropped', 'configuration dropped', '!docs docs dropped', '!adrs adrs dropped', '!include extra.dsl dropped']) {
      expect(result.losses).toContain(loss);
    }
    expect(result.dsl).not.toContain('logo');
    await expectCleanAndIdempotent(result.dsl);
  });

  it('notes flat identifiers and disabled implied relationships', async () => {
    const flat = convert('!identifiers flat\nmodel { softwareSystem "Shop" { container "Web" } }');
    expect(flat.losses).toContain('identifiers: flat ids rewritten to paths');
    const hierarchical = convert('!identifiers hierarchical\nmodel { softwareSystem "Shop" }');
    expect(hierarchical.losses.some((loss) => loss.startsWith('identifiers'))).toBe(false);
    const disabled = convert('!impliedRelationships false\nmodel { softwareSystem "Shop" }');
    expect(disabled.losses.some((loss) => loss.includes('!impliedRelationships false'))).toBe(true);
    const enabled = convert('!impliedRelationships true\nmodel { softwareSystem "Shop" }');
    expect(enabled.losses.some((loss) => loss.includes('!impliedRelationships'))).toBe(false);
    const unknown = convert('!constant "x" "y"\nmodel { softwareSystem "Shop" }');
    expect(unknown.losses).toContain('!constant x y dropped');
  });

  it('reports every loss as an import-sourced W180', () => {
    const result = convert('workspace "X" "desc" { model { softwareSystem "Shop" } }');
    expect(result.diagnostics).toHaveLength(result.losses.length);
    for (const diagnostic of result.diagnostics) {
      expect(diagnostic).toMatchObject({ code: 'W180', severity: 'warning', source: 'import', col: 1, endCol: 1 });
    }
  });
});

describe('output shape', () => {
  it('writes the pragma, family, title and 2-space indentation', async () => {
    const result = convert(`workspace "Shop" {
      model {
        person "Customer"
        softwareSystem "Shop" { container "Web" }
      }
      views { container Shop { include * } }
    }`);
    expect(result.dsl.startsWith('%% ofk 1\narchitecture\ntitle: Shop\n\n')).toBe(true);
    expect(result.dsl).toContain('\n  person Customer');
    expect(result.dsl).toContain('\n    container Web');
    expect(result.dsl.endsWith('\n')).toBe(true);
    await expectCleanAndIdempotent(result.dsl);
  });

  it('emits no model block when the model is empty', () => {
    const result = convert('workspace { model { } }');
    expect(result.dsl).toBe('%% ofk 1\narchitecture\n');
  });

  it('never throws on malformed bodies', async () => {
    for (const source of [
      'model {\n  ???\n  person\n  -> -> ->\n}',
      'model { person "Unterminated }',
      'model {\n  softwareSystem "Shop" {\n    container "Web"',
      'workspace {\n  model {\n    component "Orphan"\n  }\n  views {\n    systemContext Missing {\n      include *\n    }\n  }\n}',
    ]) {
      const result = structurizrToDsl(source);
      expect('dsl' in result).toBe(true);
      if ('dsl' in result) await expectClean(result.dsl);
    }
  });
});

describe('fixture corpus', () => {
  it('ships the four workspaces', () => {
    expect(fixturePaths).toHaveLength(4);
    expect(fixturePaths.every((path) => path.endsWith('.txt'))).toBe(true);
  });

  it.each(fixturePaths)('%s imports without errors and is format-idempotent', async (path) => {
    const result = convert(fixtures[path]!);
    expect(result.dsl.startsWith('%% ofk 1\narchitecture\n')).toBe(true);
    await expectCleanAndIdempotent(result.dsl);
  });

  it.each(fixturePaths)('%s keeps the model structure in compiled scenes', async (path) => {
    const result = convert(fixtures[path]!);
    const workspace = await compileWorkspace(result.dsl);
    expect(workspace.family).toBe('architecture');
    expect(workspace.views.length).toBeGreaterThan(0);
  });

  it('01-web-3tier: components, deployment instances and styles', async () => {
    const result = convert(fixtures['./fixtures/structurizr/01-web-3tier.txt']!);
    const ids = await viewElementIds(result.dsl);
    expect(ids).toContain('banking');
    expect(ids).toContain('banking.web');
    expect(ids).toContain('banking.web.sign-in-controller');
    expect(ids).toContain('banking.web.security-component');
    expect(ids).toContain('banking.api.accounts');
    expect(ids).toContain('banking.database');
    expect(result.dsl).toContain('instance Banking.Web');
    expect(result.dsl).toContain('instance Banking.API');
    expect(result.dsl).toContain('instance Banking.Database');
    expect(result.dsl).toContain('node Load Balancer');
    expect(result.dsl).toContain('[cylinder, color: #438dd5, icon: aws/rds');
    expect(result.losses).toContain('workspace description dropped');
    expect(result.losses).toContain('view key "Context" dropped');
    expect(result.losses.some((loss) => loss.startsWith('styles'))).toBe(true);
  });

  it('02-microservices-dynamic: groups flattened and flows built', async () => {
    const result = convert(fixtures['./fixtures/structurizr/02-microservices-dynamic.txt']!);
    expect(result.losses).toContain('group "Channels" flattened');
    expect(result.losses).toContain('group "Core" flattened');
    expect(result.dsl).toContain('flow "Authorise payment" {');
    expect(result.dsl).toContain('step Checkout -> Gateway : POST /authorise');
    expect(result.dsl).toContain('step Authorisation -> Card Network : Calls card network');
    expect(result.dsl).toContain('flow "Gateway" {');
    await expectClean(result.dsl);
  });

  it('03-flat-identifiers: flat ids resolve to nested paths', async () => {
    const result = convert(fixtures['./fixtures/structurizr/03-flat-identifiers.txt']!);
    expect(result.losses).toContain('identifiers: flat ids rewritten to paths');
    const ids = await viewElementIds(result.dsl);
    expect(ids).toEqual(expect.arrayContaining(['shop', 'shop.web', 'shop.api', 'shop.database']));
    expect(await viewConnectorIds(result.dsl))
      .toEqual(expect.arrayContaining(['shop.web->shop.api', 'shop.api->shop.database']));
    expect(result.dsl).toContain('instance Shop.Web');
    expect(result.dsl).toContain('instance Shop.Database');
  });

  it('04-styles-expressions: styles copied and unsupported expressions kept', async () => {
    const result = convert(fixtures['./fixtures/structurizr/04-styles-expressions.txt']!);
    expect(result.dsl).toContain('include * where kind is container');
    expect(result.dsl).toContain('include * where tag is @critical');
    expect(result.dsl).toContain('include -> Warehouse');
    expect(result.dsl).toContain('include Warehouse ->');
    expect(result.dsl).toContain('include element.parent==Collector');
    expect(result.dsl).toContain('include technology==Kafka');
    expect(result.dsl).toContain('include relationship.tag==async');
    expect(result.dsl).toContain('container Ingest [rounded, color: #b20000');
    expect(result.dsl).toContain('system Warehouse [cylinder, color: #438dd5, icon: aws/rds');
    for (const loss of ['perspectives dropped', 'properties dropped', 'theme dropped', 'branding dropped', 'terminology dropped', '!docs docs dropped', '!adrs adrs dropped', '!include extra.dsl dropped']) {
      expect(result.losses).toContain(loss);
    }
    expect(result.losses.some((loss) => loss.includes('conjunction flattened to a union'))).toBe(true);
    expect(result.losses.some((loss) => loss.includes('no OFK equivalent'))).toBe(true);
    await expectClean(result.dsl);
  });
});
