import { describe, expect, it } from 'vitest';
import { currentSuggestion, growthState, parseFuturePlan, parseGrowthInput, parseMarketing, toGoals } from './plans';

const fd = (entries: [string, string][]) => {
  const f = new FormData();
  entries.forEach(([k, v]) => f.append(k, v));
  return f;
};

describe('future plan', () => {
  it('keeps known goal keys, rejects unknown ones, trims text', () => {
    const { value, errors } = parseFuturePlan(fd([['goals', 'buy_new_equipment'], ['goals', 'sell_online'], ['loan_goal', '  Buy a machine ']]));
    expect(value).toEqual({ goals: ['buy_new_equipment', 'sell_online'], loan_goal: 'Buy a machine', three_year_vision: null });
    expect(errors).toEqual({});
    expect(parseFuturePlan(fd([['goals', 'rob_a_bank']])).errors.goals).toBeDefined();
  });
  it('limits text length', () => {
    expect(parseFuturePlan(fd([['three_year_vision', 'x'.repeat(501)]])).errors.three_year_vision).toMatch(/500/);
  });
  it('reads stored goals defensively', () => {
    expect(toGoals(['sell_online', 'nope', 3])).toEqual(['sell_online']);
    expect(toGoals(null)).toEqual([]);
  });
});

describe('marketing', () => {
  it('accepts prototype channels and one pricing approach', () => {
    const { value, errors } = parseMarketing(
      fd([['current_channels', 'Local market'], ['current_channels', 'WhatsApp'], ['proposed_channels', 'Online'], ['pricing_strategy', 'Value for money']]),
    );
    expect(errors).toEqual({});
    expect(value.current_channels).toEqual(['Local market', 'WhatsApp']);
    expect(value.pricing_strategy).toBe('Value for money');
  });
  it('rejects channels and pricing that were not offered', () => {
    const { errors } = parseMarketing(fd([['proposed_channels', 'Teleshopping'], ['pricing_strategy', 'Free']]));
    expect(Object.keys(errors).sort()).toEqual(['pricing_strategy', 'proposed_channels']);
  });
});

describe('growth assumptions', () => {
  const sug = currentSuggestion('existing', ['buy_new_equipment']); // 13 / 5 / 3
  const rows = (a: [number, number | null][], suggested = [sug.y1, sug.y2, sug.y3]) =>
    a.map(([year, approved], i) => ({ year, suggested_pct: suggested[i], approved_pct: approved, approved_at: approved === null ? null : `2026-11-10T0${i}:00:00Z` }));

  it('suggestion comes from the engine rules', () => {
    expect([sug.y1, sug.y2, sug.y3]).toEqual([13, 5, 3]);
    expect(sug.reasons.join(' ')).toMatch(/new equipment/);
  });
  it('approved only when all three years have an approved figure', () => {
    expect(growthState(rows([[1, 12], [2, 5], [3, null]]), sug).isApproved).toBe(false);
    const s = growthState(rows([[1, 12], [2, 5], [3, 3]]), sug);
    expect(s).toMatchObject({ isApproved: true, stale: false, approved: { y1: 12, y2: 5, y3: 3 }, approvedAt: '2026-11-10T02:00:00Z' });
  });
  it('an approval given against an older suggestion is stale and does not count', () => {
    const s = growthState(rows([[1, 8], [2, 5], [3, 3]], [8, 5, 3]), sug);
    expect(s).toMatchObject({ stale: true, isApproved: false });
  });
  it('parses the three % fields with limits', () => {
    expect(parseGrowthInput(fd([['y1', '12.5'], ['y2', '5%'], ['y3', '-2']])).values).toEqual({ y1: 12.5, y2: 5, y3: -2 });
    const bad = parseGrowthInput(fd([['y1', ''], ['y2', '150'], ['y3', '1.234']]));
    expect(bad.values).toBeNull();
    expect(Object.keys(bad.errors).sort()).toEqual(['y1', 'y2', 'y3']);
  });
});
