'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { fieldErrors, readNav } from '@/lib/forms';
import { parseNumber } from '@/lib/numbers';
import { leaveStep, type StepState } from '@/lib/steps';

const loanSchema = z
  .object({
    tenure_months: z.number({ error: 'Tenure: enter the number of months.' }).int('Tenure: whole months.').min(1, 'Tenure must be at least 1 month.').max(240, 'Tenure looks too long (max 240 months).'),
    interest_rate_pct: z.number({ error: 'Interest rate: enter a number.' }).min(0, "Interest rate can't be negative.").max(50, 'Interest rate looks wrong.'),
    moratorium_months: z.number({ error: 'Moratorium: enter months (0 if none).' }).int('Moratorium: whole months.').min(0, "Moratorium can't be negative."),
    requested_amount: z.number({ error: 'Requested amount: enter an amount.' }).min(0, "Requested amount can't be negative.").max(1_000_000_000, 'Requested amount looks too large.').nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.moratorium_months >= v.tenure_months)
      ctx.addIssue({ code: 'custom', path: ['moratorium_months'], message: 'Moratorium must be shorter than the tenure.' });
  });

export async function saveLoan(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  const parsed = loanSchema.safeParse({
    tenure_months: parseNumber(fd.get('tenure_months')) ?? undefined,
    interest_rate_pct: parseNumber(fd.get('interest_rate_pct')) ?? undefined,
    moratorium_months: parseNumber(fd.get('moratorium_months')) ?? 0,
    requested_amount: parseNumber(fd.get('requested_amount')),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from('loan_requests')
    .upsert({ business_id: businessId, ...parsed.data }, { onConflict: 'business_id', count: 'exact' });
  if (error || !count) return { message: error ? 'Could not save. Please try again.' : 'Case not found.' };

  return leaveStep(businessId, 'loan', nav);
}
