import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { dslFrameRaw } from '../sceneMeta';
import { archModelFromJson } from './model';
import { flowToMermaid, flowToPlantUml, flowToSequenceDsl } from './flowExport';
import type { ArchFlow, ArchModel } from './types';

const FLOW_TEXT = `architecture
model {
  person Customer
  system Shop {
    container Web
    container API
    store DB
  }
  Customer -> Web : uses
}
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

async function fixture(): Promise<{ model: ArchModel; flow: ArchFlow }> {
  const compiled = await compile(FLOW_TEXT);
  const arch = dslFrameRaw(compiled.frame).arch as { model: unknown };
  const model = archModelFromJson(arch.model)!;
  return { model, flow: model.flows[0]! };
}

describe('flow export', () => {
  it('projects a flow to the sequence family DSL that compiles cleanly', async () => {
    const { model, flow } = await fixture();
    const dsl = flowToSequenceDsl(flow, model);
    expect(dsl).toContain('sequence');
    expect(dsl).toContain('participant Customer');
    expect(dsl).toContain('Customer -> Web : opens cart');
    expect(dsl).toContain('alt paid {');
    expect(dsl).toContain('} else {');
    expect(dsl).toContain('par {');
    expect(dsl).toContain('} and {');
    expect(dsl).toContain('note over Web : goto Fulfilment');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(compiled.nodes.filter((node) => node.kind === 'sequence_participant').length).toBe(4);
  });

  it('projects a flow to Mermaid with fragments and notes', async () => {
    const { model, flow } = await fixture();
    const mermaid = flowToMermaid(flow, model);
    expect(mermaid.startsWith('sequenceDiagram\n')).toBe(true);
    expect(mermaid).toContain('participant Customer');
    expect(mermaid).toContain('Customer->>Web: opens cart');
    expect(mermaid).toContain('alt paid');
    expect(mermaid).toContain('else');
    expect(mermaid).toContain('end');
    expect(mermaid).toContain('Web->>Web: Retry payment');
    expect(mermaid).toContain('Note over Customer: Customer opens the cart');
  });

  it('projects a flow to PlantUML', async () => {
    const { model, flow } = await fixture();
    const uml = flowToPlantUml(flow, model);
    expect(uml.startsWith('@startuml\n')).toBe(true);
    expect(uml.trimEnd().endsWith('@enduml')).toBe(true);
    expect(uml).toContain('Customer -> Web : opens cart');
    expect(uml).toContain('note over Web : goto Fulfilment');
  });

  it('falls back to element ids when the model lost a name', async () => {
    const { model, flow } = await fixture();
    const stripped: ArchModel = { ...model, elements: model.elements.filter((element) => element.id !== 'shop.web') };
    const uml = flowToPlantUml(flow, stripped);
    expect(uml).toContain('Customer -> shop.web : opens cart');
  });
});
