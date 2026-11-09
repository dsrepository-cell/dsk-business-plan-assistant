import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyAnswers, coerceAnswer, matchesShowIf, toQuestion, visibleQuestions, type Question } from './sector-questions';

const q = (o: Partial<Question>): Question => ({
  key: 'k', label: 'L', icon: null, type: 'text', options: null, placeholder: null, required: false, stage: null,
  show_if: null, sort_order: 0, ...o,
});

// Real seeded questions (same data as 002_seed_sectors.sql)
const cfg = JSON.parse(readFileSync('kit/04_config/sectors.json', 'utf8')) as {
  sectors: { id: string; questions: { key: string; label: string; icon: string; type: string; options: string[] | null; placeholder: string | null; stage: 'existing' | 'new' | null }[] }[];
};
const seeded = (sector: string) =>
  cfg.sectors.find((s) => s.id === sector)!.questions.map((x, i) => toQuestion({ ...x, required: false, show_if: null, sort_order: i }));

describe('stage filtering (acceptance scenario 2: new business hides existing-only questions)', () => {
  it('dairy: milk yield is asked only of an existing business', () => {
    expect(visibleQuestions(seeded('dairy'), 'existing', {}).map((x) => x.key)).toContain('lactation');
    expect(visibleQuestions(seeded('dairy'), 'new', {}).map((x) => x.key)).not.toContain('lactation');
  });
  it('grocery: footfall only for existing; credit question for both (scenario 3)', () => {
    const neu = visibleQuestions(seeded('grocery'), 'new', {}).map((x) => x.key);
    expect(neu).not.toContain('footfall');
    expect(neu).toContain('credit');
  });
  it('every seeded industry has at least 3 questions for a new business', () => {
    cfg.sectors.forEach((s) => expect(visibleQuestions(seeded(s.id), 'new', {}).length).toBeGreaterThanOrEqual(3));
  });
});

describe('show_if', () => {
  it('equals / notEquals / in, including multiselect answers', () => {
    expect(matchesShowIf({ key: 'custom', equals: 'Custom-made' }, { custom: 'Custom-made' })).toBe(true);
    expect(matchesShowIf({ key: 'custom', equals: 'Custom-made' }, {})).toBe(false);
    expect(matchesShowIf({ key: 'vet', notEquals: 'No' }, { vet: 'No' })).toBe(false);
    expect(matchesShowIf({ key: 'vet', notEquals: 'No' }, {})).toBe(true);
    expect(matchesShowIf({ key: 'ch', in: ['Online'] }, { ch: ['WhatsApp', 'Online'] })).toBe(true);
  });
});

describe('coercion', () => {
  it('numbers, yes/no, options, text', () => {
    expect(coerceAnswer(q({ type: 'number' }), ['1,200'])).toEqual({ ok: true, value: 1200 });
    expect(coerceAnswer(q({ type: 'number' }), ['-1']).ok).toBe(false);
    expect(coerceAnswer(q({ type: 'yesno' }), ['Yes'])).toEqual({ ok: true, value: 'Yes' });
    expect(coerceAnswer(q({ type: 'yesno' }), ['Maybe']).ok).toBe(false);
    expect(coerceAnswer(q({ type: 'select', options: ['A', 'B'] }), ['C']).ok).toBe(false);
    expect(coerceAnswer(q({ type: 'multiselect', options: ['A', 'B'] }), ['A', 'A', 'B'])).toEqual({ ok: true, value: ['A', 'B'] });
    expect(coerceAnswer(q({}), ['  '])).toEqual({ ok: true, value: null });
  });
});

describe('applyAnswers', () => {
  const qs = [
    q({ key: 'animals', type: 'number', required: true }),
    q({ key: 'lactation', type: 'number', stage: 'existing' }),
    q({ key: 'custom', type: 'select', options: ['Custom-made', 'Ready-made'] }),
    q({ key: 'measure', type: 'yesno', show_if: { key: 'custom', equals: 'Custom-made' } }),
  ];
  const get = (o: Record<string, string[]>) => (k: string) => o[k] ?? [];

  it('keeps answers to hidden questions (stage switched to new)', () => {
    const r = applyAnswers({ lactation: 8 }, qs, 'new', get({ animals: ['3'] }), true);
    expect(r.answers).toEqual({ lactation: 8, animals: 3 });
    expect(r.errors).toEqual({});
  });
  it('show_if is evaluated against what was just entered', () => {
    const r = applyAnswers({}, qs, 'new', get({ animals: ['3'], custom: ['Custom-made'], measure: ['Yes'] }), true);
    expect(r.answers).toEqual({ animals: 3, custom: 'Custom-made', measure: 'Yes' });
  });
  it('required enforced only when moving forward; blank clears an answer', () => {
    expect(applyAnswers({ animals: 3 }, qs, 'new', get({}), true).errors).toHaveProperty('animals');
    const back = applyAnswers({ animals: 3 }, qs, 'new', get({}), false);
    expect(back.errors).toEqual({});
    expect(back.answers).toEqual({});
  });
  it('bad values are reported and not saved', () => {
    const r = applyAnswers({}, qs, 'existing', get({ animals: ['x'] }), true);
    expect(r.errors.animals).toBeDefined();
    expect(r.answers.animals).toBeUndefined();
  });
});
