import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOnboardingEvents,
  getOnboardingEvents,
  getRecentOnboardingActionSuggestions,
  recordOnboardingEvent,
} from './events';

describe('onboarding events', () => {
  beforeEach(() => {
    localStorage.clear();
    clearOnboardingEvents();
  });

  it('marks the first occurrence of an event type', () => {
    const first = recordOnboardingEvent('welcome_template_selected', { source: 'welcome-modal' });
    const second = recordOnboardingEvent('welcome_template_selected', { source: 'home-empty' });

    expect(first.first).toBe(true);
    expect(second.first).toBe(false);
    expect(getOnboardingEvents()).toHaveLength(2);
  });

  it('stores event detail for lightweight local instrumentation', () => {
    recordOnboardingEvent('first_export_completed', { format: 'cinematic-video' });

    expect(getOnboardingEvents()[0]).toMatchObject({
      name: 'first_export_completed',
      first: true,
      detail: { format: 'cinematic-video' },
    });
  });

  it('returns recent action suggestions without duplicating the same action', () => {
    recordOnboardingEvent('welcome_prompt_selected', { source: 'welcome-modal' });
    recordOnboardingEvent('welcome_import_selected', { source: 'home-dashboard' });
    recordOnboardingEvent('welcome_prompt_selected', { source: 'home-dashboard' });
    recordOnboardingEvent('welcome_template_selected', { source: 'welcome-modal' });

    expect(getRecentOnboardingActionSuggestions()).toEqual([
      expect.objectContaining({ action: 'templates', eventName: 'welcome_template_selected' }),
      expect.objectContaining({ action: 'ai', eventName: 'welcome_prompt_selected' }),
      expect.objectContaining({ action: 'import', eventName: 'welcome_import_selected' }),
    ]);
  });

  it('ignores malformed persisted onboarding payloads', () => {
    localStorage.setItem(
      'openflowkit_onboarding_events',
      JSON.stringify([{ name: 'not-real', at: 123, first: 'yes' }])
    );
    localStorage.setItem(
      'openflowkit_onboarding_event_firsts',
      JSON.stringify({ welcome_prompt_selected: 'yes' })
    );

    expect(getOnboardingEvents()).toEqual([]);

    const event = recordOnboardingEvent('welcome_prompt_selected');
    expect(event.first).toBe(true);
  });
});
