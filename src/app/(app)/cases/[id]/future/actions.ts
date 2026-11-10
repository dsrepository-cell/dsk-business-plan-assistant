'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { readNav } from '@/lib/forms';
import { parseFuturePlan } from '@/lib/plans';
import { leaveStep, type StepState } from '@/lib/steps';

export async function saveFuturePlan(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  const { value, errors } = parseFuturePlan(fd);
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from('future_plans')
    .upsert({ business_id: businessId, ...value }, { onConflict: 'business_id', count: 'exact' });
  if (error || !count) return { message: error ? 'Could not save. Please try again.' : 'Case not found.' };

  return leaveStep(businessId, 'future', nav);
}
