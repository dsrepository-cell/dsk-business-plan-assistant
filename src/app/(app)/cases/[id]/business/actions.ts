'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { businessSchema, fieldErrors, readBusiness, readNav } from '@/lib/forms';
import { leaveStep, type StepState } from '@/lib/steps';

export async function saveBusiness(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  const parsed = businessSchema.safeParse(readBusiness(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;
  if (nav === 'next' && !v.stage) return { errors: { stage: 'Choose existing business or new idea.' } };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from('businesses')
    .update(
      {
        stage: v.stage,
        business_name: v.business_name,
        // Stated turnover is a fact about an existing business; it is the cross-check against product totals.
        stated_monthly_turnover: v.stage === 'existing' ? v.stated_monthly_turnover : null,
      },
      { count: 'exact' },
    )
    .eq('id', businessId);
  if (error || !count) return { message: error ? 'Could not save. Please try again.' : 'Case not found.' };

  // Existing EMI lives in ONE place (loan_requests) because it feeds repayment capacity (DSCR).
  const { error: loanErr } = await supabase
    .from('loan_requests')
    .upsert({ business_id: businessId, existing_monthly_emi: v.existing_monthly_emi ?? 0 }, { onConflict: 'business_id' });
  if (loanErr) return { message: 'Could not save the EMI. Please try again.' };

  return leaveStep(businessId, 'business', nav);
}
