/**
 * Future plan, marketing and growth assumptions (prototype steps 10–12).
 * Growth: the SUGGESTION always comes from engine.suggestGrowth (server-side, from what is stored); the operator's
 * APPROVED figures are stored next to it. An approval goes stale if the suggestion it was given against changes
 * (e.g. her goals were edited afterwards) — then it must be reviewed and approved again.
 */
import { GOAL_KEYS, suggestGrowth, type Assumptions, type Goal } from './engine';
import { CHANNELS, PRICING_STRATEGIES } from './choices';
import { parseNumber } from './numbers';

export const TEXT_MAX = 500;
export const GROWTH_MIN = -50;
export const GROWTH_MAX = 100;
type Errors = Record<string, string>;

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');
function text(fd: FormData, key: string, errors: Errors): string | null {
  const v = str(fd.get(key));
  if (v.length > TEXT_MAX) errors[key] = `Keep this under ${TEXT_MAX} characters.`;
  return v || null;
}
function pickMany<T extends string>(fd: FormData, key: string, allowed: readonly T[], errors: Errors): T[] {
  const vals = [...new Set(fd.getAll(key).map((v) => str(v)).filter(Boolean))];
  if (vals.some((v) => !(allowed as readonly string[]).includes(v))) errors[key] = 'Choose from the options shown.';
  return vals.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/* ---------------- Future plan ---------------- */
export function parseFuturePlan(fd: FormData) {
  const errors: Errors = {};
  const value = {
    goals: pickMany<Goal>(fd, 'goals', GOAL_KEYS, errors),
    loan_goal: text(fd, 'loan_goal', errors),
    three_year_vision: text(fd, 'three_year_vision', errors),
  };
  return { value, errors };
}
export const toGoals = (v: unknown): Goal[] =>
  Array.isArray(v) ? v.filter((g): g is Goal => (GOAL_KEYS as readonly string[]).includes(String(g))) : [];

/* ---------------- Marketing ---------------- */
export function parseMarketing(fd: FormData) {
  const errors: Errors = {};
  const pricing = str(fd.get('pricing_strategy'));
  if (pricing && !(PRICING_STRATEGIES as readonly string[]).includes(pricing)) errors.pricing_strategy = 'Choose from the options shown.';
  const value = {
    target_customers: text(fd, 'target_customers', errors),
    current_channels: pickMany(fd, 'current_channels', CHANNELS, errors),
    proposed_channels: pickMany(fd, 'proposed_channels', CHANNELS, errors),
    pricing_strategy: (PRICING_STRATEGIES as readonly string[]).includes(pricing) ? pricing : null,
    competitive_advantage: text(fd, 'competitive_advantage', errors),
  };
  return { value, errors };
}

/* ---------------- Growth assumptions ---------------- */
export const YEARS = [1, 2, 3] as const;
const KEY = { 1: 'y1', 2: 'y2', 3: 'y3' } as const;
export type GrowthRow = { year: number; suggested_pct: number; approved_pct: number | null; approved_at: string | null };

/** The engine's suggestion for this case, from what is stored (stage + goals). */
export function currentSuggestion(stage: 'existing' | 'new' | null, goals: Goal[]) {
  return suggestGrowth({ isExisting: stage === 'existing', goals });
}

/**
 * approved: the operator-approved figures, or null if any year is not approved.
 * stale: there IS an approval, but it was given against a different suggestion → must be re-approved.
 * Only `approved && !stale` counts as approved for generating a plan.
 */
export function growthState(rows: GrowthRow[], suggestion: Assumptions) {
  const byYear = new Map(rows.map((r) => [Number(r.year), r]));
  const all = YEARS.map((y) => byYear.get(y));
  const complete = all.every((r) => r && r.approved_pct !== null);
  const approved: Assumptions | null = complete
    ? { y1: Number(all[0]!.approved_pct), y2: Number(all[1]!.approved_pct), y3: Number(all[2]!.approved_pct) }
    : null;
  const stale = Boolean(approved) && YEARS.some((y) => Number(byYear.get(y)!.suggested_pct) !== suggestion[KEY[y]]);
  const approvedAt = complete ? all.map((r) => r!.approved_at).filter(Boolean).sort().at(-1) ?? null : null;
  return { approved, stale, isApproved: Boolean(approved) && !stale, approvedAt };
}

/** The three % fields as typed. Each must be a number between -50 and 100 (2 decimals max). */
export function parseGrowthInput(fd: FormData): { values: Assumptions | null; errors: Errors } {
  const errors: Errors = {};
  const out: Partial<Assumptions> = {};
  for (const y of YEARS) {
    const k = KEY[y];
    const v = parseNumber(str(fd.get(k)).replace(/%$/, ''));
    if (v === null) errors[k] = `Enter the Year ${y} growth %.`;
    else if (Number.isNaN(v)) errors[k] = 'Enter a number, e.g. 10 or 7.5.';
    else if (v < GROWTH_MIN || v > GROWTH_MAX) errors[k] = `Use a value between ${GROWTH_MIN}% and ${GROWTH_MAX}%.`;
    else if (Math.round(v * 100) !== v * 100) errors[k] = 'Use at most 2 decimal places.';
    else out[k] = v;
  }
  return { values: Object.keys(errors).length ? null : (out as Assumptions), errors };
}
