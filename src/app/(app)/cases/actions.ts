'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isStepKey } from '@/lib/wizard';

export type ActionState = { error?: string };

/** "New entrepreneur" → choose industry → one atomic DB call creates the draft case. */
export async function createCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const sectorId = z.string().min(1).safeParse(formData.get('sectorId'));
  if (!sectorId.success) return { error: 'Choose the industry first.' };

  const supabase = await createClient();
  const { data: businessId, error } = await supabase.rpc('create_case', { p_sector_id: sectorId.data });
  if (error || !businessId) return { error: error?.message ?? 'Could not create the case. Please try again.' };

  revalidatePath('/dashboard');
  redirect(`/cases/${businessId}/location`);
}

/**
 * Save-draft: remember which step to resume at. Called on every step change (autosave).
 * RLS guarantees the operator can only touch cases from her own centre.
 */
export async function saveStep(businessId: string, step: string) {
  if (!z.string().uuid().safeParse(businessId).success || !isStepKey(step)) return { error: 'Invalid step.' };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from('businesses')
    .update({ current_step: step }, { count: 'exact' })
    .eq('id', businessId);
  if (error) return { error: error.message };
  if (!count) return { error: 'Case not found.' };
  revalidatePath('/dashboard');
  return {};
}

export async function goToStep(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const step = String(formData.get('step') ?? '');
  const res = await saveStep(businessId, step);
  if (res.error) throw new Error(res.error);
  redirect(`/cases/${businessId}/${step}`);
}
