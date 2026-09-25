import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { serialize } from '../serialize';
import { framePresetOf } from '../../opencanvas/domain/nodes/framePreset';

// Koboyo's first docs example, verbatim: their text must compile here unchanged.
const LOGIN = `wireframe
title: Onboarding

screen Login [phone] {
  heading: Welcome back
  input: Email
  input: Password
  button: Sign in [half]
  button: SSO [half]
  navbar: Home | Feed | Profile [active: 0]
}
`;

const warnings = (result: Awaited<ReturnType<typeof compile>>) => result.diagnostics.filter(({ severity }) => severity !== 'info');

describe('wireframe family', () => {
  it('compiles Koboyo text: a phone screen holding its controls in order', async () => {
    const result = await compile(LOGIN);
    expect(warnings(result)).toEqual([]);
    expect(result.groups).toHaveLength(1);
    const screen = result.groups[0]!;
    expect(framePresetOf(screen)).toBe('phone');
    expect(screen.content.label).toBe('Login');
    expect(result.nodes.map((node) => [node.content.widget, node.content.label])).toEqual([
      ['heading', 'Welcome back'], ['input', 'Email'], ['input', 'Password'],
      ['button', 'Sign in'], ['button', 'SSO'], ['navbar', 'Home | Feed | Profile'],
    ]);
    expect(result.nodes.every((node) => node.parentId === screen.id)).toBe(true);
    expect(result.nodes[5]!.content.active).toBe(0);
  });

  it('pairs halves on one row and stacks full-width controls in the column', async () => {
    const { nodes, groups } = await compile(LOGIN);
    const [heading, email, password, signIn, sso] = nodes;
    const at = (index: number) => nodes[index]!.transform.translation;
    expect(signIn!.transform.translation.y).toBe(sso!.transform.translation.y);
    expect(sso!.transform.translation.x).toBeGreaterThan(signIn!.transform.translation.x + signIn!.size.width);
    expect(signIn!.size.width).toBe(sso!.size.width);
    expect(at(1).y).toBeGreaterThan(at(0).y + heading!.size.height);
    expect(at(2).y).toBeGreaterThan(at(1).y + email!.size.height);
    expect(password!.size.width).toBe(groups[0]!.size.width - 32);
    // Two halves plus the gap span the column exactly.
    expect(signIn!.size.width * 2 + 12).toBeCloseTo(groups[0]!.size.width - 32);
  });

  it('reads state: on/off/checked, percentages, active items and variants', async () => {
    const { nodes } = await compile(`wireframe
screen S [browser] {
  toggle: A [on]
  toggle: B [off]
  checkbox: C [checked]
  slider [60%]
  progress [0.25]
  alert: D [error]
  button: E [primary, half]
}`);
    expect(nodes.map(({ content }) => content)).toEqual([
      expect.objectContaining({ widget: 'toggle', checked: true }),
      expect.objectContaining({ widget: 'toggle', checked: false }),
      expect.objectContaining({ widget: 'checkbox', checked: true }),
      expect.objectContaining({ widget: 'slider', value: 0.6 }),
      expect.objectContaining({ widget: 'progress', value: 0.25 }),
      expect.objectContaining({ widget: 'alert', variant: 'error' }),
      expect.objectContaining({ widget: 'button', variant: 'primary' }),
    ]);
    // Nothing the text did not say: a bare checkbox is unchecked.
    const bare = await compile('wireframe\nscreen S {\n  checkbox: Plain\n}');
    expect(bare.nodes[0]!.content).toEqual({ widget: 'checkbox', label: 'Plain' });
  });

  it('pins a tab bar to the bottom and floats a FAB above it', async () => {
    const { nodes, groups } = await compile('wireframe\nscreen S [phone] {\n  fab\n  heading: Hi\n  tabbar: A | B\n}');
    const screen = groups[0]!;
    const tabbar = nodes.find(({ content }) => content.widget === 'tabbar')!;
    const fab = nodes.find(({ content }) => content.widget === 'fab')!;
    expect(tabbar.transform.translation.y + tabbar.size.height).toBeLessThanOrEqual(screen.size.height);
    expect(tabbar.transform.translation.y).toBeGreaterThan(screen.size.height / 2);
    expect(fab.transform.translation.y + fab.size.height).toBeLessThan(tabbar.transform.translation.y);
    expect(nodes.find(({ content }) => content.widget === 'heading')!.transform.translation.y).toBeLessThan(100);
  });

  it('grows a screen whose content outruns its device height', async () => {
    const lines = Array.from({ length: 30 }, (_, index) => `  input: Field ${index}`).join('\n');
    const { groups, nodes } = await compile(`wireframe\nscreen Long [phone] {\n${lines}\n}`);
    const last = nodes.at(-1)!;
    expect(groups[0]!.size.height).toBeGreaterThanOrEqual(last.transform.translation.y + last.size.height);
  });

  it('lays screens side by side and keeps ids unique for repeated names', async () => {
    const { groups } = await compile('wireframe\nscreen A {\n  heading: 1\n}\nscreen A [tablet] {\n  heading: 2\n}');
    expect(groups.map(({ id }) => id)).toEqual(['screen-a', 'screen-a-2']);
    expect(groups[1]!.transform.translation.x).toBeGreaterThan(groups[0]!.transform.translation.x + groups[0]!.size.width);
  });

  it('warns on unknown controls, attributes and frames, and still draws the rest', async () => {
    const result = await compile('wireframe\nscreen S [watch] {\n  hologram: X\n  button: Go [sparkly]\n}');
    expect(result.diagnostics.map(({ code }) => code)).toEqual(expect.arrayContaining(['W141', 'W142', 'W143']));
    expect(framePresetOf(result.groups[0]!)).toBe('phone');
    expect(result.nodes.map(({ content }) => content.widget)).toEqual(['button']);
  });

  it('collects controls written outside any screen into one phone', async () => {
    const { groups, nodes } = await compile('wireframe\nheading: Loose\nbutton: Go');
    expect(groups).toHaveLength(1);
    expect(nodes).toHaveLength(2);
  });

  it('serializes to canonical text that compiles back to the same screens', async () => {
    const first = await compile(LOGIN);
    const text = serialize(first);
    expect(text).toBe(`%% ofk 1
wireframe
title: Onboarding

screen Login [phone] {
  heading: Welcome back
  input: Email
  input: Password
  button: Sign in [half]
  button: SSO [half]
  navbar: Home | Feed | Profile [active: 0]
}
`);
    expect(serialize(await compile(text))).toBe(text);
  });

  it('keeps labels exactly as written, colons and spacing included', async () => {
    const { nodes } = await compile('wireframe\nscreen "Sign up: step 1" {\n  statusbar: 9:41\n  card: Sneakers · $89\n  navbar: Home|Feed |  Me\n}');
    expect(nodes.map(({ content }) => content.label)).toEqual(['9:41', 'Sneakers · $89', 'Home|Feed |  Me']);
  });

  it('quotes labels that would read as syntax', async () => {
    const first = await compile('wireframe\nscreen S {\n  card: "Total: $12, today"\n}');
    expect(first.nodes[0]!.content.label).toBe('Total: $12, today');
    expect(serialize(first)).toContain('card: "Total: $12, today"');
  });
});
