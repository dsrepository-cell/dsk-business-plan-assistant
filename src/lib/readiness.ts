/**
 * Is this case ready to generate a plan? One pure function, used by the review screen AND (Phase 8) re-run inside
 * the generation route, so the gate can't be bypassed from the browser.
 *
 * Two sources of issues, each linked to the wizard step where it is fixed:
 *  1. Completeness checks (below) — things a loan-ready plan cannot be written without.
 *  2. The engine's own validation flags, computed with the OPERATOR-APPROVED growth assumptions.
 * Any issue with severity 'error' blocks generation. Warnings and info are shown, never block.
 */
import { NO_GROWTH, buildSnapshot, summarizeAssets, type Assumptions, type AssetItem, type ExpenseItem, type Flag, type LoanInput, type Product } from './engine';
import type { StepKey } from './wizard';

export type Issue = Flag & { step: StepKey };

export type ReadinessInput = {
  entrepreneur: { fullName: string | null; consentGivenAt: string | null; placeId: number | null };
  stage: 'existing' | 'new' | null;
  /** Labels of required industry questions (visible for her stage) that are still unanswered. */
  missingRequiredQuestions: string[];
  products: Product[];
  expenses: ExpenseItem[];
  assets: AssetItem[];
  otherSetupCost: number;
  loan: Omit<LoanInput, 'totalProjectCost'>;
  statedMonthlyTurnover: number | null;
  growth: { approved: Assumptions | null; stale: boolean };
};

/** Which screen fixes each engine flag. */
const FLAG_STEP: Record<string, StepKey> = {
  NO_REVENUE: 'products', ZERO_COST: 'products', HIGH_MARGIN: 'products', THIN_MARGIN: 'products',
  LOSS_MAKING: 'products', TURNOVER_MISMATCH: 'products', CAPACITY_EXCEEDED: 'growth', HIGH_GROWTH: 'growth',
  NO_EXPENSES: 'expenses', NO_ASSET_LIST: 'assets', LOAN_MISMATCH: 'loan', LOW_DSCR: 'loan',
  NEGATIVE_CASH: 'loan', NEGATIVE_PROFIT: 'loan',
};
const ORDER: Record<Flag['severity'], number> = { error: 0, warning: 1, info: 2 };

export function assessReadiness(input: ReadinessInput) {
  const issues: Issue[] = [];
  const add = (severity: Flag['severity'], code: string, message: string, step: StepKey) => issues.push({ severity, code, message, step });

  // ---- completeness ----
  if (!input.entrepreneur.fullName) add('error', 'MISSING_NAME', 'Her full name is missing.', 'entrepreneur');
  if (!input.entrepreneur.consentGivenAt) add('error', 'NO_CONSENT', 'Her consent has not been recorded.', 'entrepreneur');
  if (!input.entrepreneur.placeId) add('error', 'NO_LOCATION', 'Her village / town has not been chosen.', 'location');
  if (!input.stage) add('error', 'NO_STAGE', 'Choose whether this is an existing business or a new idea.', 'business');
  if (input.missingRequiredQuestions.length)
    add('error', 'MISSING_DETAILS', `Required industry questions not answered: ${input.missingRequiredQuestions.join(', ')}.`, 'details');

  const cost = summarizeAssets(input.assets, input.otherSetupCost);
  if (cost.totalProjectCost <= 0) add('error', 'NO_PROJECT_COST', 'Nothing has been listed for the loan to pay for.', 'assets');
  else if (input.loan.ownContribution >= cost.totalProjectCost)
    add('error', 'NO_LOAN_NEEDED', 'Her own contribution covers the whole project cost, so no loan is needed.', 'assets');

  if (!input.growth.approved) add('error', 'GROWTH_NOT_APPROVED', 'The growth assumptions have not been approved by the DSK operator.', 'growth');
  else if (input.growth.stale)
    add('error', 'GROWTH_STALE', 'Her answers changed after the growth assumptions were approved. Review and approve them again.', 'growth');

  // ---- engine (with approved growth; the 0% baseline only while nothing is approved) ----
  const assumptions = input.growth.approved && !input.growth.stale ? input.growth.approved : NO_GROWTH;
  const snapshot = buildSnapshot({
    products: input.products,
    expenses: input.expenses,
    loan: { ...input.loan, totalProjectCost: cost.totalProjectCost },
    assumptions,
    statedMonthlyTurnover: input.statedMonthlyTurnover,
    fixedAssetCount: input.assets.length,
  });
  for (const f of snapshot.flags) issues.push({ ...f, step: FLAG_STEP[f.code] ?? 'review' });

  issues.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const blocking = issues.filter((i) => i.severity === 'error');
  return { snapshot, projectCost: cost, assumptions, issues, blocking, canGenerate: blocking.length === 0 };
}
export type Readiness = ReturnType<typeof assessReadiness>;
