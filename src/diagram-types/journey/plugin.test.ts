import { describe, expect, it } from 'vitest';
import { JOURNEY_PLUGIN } from './plugin';

describe('JOURNEY_PLUGIN', () => {
  it('parses journey sections and scored steps', () => {
    const input = `
      journey
      title Checkout Journey
      section Happy Path
        Search product: 5: Buyer
        Add to cart: 4: Buyer
      section Payment
        Pay now: 2: Buyer
    `;

    const result = JOURNEY_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0].type).toBe('journey');
    expect(result.nodes[0].data.journeySection).toBe('Happy Path');
    expect(result.nodes[0].data.journeyScore).toBe(5);
    expect(result.nodes[0].data.journeyActor).toBe('Buyer');
  });

  it('returns diagnostics for malformed score and skips invalid steps', () => {
    const input = `
      journey
      section Support
        Open ticket: high: User
        Wait for response: 2: User
    `;

    const result = JOURNEY_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(1);
    expect(result.diagnostics?.some((message) => message.includes('Invalid journey score at line'))).toBe(true);
  });

  it('color-codes steps by score for quick satisfaction scanning', () => {
    const input = `
      journey
      section Checkout
        Browse: 5: Buyer
        Retry payment: 1: Buyer
    `;

    const result = JOURNEY_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes[0].data.color).toBe('emerald');
    expect(result.nodes[1].data.color).toBe('red');
  });

  it('returns diagnostics for malformed section and malformed score-like steps while preserving valid steps', () => {
    const input = `
      journey
      section
      Open ticket: User
      Track status: 4
    `;

    const result = JOURNEY_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(1);
    expect(result.diagnostics?.some((message) => message.includes('Invalid journey section syntax at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Invalid journey score at line'))).toBe(true);
  });

  it('returns error when header is missing', () => {
    const result = JOURNEY_PLUGIN.parseMermaid('section A\nTask: 3: User');
    expect(result.error).toContain('Missing journey header');
  });
});
