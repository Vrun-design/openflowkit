/**
 * Starter templates: the MCP server ships them so an agent can produce
 * something real without any API key, and the editor's empty canvas offers
 * them so a person can too. Each is canonical OpenFlow DSL
 * (src/dsl/grammar.md) that compiles through the same parser the app uses;
 * the test suite compiles all of them.
 */

export interface StarterTemplate {
  name: string;
  title: string;
  family: 'flowchart' | 'architecture' | 'sequence' | 'state';
  summary: string;
  dsl: string;
}

export const C4_STARTER = `%% ofk 1
architecture
title: Shop architecture
model {
 person Customer [desc: Places and tracks orders]
 system Shop [desc: Online shopping] {
  container Web [tech: React, desc: Customer storefront]
  container API [tech: Go, desc: Order processing] {
   component Orders [desc: Validates orders]
  }
  store Database [tech: PostgreSQL, desc: Stores orders]
  Web -> API : submits orders [tech: HTTPS]
  API -> Database : stores orders [tech: SQL]
 }
 external Payments [desc: Processes card payments]
 Customer -> Shop.Web : shops [tech: HTTPS]
 Shop.API -> Payments : charges [tech: HTTPS]
}
views {
 view landscape
 view context of Shop
 view container of Shop
}
flow "Place an order" {
 intro "Customer checks out"
 step Customer -> Shop.Web : confirms cart
 step Shop.Web -> Shop.API : submits order
 step Shop.API -> Shop.Database : saves order
 conclusion "Order confirmed"
}
`;

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  {name: 'c4-workspace', title: 'C4 architecture workspace', family: 'architecture', summary: 'Shared model with landscape, context and container views and a checkout flow.', dsl: C4_STARTER},
  {
    name: 'auth-flow',
    title: 'User authentication',
    family: 'flowchart',
    summary: 'Login with an MFA branch and an access-denied terminal.',
    dsl: `%% ofk 1
flowchart down
title: User authentication

  Start [ellipse, emerald] -> Login [rounded, blue] : credentials
  Login -> Valid
  Valid [diamond, amber, label: "Valid?"] -> MFA [rounded, violet] : yes
  Valid -> Denied [ellipse, red] : no
  MFA -> Token [rounded, blue]
  Token -> Dashboard [ellipse, emerald]
`,
  },
  {
    name: 'three-tier-architecture',
    title: 'Three-tier AWS architecture',
    family: 'architecture',
    summary: 'Edge, application and data tiers with real AWS icon slugs.',
    dsl: `%% ofk 1
architecture right
title: Three-tier architecture

  Users [person] -> CDN [icon: aws/networking-content-delivery-cloudfront]
  CDN -> Gateway [icon: aws/networking-content-delivery-api-gateway]
  Gateway -> Compute [icon: aws/compute-lambda, green]
  Compute -> Cache [icon: aws/databases-elasticache, amber]
  Compute -> Store [icon: aws/databases-dynamodb, violet]
`,
  },
  {
    name: 'request-sequence',
    title: 'Request lifecycle',
    family: 'sequence',
    summary: 'Browser, gateway and service with an alt fragment.',
    dsl: `%% ofk 1
sequence
title: Request lifecycle

  participant Browser
  participant Gateway
  participant Service

  Browser -> Gateway : POST /orders
  Gateway -> Service : order.create
  alt accepted {
    Service --> Gateway : "202 {orderId}"
  } else rejected {
    Service --> Gateway : "409 {reason}"
  }
  Gateway --> Browser : response
`,
  },
  {
    name: 'order-state',
    title: 'Order state machine',
    family: 'state',
    summary: 'Draft, review, fulfilment and terminal states.',
    dsl: `%% ofk 1
state right
title: Order lifecycle

  [*] -> Draft
  Draft -> Review : submit
  Review -> Draft : request changes
  Review -> Paid : approve
  Paid -> Shipped : fulfil
  Shipped -> Delivered : carrier
  Delivered -> [*]
`,
  },
  {
    name: 'event-pipeline',
    title: 'Event pipeline',
    family: 'flowchart',
    summary: 'Producer to stream to consumers, with a dead-letter path.',
    dsl: `%% ofk 1
flowchart right
title: Event pipeline

  Producer [rounded, blue] -> Stream [cylinder, amber, bold]
  Stream -> Enricher [rounded, violet]
  Stream -> Archiver [cylinder, slate]
  Enricher -> Warehouse [cylinder, emerald]
  Enricher --> Dead Letter [note, red] : failed
`,
  },
];

export function findStarterTemplate(name: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((template) => template.name === name);
}
