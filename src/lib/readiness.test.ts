import { describe, expect, it } from 'vitest';
import { assessReadiness, type ReadinessInput } from './readiness';

const good = (): ReadinessInput => ({
  entrepreneur: { fullName: 'Lakshmi Devi', consentGivenAt: '2026-11-10T05:00:00Z', placeId: 42 },
  stage: 'existing',
  missingRequiredQuestions: [],
  products: [{ id: 'p', name: 'Blouse', qtyPerMonth: 100, sellingPrice: 400, directCostPerUnit: 180, otherCostPerUnit: 20 }],
  expenses: [{ id: 'e', head: 'Rent', amount: 3000, frequency: 'monthly' }],
  assets: [{ id: 'a', name: 'Sewing machine', qty: 1, unitCost: 50000 }],
  otherSetupCost: 10000,
  loan: { ownContribution: 10000, tenureMonths: 36, annualRatePct: 12, moratoriumMonths: 2, existingMonthlyEmi: 0 },
  statedMonthlyTurnover: 40000,
  growth: { approved: { y1: 13, y2: 5, y3: 3 }, stale: false },
});
const codes = (r: ReturnType<typeof assessReadiness>, sev?: string) =>
  r.issues.filter((i) => !sev || i.severity === sev).map((i) => i.code);

describe('readiness', () => {
  it('a complete, healthy case can generate', () => {
    const r = assessReadiness(good());
    expect(codes(r, 'error')).toEqual([]);
    expect(r.canGenerate).toBe(true);
    expect(r.snapshot.loan.required).toBe(50000);
    expect(r.snapshot.projection.map((y) => y.growthPct)).toEqual([13, 5, 3]); // approved figures are used
  });

  it('missing basics block generation and point to the screen that fixes them', () => {
    const i = good();
    i.entrepreneur = { fullName: null, consentGivenAt: null, placeId: null };
    i.stage = null;
    i.missingRequiredQuestions = ['Machine type'];
    const r = assessReadiness(i);
    expect(r.canGenerate).toBe(false);
    expect(r.blocking.map((x) => [x.code, x.step])).toEqual(
      expect.arrayContaining([
        ['MISSING_NAME', 'entrepreneur'], ['NO_CONSENT', 'entrepreneur'], ['NO_LOCATION', 'location'],
        ['NO_STAGE', 'business'], ['MISSING_DETAILS', 'details'],
      ]),
    );
  });

  it('growth must be approved, and an outdated approval does not count', () => {
    const notApproved = assessReadiness({ ...good(), growth: { approved: null, stale: false } });
    expect(codes(notApproved, 'error')).toContain('GROWTH_NOT_APPROVED');
    expect(notApproved.snapshot.projection.map((y) => y.growthPct)).toEqual([0, 0, 0]); // nothing assumed
    const stale = assessReadiness({ ...good(), growth: { approved: { y1: 8, y2: 5, y3: 3 }, stale: true } });
    expect(codes(stale, 'error')).toContain('GROWTH_STALE');
    expect(stale.canGenerate).toBe(false);
  });

  it('engine error flags block; engine warnings do not', () => {
    const loss = good();
    loss.products = [{ ...loss.products[0], directCostPerUnit: 500 }];
    const r = assessReadiness(loss);
    expect(codes(r, 'error')).toContain('LOSS_MAKING');
    expect(r.blocking.find((x) => x.code === 'LOSS_MAKING')?.step).toBe('products');
    expect(r.canGenerate).toBe(false);

    const warnOnly = assessReadiness({ ...good(), statedMonthlyTurnover: 90000 });
    expect(codes(warnOnly, 'warning')).toContain('TURNOVER_MISMATCH');
    expect(warnOnly.canGenerate).toBe(true);
  });

  it('there must be something for the loan to pay for, and a loan to repay', () => {
    expect(codes(assessReadiness({ ...good(), assets: [], otherSetupCost: 0 }), 'error')).toContain('NO_PROJECT_COST');
    const selfFunded = good();
    selfFunded.loan = { ...selfFunded.loan, ownContribution: 60000 };
    expect(codes(assessReadiness(selfFunded), 'error')).toContain('NO_LOAN_NEEDED');
  });

  it('errors are listed before warnings', () => {
    const i = good();
    i.entrepreneur.consentGivenAt = null;
    i.statedMonthlyTurnover = 90000;
    const sev = assessReadiness(i).issues.map((x) => x.severity);
    expect(sev.indexOf('warning')).toBeGreaterThan(sev.lastIndexOf('error'));
  });
});
