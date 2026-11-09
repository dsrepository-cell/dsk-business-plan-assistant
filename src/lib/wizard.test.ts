import { describe, it, expect } from 'vitest';
import { WIZARD_STEPS, nextStep, prevStep, resumeHref, stepIndex } from './wizard';

describe('wizard steps', () => {
  it('follows the prototype: 13 steps, sector first, review last', () => {
    expect(WIZARD_STEPS).toHaveLength(13);
    expect(WIZARD_STEPS[0].key).toBe('sector');
    expect(WIZARD_STEPS.at(-1)!.key).toBe('review');
  });
  it('moves forward and back', () => {
    expect(nextStep('location')).toBe('entrepreneur');
    expect(prevStep('entrepreneur')).toBe('location');
    expect(nextStep('review')).toBeNull();
    expect(prevStep('sector')).toBeNull();
  });
  it('resumes at the saved step, falling back to location', () => {
    expect(resumeHref('abc', 'expenses')).toBe('/cases/abc/expenses');
    expect(resumeHref('abc', null)).toBe('/cases/abc/location');
    expect(resumeHref('abc', 'not-a-step')).toBe('/cases/abc/location');
    expect(resumeHref('abc', 'sector')).toBe('/cases/abc/location');
    expect(stepIndex('loan')).toBe(8);
  });
});
