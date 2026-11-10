'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { readNav } from '@/lib/forms';
import { parseProducts, readRowsJson } from '@/lib/finance-rows';
import { leaveStep, type StepState } from '@/lib/steps';

export async function saveProducts(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  // Prototype: Continue needs at least one product with quantity and price. Back / Save draft never block.
  const { rows, errors } = parseProducts(readRowsJson(fd.get('rows')), nav === 'next');
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { error } = await supabase.rpc('save_products', { p_business_id: businessId, p_rows: rows });
  if (error) return { message: error.code === 'P0002' ? 'Case not found.' : 'Could not save. Please try again.' };

  return leaveStep(businessId, 'products', nav);
}
