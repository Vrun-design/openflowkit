/**
 * Starter templates that ship with the MCP server so an agent can produce
 * something real without any API key. Each is canonical OpenFlow DSL
 * (docs/plan/grammar.md) that compiles through the same parser the app uses;
 * the test suite compiles all of them.
 */

export interface StarterTemplate {
  name: string;
  title: string;
  family: 'flowchart' | 'architecture' | 'sequence' | 'state';
  summary: string;
  dsl: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'auth-flow',
    title: 'User authentication',
    family: 'flowchart',
    summary: 'Login with an MFA branch and an access-denied terminal.',
    dsl: `%% ofk 1
flowchart down
title: User authentication

  Start [ellipse, emerald] -> Login [rounded, blue] : credentials
  Login -> Valid {"Valid?"} 
  Valid [diamond, amber] -> MFA [rounded, violet] : yes
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
  alt accepted
    Service --> Gateway : 202 {orderId}
  else rejected
    Service --> Gateway : 409 {reason}
  end
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
