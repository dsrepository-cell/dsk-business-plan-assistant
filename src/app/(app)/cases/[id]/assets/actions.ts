'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseNumber } from '@/lib/numbers';
import { readNav } from '@/lib/forms';
import { parseAssets, readRowsJson } from '@/lib/finance-rows';
import { leaveStep, type StepState } from '@/lib/steps';

const money = (label: string) =>
  z.number({ error: `${label}: enter an amount.` }).min(0, `${label} can't be negative.`).max(1_000_000_000, `${label} looks too large.`).nullable();
const extras = z.object({ other_setup_cost: money('Setup cost'), own_contribution: money('Own contribution') });

export async function saveAssets(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  const { rows, errors } = parseAssets(readRowsJson(fd.get('rows')));
  const parsed = extras.safeParse({
    other_setup_cost: parseNumber(fd.get('other_setup_cost')),
    own_contribution: parseNumber(fd.get('own_contribution')),
  });
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  if (Object.keys(errors).length || !parsed.success) return { errors };

  const supabase = await createClient();
  const { error } = await supabase.rpc('save_assets', {
    p_business_id: businessId,
    p_rows: rows,
    p_other_setup_cost: parsed.data.other_setup_cost ?? 0,
    p_own_contribution: parsed.data.own_contribution ?? 0,
  });
  if (error) return { message: error.code === 'P0002' ? 'Case not found.' : 'Could not save. Please try again.' };

  return leaveStep(businessId, 'assets', nav);
}
