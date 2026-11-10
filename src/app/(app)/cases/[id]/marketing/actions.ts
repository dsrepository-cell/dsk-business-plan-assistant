'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { readNav } from '@/lib/forms';
import { parseMarketing } from '@/lib/plans';
import { leaveStep, type StepState } from '@/lib/steps';

export async function saveMarketing(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  const { value, errors } = parseMarketing(fd);
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from('marketing_plans')
    .upsert({ business_id: businessId, ...value }, { onConflict: 'business_id', count: 'exact' });
  if (error || !count) return { message: error ? 'Could not save. Please try again.' : 'Case not found.' };

  return leaveStep(businessId, 'marketing', nav);
}
