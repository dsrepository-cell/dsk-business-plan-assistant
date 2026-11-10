import { describe, it, expect } from 'vitest';
import { numberGuard } from './prompts';

const ctx = {
  loan: { required: 100000, emi: 3297.5, annualRatePct: 11.5 },
  projection: [{ year: 1, revenue: 331800, growthPct: 10 }],
  business: { name: 'Shanti Papad' },
};

describe('numberGuard', () => {
  it('accepts figures that are in the verified data (any formatting)', () => {
    const n = { executiveSummary: 'She needs a loan of ₹1,00,000 at 11.5% and expects revenue of ₹3,31,800 in Year 1.' };
    expect(numberGuard(n, ctx)).toEqual([]);
  });
  it('flags an invented figure', () => {
    const n = { executiveSummary: 'She will earn ₹5,00,000 in Year 1.' };
    expect(numberGuard(n, ctx).length).toBeGreaterThan(0);
  });
  it('flags an invented percentage', () => {
    expect(numberGuard({ x: 'Market is growing at 27% a year.' }, ctx)).toContain('27');
  });
  it('does not flag plain year/step words', () => {
    expect(numberGuard({ x: 'In Year 2 and Year 3 she plans to expand.' }, ctx)).toEqual([]);
  });
});
