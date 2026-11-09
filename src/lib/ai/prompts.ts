/**
 * AI narrative layer. The model WRITES prose. It never calculates, never sees raw inputs it could re-derive
 * numbers from beyond what is in the frozen snapshot, and is checked afterwards by numberGuard().
 */
import { z } from 'zod';

export const PROMPT_VERSION = 'dsk-narrative-v1';

export const SYSTEM_PROMPT = `You write sections of a Detailed Project Report (DPR) / business plan for a micro-enterprise run by a woman entrepreneur in rural India. The document will be reviewed by a Digital Seva Kendra (DSK) officer and may be submitted to a bank or NBFC.

HARD RULES
1. Every number in the input JSON is final and already verified. You may quote a number exactly as given. You must NEVER calculate, round differently, estimate, extrapolate, or invent any figure, percentage, date, count or price. If a fact is not in the input, do not state it.
2. Do not make claims the data cannot support. No "strong market demand", "rapidly growing market", "loyal customer base" or similar unless a specific input field says so. Prefer plain, specific statements: "She sells through WhatsApp and local shops (current channels)".
3. When a validation flag is present in the input, do not hide it. Reflect it honestly in the Risks section.
4. SWOT: every item must be one sentence that states the specific input it comes from, in the form "<point> — because <data from input>".
5. Growth plan: describe what the entrepreneur said she intends to do and tie it to the growth assumptions given. Do not promise outcomes.
6. Plain, warm, professional English. No hype. No Markdown. Short sentences.
7. Output ONLY a JSON object matching the requested schema. No code fences, no commentary.`;

export const narrativeSchema = z.object({
  executiveSummary: z.string().min(20),
  businessOverview: z.string().min(20),
  marketAnalysis: z.string().min(20),
  marketingPlan: z.string().min(20),
  operationsPlan: z.string().min(20),
  procurementPlan: z.string().min(20),
  employmentGeneration: z.string().min(10),
  swot: z.object({
    strengths: z.array(z.string()).min(1).max(5),
    weaknesses: z.array(z.string()).min(1).max(5),
    opportunities: z.array(z.string()).min(1).max(5),
    threats: z.array(z.string()).min(1).max(5),
  }),
  futureGrowthPlan: z.object({
    shortTerm: z.string(),
    year1: z.string(),
    year2: z.string(),
    year3: z.string(),
    expansionRequirements: z.string(),
  }),
  risksAndMitigation: z.array(z.object({ risk: z.string(), mitigation: z.string() })).min(2).max(8),
  implementationTimeline: z.array(z.object({ period: z.string(), activity: z.string() })).min(2).max(8),
  conclusion: z.string().min(20),
});
export type Narrative = z.infer<typeof narrativeSchema>;

export function buildUserPrompt(context: unknown) {
  return `INPUT (all numbers final):
${JSON.stringify(context, null, 2)}

Return a JSON object with exactly these keys:
{
 "executiveSummary": string (3-4 sentences),
 "businessOverview": string,
 "marketAnalysis": string (use only location, sector, customers and channels given),
 "marketingPlan": string (use industry + location + target customers + current vs proposed channels + pricing approach + goals),
 "operationsPlan": string (use sector answers and capacity),
 "procurementPlan": string (use sector answers about sourcing),
 "employmentGeneration": string (use only staff/hiring facts given),
 "swot": { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] },
 "futureGrowthPlan": { "shortTerm": string, "year1": string, "year2": string, "year3": string, "expansionRequirements": string },
 "risksAndMitigation": [ { "risk": string, "mitigation": string } ],
 "implementationTimeline": [ { "period": string, "activity": string } ],
 "conclusion": string (state the funding requirement exactly as given)
}`;
}

/**
 * numberGuard: find numbers in the AI's prose that are not in the frozen snapshot.
 * Returns the offending tokens so the caller can retry once, then store them as warnings for the reviewer.
 */
function collectNumbers(value: unknown, into: Set<string>) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const r = Math.round(value);
    into.add(String(r));
    into.add(String(value));
    into.add(r.toLocaleString('en-IN'));
    into.add(r.toLocaleString('en-US'));
    into.add(value.toFixed(1)); into.add(value.toFixed(2));
  } else if (typeof value === 'string') {
    (value.match(/\d[\d,]*\.?\d*/g) || []).forEach((t) => into.add(t.replace(/,$/, '')));
  } else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, into));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectNumbers(v, into));
}

export function numberGuard(narrative: unknown, context: unknown): string[] {
  const allowed = new Set<string>(['1', '2', '3', '4', '5', '6', '12', '24', '36']); // year/step words & common month counts
  collectNumbers(context, allowed);
  const found = new Set<string>();
  const text = JSON.stringify(narrative);
  (text.match(/\d[\d,]*\.?\d*/g) || []).forEach((t) => found.add(t.replace(/,$/, '').replace(/\.$/, '')));
  const bad: string[] = [];
  found.forEach((tok) => {
    const plain = tok.replace(/,/g, '');
    if (!allowed.has(tok) && !allowed.has(plain)) bad.push(tok);
  });
  return bad;
}
