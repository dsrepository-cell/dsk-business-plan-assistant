/**
 * The ONLY data the narrative writer (AI or standard wording) ever sees. Built from the frozen engine snapshot
 * plus descriptive answers. Deliberately excluded (rule 6): mobile number, ID numbers, documents, exact address,
 * household income, age. Every number here comes from the engine or was typed by the operator.
 */
import type { buildSnapshot } from '../engine';
import { GOAL_LABELS } from '../choices';

type Snapshot = ReturnType<typeof buildSnapshot>;

export type PlanContextInput = {
  snapshot: Snapshot;
  entrepreneur: { name: string | null; education: string | null; socialCategory: string | null; householdMembers: number | null };
  location: { village: string | null; district: string | null; state: string | null; pincode: string | null };
  business: { sectorName: string; stage: 'existing' | 'new' | null; name: string | null };
  /** Industry answers as { question label: answer }. */
  sectorAnswers: Record<string, string | number | string[]>;
  assets: { name: string; cost: number }[];
  otherSetupCost: number;
  growth: { year: number; suggestedPct: number; approvedPct: number; reasons: string[] }[];
  futurePlan: { goals: string[]; loanGoal: string | null; threeYearVision: string | null } | null;
  marketing: {
    targetCustomers: string | null; currentChannels: string[]; proposedChannels: string[];
    pricingStrategy: string | null; competitiveAdvantage: string | null;
  } | null;
};

export function buildPlanContext(i: PlanContextInput) {
  const s = i.snapshot;
  return {
    entrepreneur: i.entrepreneur,
    location: i.location,
    business: { sector: i.business.sectorName, stage: i.business.stage, name: i.business.name, sectorAnswers: i.sectorAnswers },
    products: s.products.rows.map((p) => ({
      name: p.name, unit: p.unit ?? null, qtyPerMonth: p.qtyPerMonth, sellingPrice: p.sellingPrice,
      revenuePerMonth: p.revenue, grossMarginPct: p.grossMarginPct, maxCapacityPerMonth: p.maxCapacityPerMonth ?? null,
    })),
    productTotals: { revenuePerMonth: s.products.revenue, grossProfitPerMonth: s.products.grossProfit, grossMarginPct: s.products.grossMarginPct },
    expenseTotals: { monthly: s.expenses.monthly, annual: s.expenses.annual, heads: s.expenses.rows.map((e) => ({ head: e.head, monthly: e.monthly })) },
    monthlyOperatingProfit: s.monthlyOperatingProfit,
    breakEvenRevenueMonthly: s.breakEvenRevenueMonthly,
    projectCost: { items: i.assets, otherSetupCost: i.otherSetupCost },
    loan: s.loan,
    projection: s.projection.map(({ year, growthPct, revenue, ebitda, netProfit, dscr }) => ({ year, growthPct, revenue, ebitda, netProfit, dscr })),
    growth: i.growth,
    futurePlan: i.futurePlan && {
      goals: i.futurePlan.goals.map((g) => GOAL_LABELS[g as keyof typeof GOAL_LABELS] ?? g),
      loanGoal: i.futurePlan.loanGoal,
      threeYearVision: i.futurePlan.threeYearVision,
    },
    marketing: i.marketing,
    validationFlags: s.flags.map((f) => f.message),
  };
}
export type PlanContext = ReturnType<typeof buildPlanContext>;
