import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { nextStep, prevStep, type StepKey } from '@/lib/wizard';
import type { Nav } from '@/lib/forms';

export type { StepState } from '@/components/step-form';

/** After a step saved: remember where to resume, then go there (next / back / dashboard). */
export async function leaveStep(businessId: string, step: StepKey, nav: Nav): Promise<never> {
  const dest = nav === 'next' ? nextStep(step) : nav === 'back' ? prevStep(step) : step;
  const resumeAt = dest && dest !== 'sector' ? dest : step;
  const supabase = await createClient();
  await supabase.from('businesses').update({ current_step: nav === 'exit' ? step : resumeAt }).eq('id', businessId);
  revalidatePath('/dashboard');
  if (nav === 'exit' || !dest) redirect('/dashboard');
  redirect(`/cases/${businessId}/${dest === 'sector' ? 'location' : dest}`);
}

/** The header strip every step shows: industry icon + name, entrepreneur name. RLS-scoped. */
export async function loadCaseHeader(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('businesses')
    .select('id, stage, sector_id, entrepreneur_id, sectors(name, icon, tint), entrepreneurs(full_name)')
    .eq('id', id)
    .maybeSingle();
  return data;
}
