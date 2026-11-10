'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { readNav } from '@/lib/forms';
import { parseExpenses, readRowsJson } from '@/lib/finance-rows';
import { leaveStep, type StepState } from '@/lib/steps';

export async function saveExpenses(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  const supabase = await createClient();
  const { data: biz } = await supabase.from('businesses').select('sector_id').eq('id', businessId).maybeSingle();
  if (!biz) return { message: 'Case not found.' };
  // The heads she may pick come from the database, never from the form.
  const { data: heads } = await supabase
    .from('expense_heads')
    .select('id, name')
    .eq('class', 'operating')
    .or(`sector_id.is.null,sector_id.eq.${biz.sector_id}`);

  const { rows, errors } = parseExpenses(readRowsJson(fd.get('rows')), heads ?? []);
  if (Object.keys(errors).length) return { errors };

  const { error } = await supabase.rpc('save_expenses', { p_business_id: businessId, p_rows: rows });
  if (error) return { message: error.code === 'P0002' ? 'Case not found.' : 'Could not save. Please try again.' };

  return leaveStep(businessId, 'expenses', nav);
}
