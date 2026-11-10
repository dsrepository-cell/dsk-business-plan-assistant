import { z } from 'zod';

/**
 * Form parsing for the wizard. Choice lists are the prototype's (kit/reference/DSK_Business_Plan_Assistant.jsx).
 * `next` = full validation (required fields enforced); `back` = save whatever is valid, nothing required,
 * so going back never loses what she already typed.
 */
import { EDUCATION, GENDERS, SOCIAL_CATS } from './choices';
export { EDUCATION, GENDERS, SOCIAL_CATS };

export type Nav = 'next' | 'back' | 'exit';
export function readNav(v: FormDataEntryValue | null): Nav {
  return v === 'back' || v === 'exit' ? v : 'next';
}

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

/** "" → null; "1,200" / "₹ 1200" → 1200; anything else that isn't a number → NaN (caught by the schema). */
export function parseNumber(v: FormDataEntryValue | null): number | null {
  const s = str(v).replace(/[₹,\s]/g, '');
  if (s === '') return null;
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN;
}

/** Indian mobile: 10 digits starting 6–9; accepts +91 / 0 prefix and spaces. "" → null. */
export function normaliseMobile(v: string): string | null {
  const d = v.replace(/\D/g, '');
  if (d === '') return null;
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : 'INVALID';
}

const count = (label: string, max: number) =>
  z.number({ error: `${label}: enter a number.` }).int(`${label}: whole number.`).min(0, `${label} can't be negative.`).max(max, `${label} looks too large.`).nullable();
const money = (label: string) =>
  z.number({ error: `${label}: enter an amount.` }).min(0, `${label} can't be negative.`).max(100_000_000, `${label} looks too large.`).nullable();

export const entrepreneurSchema = z
  .object({
    full_name: z.string().max(120).nullable(),
    gender: z.enum(GENDERS).nullable(),
    age_years: z.number({ error: 'Age: enter a number.' }).int('Age: whole years.').min(18, 'Age must be 18 or more.').max(100, 'Age looks wrong.').nullable(),
    mobile: z.string().nullable().refine((m) => m !== 'INVALID', 'Mobile: 10 digits starting with 6, 7, 8 or 9.'),
    education: z.enum(EDUCATION).nullable(),
    social_category: z.enum(SOCIAL_CATS).nullable(),
    household_members: count('Members', 50),
    earning_members: count('Earning members', 50),
    dependents: count('Dependents', 50),
    monthly_family_income: money('Family income'),
    consent: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.household_members != null && v.earning_members != null && v.earning_members > v.household_members)
      ctx.addIssue({ code: 'custom', path: ['earning_members'], message: 'Earning members can’t be more than household members.' });
    if (v.household_members != null && v.dependents != null && v.dependents > v.household_members)
      ctx.addIssue({ code: 'custom', path: ['dependents'], message: 'Dependents can’t be more than household members.' });
  });
export type EntrepreneurInput = z.infer<typeof entrepreneurSchema>;

export function readEntrepreneur(fd: FormData) {
  // Unknown values pass through unchanged so the schema's enum check reports them (never silently dropped).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pick = <T extends readonly string[]>(k: string, _opts: T) => (str(fd.get(k)) || null) as T[number] | null;
  return {
    full_name: str(fd.get('full_name')) || null,
    gender: pick('gender', GENDERS),
    age_years: parseNumber(fd.get('age_years')),
    mobile: normaliseMobile(str(fd.get('mobile'))),
    education: pick('education', EDUCATION),
    social_category: pick('social_category', SOCIAL_CATS),
    household_members: parseNumber(fd.get('household_members')),
    earning_members: parseNumber(fd.get('earning_members')),
    dependents: parseNumber(fd.get('dependents')),
    monthly_family_income: parseNumber(fd.get('monthly_family_income')),
    consent: fd.get('consent') === 'on' || fd.get('consent') === 'true',
  };
}

/** Required to move forward (prototype: name; plus consent, which the go-live checklist requires). */
export function entrepreneurNextErrors(v: EntrepreneurInput, alreadyConsented: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.full_name) e.full_name = 'Enter her full name.';
  if (!v.consent && !alreadyConsented) e.consent = 'Her consent is needed before continuing.';
  return e;
}

export const businessSchema = z.object({
  stage: z.enum(['existing', 'new']).nullable(),
  business_name: z.string().max(120).nullable(),
  stated_monthly_turnover: money('Monthly turnover'),
  existing_monthly_emi: money('Existing EMI'),
});
export type BusinessInput = z.infer<typeof businessSchema>;

export function readBusiness(fd: FormData) {
  const stage = str(fd.get('stage'));
  return {
    stage: stage === '' ? null : (stage as 'existing' | 'new'),
    business_name: str(fd.get('business_name')) || null,
    stated_monthly_turnover: parseNumber(fd.get('stated_monthly_turnover')),
    existing_monthly_emi: parseNumber(fd.get('existing_monthly_emi')),
  };
}

/** Zod issues → { field: first message }. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? '_');
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
