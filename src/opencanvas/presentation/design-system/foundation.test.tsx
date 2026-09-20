import { fireEvent, render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Button,
  Field,
  Toolbar,
  ProposalBar,
  SystemRoot,
  CanvasFeedbackOverlay,
  themes,
  rendererColor,
  canvasFeedback,
  screenPixelsToWorld,
  motionRecipe,
} from './index';
import type { ProposalBarProps } from './ProposalBar';
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe('design foundation', () => {
  it('keeps text/status/primary pairings at 4.5:1 and control/focus boundaries at 3:1', () => {
    for (const theme of Object.values(themes)) {
      for (const role of [
        'text',
        'secondary',
        'muted',
        'info',
        'success',
        'warning',
        'danger',
      ] as const) {
        for (const surface of ['canvas', 'surface', 'raised'] as const)
          expect(
            contrast(theme[role], theme[surface]),
            `${role}/${surface}`
          ).toBeGreaterThanOrEqual(4.5);
      }
      for (const [text, background] of [
        ['info', 'infoSoft'],
        ['success', 'successSoft'],
        ['warning', 'warningSoft'],
        ['danger', 'dangerSoft'],
        ['accent', 'accentSoft'],
      ] as const)
        expect(
          contrast(theme[text], theme[background]),
          `${text}/${background}`
        ).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.onAccent, theme.accentHover)).toBeGreaterThanOrEqual(4.5);
      // Brand exception: the single bold primary CTA uses the seed at >= 3:1 (owner decision 2026-09-20).
      expect(contrast(theme.onPrimary, theme.primary)).toBeGreaterThanOrEqual(3);
      expect(contrast(theme.onPrimary, theme.primaryHover)).toBeGreaterThanOrEqual(3);
      expect(contrast(theme.onInverse, theme.inverse)).toBeGreaterThanOrEqual(4.5);
      for (const role of ['focus', 'controlBorder'] as const)
        expect(contrast(theme[role], theme.surface)).toBeGreaterThanOrEqual(3);
    }
  });
  it('shares renderer colors and preserves screen dimensions independently of zoom', () => {
    expect(rendererColor('light', 'selection')).toBe(parseInt(themes.light.selection.slice(1), 16));
    for (const zoom of [0.5, 1, 2]) expect(screenPixelsToWorld(24, zoom) * zoom).toBe(24);
    expect(() => screenPixelsToWorld(24, 0)).toThrow(RangeError);
    expect(() => screenPixelsToWorld(24, NaN)).toThrow(RangeError);
    expect(canvasFeedback('addition', 'light').marker).not.toBe(
      canvasFeedback('removal', 'light').marker
    );
    expect(canvasFeedback('binding', 'dark', 'touch').hitTargetPx).toBe(44);
  });
  it('never animates manipulation or takes camera ownership; reduced motion is immediate', () => {
    expect(motionRecipe('manipulate', false).durationMs).toBe(0);
    for (const intent of ['navigate', 'reveal', 'commit', 'proposal-preview'] as const) {
      expect(motionRecipe(intent, true).durationMs).toBe(0);
      expect(motionRecipe(intent, false).autoMoveCamera).toBe(false);
      expect(motionRecipe(intent, false, 1000).staggerMs).toBe(0);
      expect(motionRecipe(intent, false, 1000).animateOpacity).toBe(false);
    }
  });
  it('preserves focus while busy and suppresses duplicate activation', () => {
    const click = vi.fn();
    const view = render(<Button onClick={click}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    button.focus();
    view.rerender(
      <Button busy onClick={click}>
        Save
      </Button>
    );
    fireEvent.click(button);
    expect(click).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
  it('navigates tools around disabled buttons without stealing field caret keys', () => {
    render(
      <Toolbar label="Tools">
        <Button>First</Button>
        <Button disabled>Unavailable</Button>
        <Button>Last</Button>
        <input aria-label="Name" />
      </Toolbar>
    );
    const first = screen.getByRole('button', { name: 'First' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last' }));
    const field = screen.getByRole('textbox');
    field.focus();
    fireEvent.keyDown(field, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(field);
  });
  it('links field error and external descriptions without dropping accessible name', () => {
    render(<Field label="Width" error="Enter a positive width" aria-describedby="units" />);
    const field = screen.getByRole('textbox', { name: 'Width' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field.getAttribute('aria-describedby')).toContain('units');
    expect(field.getAttribute('aria-describedby')).toContain(
      screen.getByText('Enter a positive width').id
    );
  });
  it('renders noninteractive feedback with fixed screen-space handles', () => {
    const { container } = render(
      <SystemRoot appearance="dark">
        <CanvasFeedbackOverlay
          appearance="dark"
          items={[{ id: 'one', kind: 'selection', x: 10, y: 20, width: 100, height: 40 }]}
        />
      </SystemRoot>
    );
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('rect[width="8"]')).toHaveLength(4);
  });
});
const labels: ProposalBarProps['labels'] = {
  working: 'Preparing changes',
  ready: 'Review changes',
  stale: 'Document changed. Request a fresh proposal.',
  applied: 'Changes applied',
  accept: 'Accept',
  discard: 'Dismiss',
  cancel: 'Cancel',
  undo: 'Undo',
  failed: 'Could not apply. No changes confirmed.',
};
describe('proposal presentation', () => {
  it('blocks stale acceptance and prevents repeated activation while pending', async () => {
    let resolve: () => void = () => {};
    const accept = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        })
    );
    const props: ProposalBarProps = {
      view: {
        phase: 'ready',
        id: 'p1',
        baseRevision: 1,
        currentRevision: 2,
        scopeLabel: 'Selected branch',
        summary: '+2 steps',
      },
      labels,
      onAccept: accept,
      onDismiss: vi.fn(),
      onUndo: vi.fn(),
    };
    const view = render(<ProposalBar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(accept).not.toHaveBeenCalled();
    view.rerender(
      <ProposalBar
        {...props}
        view={{
          ...props.view,
          phase: 'ready',
          id: 'p1',
          baseRevision: 2,
          currentRevision: 2,
          scopeLabel: 'Selected branch',
          summary: '+2 steps',
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(accept).toHaveBeenCalledTimes(1);
    expect(accept).toHaveBeenCalledWith('p1', 2);
    await act(async () => resolve());
  });
  it('reports application failure without claiming success', async () => {
    render(
      <ProposalBar
        labels={labels}
        view={{
          phase: 'ready',
          id: 'p1',
          baseRevision: 1,
          currentRevision: 1,
          scopeLabel: 'Page',
          summary: '+1 step',
        }}
        onAccept={() => Promise.reject(new Error('secret provider detail'))}
        onDismiss={vi.fn()}
        onUndo={vi.fn()}
      />
    );
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Accept' })));
    expect(screen.getByRole('status')).toHaveTextContent(labels.failed);
    expect(screen.queryByText('secret provider detail')).toBeNull();
  });
});
