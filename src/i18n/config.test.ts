import { describe, expect, it } from 'vitest';
import { getTranslationFallback } from './config';

describe('getTranslationFallback', () => {
  it('returns the English translation when the key exists', () => {
    expect(getTranslationFallback('properties.title')).toBe('Properties');
  });

  it('formats missing keys into readable English labels', () => {
    expect(getTranslationFallback('propertiesPanel.someMissingKey')).toBe('Some Missing Key');
    expect(getTranslationFallback('toolbar.add_blank_shape')).toBe('Add blank shape');
  });
});
