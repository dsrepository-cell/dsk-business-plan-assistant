import { describe, it, expect } from 'vitest';
import {
  toMonthly, costProduct, summarizeProducts, summarizeExpenses, loanRequired, amortize,
  suggestGrowth, buildSnapshot, type Product, type ExpenseItem,
} from './engine';

const p = (o: Partial<Product>): Product => ({
  id: 'x', name: 'P', qtyPerMonth: 0, sellingPrice: 0, directCostPerUnit: 0, otherCostPerUnit: 0, ...o,
});

describe('expense normalisation', () => {
  it('converts every frequency to monthly', () => {
    expect(toMonthly(1200, 'monthly')).toBe(1200);
    expect(toMonthly(100, 'weekly')).toBeCloseTo(433.33, 2);
    expect(toMonthly(3000, 'quarterly')).toBe(1000);
    expect(toMonthly(12000, 'yearly')).toBe(1000);
  });
  it('gives annual = monthly x 12', () => {
    const e: ExpenseItem[] = [{ id: '1', head: 'Rent', amount: 500, frequency: 'weekly' }];
    const s = summarizeExpenses(e);
    expect(s.annual).toBeCloseTo(s.monthly * 12, 1);
  });
});

describe('product costing (spec example: Pickle)', () => {
  const pickle = costProduct(p({ name: 'Pickle', qtyPerMonth: 500, sellingPrice: 120, directCostPerUnit: 70 }));
  it('revenue 60,000', () => expect(pickle.revenue).toBe(60000));
  it('direct cost 35,000', () => expect(pickle.cost).toBe(35000));
  it('gross profit 25,000', () => expect(pickle.grossProfit).toBe(25000));
  it('margin 41.67%', () => expect(pickle.grossMarginPct).toBeCloseTo(41.67, 2));
});

describe('multi-product totals', () => {
  it('weights margin by revenue', () => {
    const s = summarizeProducts([
      p({ id: 'a', qtyPerMonth: 100, sellingPrice: 100, directCostPerUnit: 50 }), // rev 10000, gp 5000
      p({ id: 'b', qtyPerMonth: 10, sellingPrice: 1000, directCostPerUnit: 900 }), // rev 10000, gp 1000
    ]);
    expect(s.revenue).toBe(20000);
    expect(s.grossProfit).toBe(6000);
    expect(s.grossMarginPct).toBe(30);
    expect(s.totalQty).toBe(110);
  });
});

describe('loan', () => {
  it('loan = project cost - own contribution, never negative', () => {
    expect(loanRequired(120000, 20000)).toBe(100000);
    expect(loanRequired(10000, 20000)).toBe(0);
  });
  it('EMI on 1,00,000 @ 11.5% for 36 months is about 3,297', () => {
    const a = amortize(100000, 11.5, 36, 0);
    expect(a.emi).toBeGreaterThan(3290);
    expect(a.emi).toBeLessThan(3305);
  });
  it('closes to ~zero at the end of tenure', () => {
    const a = amortize(100000, 11.5, 36, 2);
    expect(a.rows[a.rows.length - 1].closing).toBeLessThan(1);
  });
  it('moratorium months are interest-only', () => {
    const a = amortize(100000, 12, 24, 3);
    expect(a.rows[0].principal).toBe(0);
    expect(a.rows[2].principal).toBe(0);
    expect(a.rows[3].principal).toBeGreaterThan(0);
  });
  it('handles zero interest', () => {
    expect(amortize(12000, 0, 12, 0).emi).toBe(1000);
  });
});

describe('growth suggestion', () => {
  it('is higher for new businesses than existing ones', () => {
    expect(suggestGrowth({ isExisting: false, goals: [] }).y1).toBeGreaterThan(suggestGrowth({ isExisting: true, goals: [] }).y1);
  });
  it('explains itself and stays within 2..35', () => {
    const g = suggestGrowth({ isExisting: false, goals: ['buy_new_equipment', 'add_new_products', 'expand_to_new_markets', 'sell_online', 'open_another_outlet', 'hire_more_people', 'increase_production'] });
    expect(g.reasons.length).toBeGreaterThan(3);
    [g.y1, g.y2, g.y3].forEach((v) => { expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(35); });
  });
});

describe('snapshot + validation scenarios', () => {
  const base = {
    products: [p({ id: '1', name: 'Papad', qtyPerMonth: 180, sellingPrice: 140, directCostPerUnit: 61, maxCapacityPerMonth: 400 })],
    expenses: [{ id: 'e', head: 'Electricity', amount: 400, frequency: 'monthly' as const }],
    loan: { totalProjectCost: 120000, ownContribution: 20000, tenureMonths: 36, annualRatePct: 11.5, moratoriumMonths: 2, existingMonthlyEmi: 0 },
    assumptions: { y1: 10, y2: 8, y3: 6 },
  };

  it('scenario: existing food business — healthy, no errors', () => {
    const s = buildSnapshot(base);
    expect(s.products.revenue).toBe(25200);
    expect(s.flags.filter((f) => f.severity === 'error')).toHaveLength(0);
    expect(s.projection).toHaveLength(3);
    expect(s.projection[2].revenue).toBeGreaterThan(s.projection[0].revenue);
  });

  it('scenario: zero revenue — flagged as an error, nothing explodes', () => {
    const s = buildSnapshot({ ...base, products: [p({ name: 'Nothing' })] });
    expect(s.products.revenue).toBe(0);
    expect(s.flags.some((f) => f.code === 'NO_REVENUE')).toBe(true);
    expect(Number.isFinite(s.projection[0].revenue)).toBe(true);
  });

  it('scenario: capacity exceeded by year 3', () => {
    const s = buildSnapshot({ ...base, products: [p({ id: '1', name: 'Papad', qtyPerMonth: 380, sellingPrice: 140, directCostPerUnit: 61, maxCapacityPerMonth: 400 })] });
    expect(s.flags.some((f) => f.code === 'CAPACITY_EXCEEDED')).toBe(true);
  });

  it('scenario: large loan on small income — low DSCR flagged', () => {
    const s = buildSnapshot({ ...base, loan: { ...base.loan, totalProjectCost: 1500000, ownContribution: 50000 } });
    expect(s.flags.some((f) => f.code === 'LOW_DSCR' || f.code === 'NEGATIVE_CASH')).toBe(true);
  });

  it('scenario: missing expenses flagged', () => {
    expect(buildSnapshot({ ...base, expenses: [] }).flags.some((f) => f.code === 'NO_EXPENSES')).toBe(true);
  });

  it('scenario: requested loan differs from calculated', () => {
    const s = buildSnapshot({ ...base, loan: { ...base.loan, requestedAmount: 300000 } });
    expect(s.flags.some((f) => f.code === 'LOAN_MISMATCH')).toBe(true);
  });

  it('principal repayment is not deducted as an expense', () => {
    const s = buildSnapshot(base);
    const y = s.projection[1];
    expect(y.netProfit).toBeCloseTo(y.ebitda - y.interest, 1);
    expect(y.debtService).toBeGreaterThan(y.interest);
  });

  it('no NaN anywhere with empty input', () => {
    const s = buildSnapshot({ ...base, products: [], expenses: [] });
    expect(JSON.stringify(s)).not.toMatch(/NaN|null.*Infinity/);
  });
});
