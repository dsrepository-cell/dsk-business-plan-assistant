/**
 * Editing the plan text on a phone: every section becomes a plain text box. Lists are one item per line;
 * risks and timeline rows are "first part | second part". Pure, so the same rules are unit-tested.
 */
import { narrativeSchema, type Narrative } from './ai/prompts';

export const TEXT_SECTIONS = [
  ['executiveSummary', 'Executive summary'],
  ['businessOverview', 'Business overview'],
  ['marketAnalysis', 'Market analysis'],
  ['marketingPlan', 'Marketing plan'],
  ['operationsPlan', 'Operations plan'],
  ['procurementPlan', 'Procurement plan'],
  ['employmentGeneration', 'Employment generation'],
  ['conclusion', 'Conclusion'],
] as const;
export const SWOT_PARTS = [
  ['strengths', 'Strengths'],
  ['weaknesses', 'Weaknesses'],
  ['opportunities', 'Opportunities'],
  ['threats', 'Threats'],
] as const;
export const GROWTH_PARTS = [
  ['shortTerm', 'Short term'],
  ['year1', 'Year 1'],
  ['year2', 'Year 2'],
  ['year3', 'Year 3'],
  ['expansionRequirements', 'Expansion requirements'],
] as const;

export type PlanForm = Record<string, string>;

const LABEL: Record<string, string> = {
  ...Object.fromEntries(TEXT_SECTIONS),
  ...Object.fromEntries(SWOT_PARTS.map(([k, l]) => [`swot.${k}`, l])),
  ...Object.fromEntries(GROWTH_PARTS.map(([k, l]) => [`growth.${k}`, l])),
  risksAndMitigation: 'Risks and mitigation',
  implementationTimeline: 'Implementation timeline',
};

export function narrativeToForm(n: Narrative): PlanForm {
  const f: PlanForm = {};
  for (const [k] of TEXT_SECTIONS) f[k] = n[k];
  for (const [k] of SWOT_PARTS) f[`swot.${k}`] = n.swot[k].join('\n');
  for (const [k] of GROWTH_PARTS) f[`growth.${k}`] = n.futureGrowthPlan[k];
  f.risks = n.risksAndMitigation.map((r) => `${r.risk} | ${r.mitigation}`).join('\n');
  f.timeline = n.implementationTimeline.map((t) => `${t.period} | ${t.activity}`).join('\n');
  return f;
}

const MAX = 4000;
const lines = (v: string | undefined) => (v ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
const pairs = <A extends string, B extends string>(v: string | undefined, a: A, b: B) =>
  lines(v).map((l) => {
    const i = l.indexOf('|');
    return (i < 0 ? { [a]: l, [b]: '' } : { [a]: l.slice(0, i).trim(), [b]: l.slice(i + 1).trim() }) as Record<A | B, string>;
  });

/** Form → narrative, validated against the same schema the AI must meet. */
export function formToNarrative(get: (k: string) => string | undefined): { narrative: Narrative | null; error: string | null } {
  const g = (k: string) => (get(k) ?? '').trim().slice(0, MAX);
  const candidate = {
    ...Object.fromEntries(TEXT_SECTIONS.map(([k]) => [k, g(k)])),
    swot: Object.fromEntries(SWOT_PARTS.map(([k]) => [k, lines(g(`swot.${k}`))])),
    futureGrowthPlan: Object.fromEntries(GROWTH_PARTS.map(([k]) => [k, g(`growth.${k}`)])),
    risksAndMitigation: pairs(g('risks'), 'risk', 'mitigation'),
    implementationTimeline: pairs(g('timeline'), 'period', 'activity'),
  };
  const r = narrativeSchema.safeParse(candidate);
  if (r.success) return { narrative: r.data, error: null };
  const issue = r.error.issues[0];
  const [top, sub] = issue.path.map(String);
  const label =
    LABEL[top] ??
    (top === 'swot' ? `SWOT – ${LABEL[`swot.${sub}`] ?? sub}` : top === 'futureGrowthPlan' ? `Growth plan – ${LABEL[`growth.${sub}`] ?? sub}` : top);
  const why = issue.code === 'too_small' ? 'it is empty or too short' : issue.code === 'too_big' ? 'it has too many lines' : 'it is not valid';
  return { narrative: null, error: `Please check “${label}”: ${why}.` };
}
