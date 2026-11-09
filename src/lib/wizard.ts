/**
 * Wizard steps, in the prototype's order (kit/reference/DSK_Business_Plan_Assistant.jsx, steps 1–13).
 * `businesses.current_step` stores the key of the step to resume at.
 * The screens themselves arrive in Phases 3–7; this list is the single source of order and labels.
 */
export const WIZARD_STEPS = [
  { key: 'sector', label: 'Industry' },
  { key: 'location', label: 'Location' },
  { key: 'entrepreneur', label: 'Entrepreneur & household' },
  { key: 'business', label: 'Existing business' },
  { key: 'products', label: 'Products & costing' },
  { key: 'details', label: 'Industry details' },
  { key: 'expenses', label: 'Monthly expenses' },
  { key: 'assets', label: 'Loan purpose & assets' },
  { key: 'loan', label: 'Loan terms' },
  { key: 'future', label: 'Future plan' },
  { key: 'marketing', label: 'Marketing & sales' },
  { key: 'growth', label: 'Growth assumptions' },
  { key: 'review', label: 'Review' },
] as const;

export type StepKey = (typeof WIZARD_STEPS)[number]['key'];

export function isStepKey(v: unknown): v is StepKey {
  return WIZARD_STEPS.some((s) => s.key === v);
}

export function stepIndex(key: string | null | undefined): number {
  const i = WIZARD_STEPS.findIndex((s) => s.key === key);
  return i < 0 ? 1 : i; // unknown/missing → location (sector is always chosen at creation)
}

export function nextStep(key: StepKey): StepKey | null {
  const i = stepIndex(key);
  return i + 1 < WIZARD_STEPS.length ? WIZARD_STEPS[i + 1].key : null;
}

export function prevStep(key: StepKey): StepKey | null {
  const i = stepIndex(key);
  return i > 0 ? WIZARD_STEPS[i - 1].key : null;
}

export function resumeHref(businessId: string, currentStep: string | null | undefined) {
  const key = isStepKey(currentStep) && currentStep !== 'sector' ? currentStep : 'location';
  return `/cases/${businessId}/${key}`;
}

export const CASE_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  assumptions_pending: 'Assumptions pending',
  ready_for_review: 'Ready for review',
  approved: 'Approved',
  submitted: 'Submitted',
};
