import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../engine';
import { buildPlanContext, type PlanContextInput } from './context';
import { narrativeSchema, numberGuard } from './prompts';
import { templateNarrative } from './template';

function input(over: Partial<PlanContextInput> = {}): PlanContextInput {
  const snapshot = buildSnapshot({
    products: [
      { id: 'a', name: 'Blouse stitching', unit: 'piece', qtyPerMonth: 120, sellingPrice: 350, directCostPerUnit: 140, otherCostPerUnit: 25, maxCapacityPerMonth: 200 },
      { id: 'b', name: 'Saree fall', qtyPerMonth: 60, sellingPrice: 80, directCostPerUnit: 30, otherCostPerUnit: 0 },
    ],
    expenses: [
      { id: 'r', head: 'Rent', amount: 2500, frequency: 'monthly' },
      { id: 'e', head: 'Electricity', amount: 1800, frequency: 'quarterly' },
    ],
    loan: { totalProjectCost: 68500, ownContribution: 8500, tenureMonths: 36, annualRatePct: 11.5, moratoriumMonths: 2, existingMonthlyEmi: 0 },
    assumptions: { y1: 13, y2: 5, y3: 3 },
    fixedAssetCount: 2,
  });
  return {
    snapshot,
    entrepreneur: { name: 'Lakshmi Devi', education: '10th pass', socialCategory: 'OBC', householdMembers: 5 },
    location: { village: 'Kothapalli', district: 'Rangareddy', state: 'Telangana', pincode: '501505' },
    business: { sectorName: 'Tailoring', stage: 'existing', name: 'Lakshmi Tailors' },
    sectorAnswers: { 'Machine type': 'Electric', 'Custom orders?': 'Yes' },
    assets: [{ name: 'Industrial sewing machine', cost: 60000 }, { name: 'Cutting table', cost: 6000 }],
    otherSetupCost: 2500,
    growth: [1, 2, 3].map((year, i) => ({ year, suggestedPct: [13, 5, 3][i], approvedPct: [13, 5, 3][i], reasons: ['Existing business: base growth of 8% a year.'] })),
    futurePlan: { goals: ['buy_new_equipment', 'sell_online'], loanGoal: 'Buy an industrial machine', threeYearVision: 'A small unit with two helpers' },
    marketing: { targetCustomers: 'Women in nearby villages', currentChannels: ['Local market'], proposedChannels: ['Local market', 'WhatsApp'], pricingStrategy: 'Value for money', competitiveAdvantage: 'Fast delivery' },
    ...over,
  };
}

describe('plan context', () => {
  it('never carries mobile numbers or IDs, and labels goals in plain words', () => {
    const c = buildPlanContext(input());
    const json = JSON.stringify(c);
    expect(json).not.toMatch(/mobile|aadhaar|pan\b|account/i);
    expect(c.futurePlan?.goals).toEqual(['Buy new equipment', 'Sell online']);
    expect(c.loan.required).toBe(60000);
  });
});

describe('standard wording (no AI)', () => {
  it('fills every section of the plan format', () => {
    const n = templateNarrative(buildPlanContext(input()));
    expect(narrativeSchema.safeParse(n).success).toBe(true);
    expect(n.conclusion).toContain('₹60,000');
    expect(n.futureGrowthPlan.year1).toContain('13%');
  });

  it('uses no number that is not in the verified data', () => {
    const c = buildPlanContext(input());
    expect(numberGuard(templateNarrative(c), c)).toEqual([]);
  });

  it('still produces a valid plan for a sparse new-business case', () => {
    const c = buildPlanContext(
      input({
        business: { sectorName: 'Dairy', stage: 'new', name: null },
        sectorAnswers: {},
        futurePlan: null,
        marketing: null,
        entrepreneur: { name: null, education: null, socialCategory: null, householdMembers: null },
      }),
    );
    const n = templateNarrative(c);
    expect(narrativeSchema.safeParse(n).success).toBe(true);
    expect(numberGuard(n, c)).toEqual([]);
    expect(n.swot.weaknesses[0]).toMatch(/new business/);
  });

  it('numberGuard catches an invented figure', () => {
    const c = buildPlanContext(input());
    const n = templateNarrative(c);
    expect(numberGuard({ ...n, conclusion: n.conclusion + ' Sales will reach ₹9,99,999.' }, c)).toContain('9,99,999');
  });
});
