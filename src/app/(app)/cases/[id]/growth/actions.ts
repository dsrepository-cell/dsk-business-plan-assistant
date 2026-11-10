'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { readNav } from '@/lib/forms';
import { YEARS, currentSuggestion, parseGrowthInput, toGoals } from '@/lib/plans';
import { leaveStep, type StepState } from '@/lib/steps';

export async function saveGrowth(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));
  const approve = fd.get('approve') === 'on';

  // Prototype: Continue stays disabled until the operator approves. Back / Save draft are always allowed.
  if (nav === 'next' && !approve) return { errors: { approve: 'Review the figures and tick the box to approve them before continuing.' } };
  const { values, errors } = parseGrowthInput(fd);
  if (approve && !values) return { errors };

  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, stage, status, future_plans(goals)')
    .eq('id', businessId)
    .maybeSingle();
  if (!biz) return { message: 'Case not found.' };

  // The suggestion is recomputed here from stored answers (never taken from the form).
  const sug = currentSuggestion(biz.stage, toGoals(biz.future_plans?.goals));
  const key = { 1: 'y1', 2: 'y2', 3: 'y3' } as const;
  const { error } = await supabase.from('growth_assumptions').upsert(
    YEARS.map((y) => ({
      business_id: businessId,
      year: y,
      suggested_pct: sug[key[y]],
      suggested_reasons: sug.reasons,
      // Who approved and when is stamped by the database from the signed-in user.
      approved_pct: approve && values ? values[key[y]] : null,
    })),
    { onConflict: 'business_id,year' },
  );
  if (error) return { message: 'Could not save. Please try again.' };

  // Case status follows the approval: pending until approved; un-approving sends it back to pending.
  if (approve && biz.status === 'assumptions_pending') {
    await supabase.from('businesses').update({ status: 'draft' }).eq('id', businessId);
  } else if (!approve && (biz.status === 'draft' || biz.status === 'ready_for_review')) {
    await supabase.from('businesses').update({ status: 'assumptions_pending' }).eq('id', businessId);
  }

  return leaveStep(businessId, 'growth', nav);
}
