'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { numberGuard } from '@/lib/ai/prompts';
import { requireViewer } from '@/lib/auth';
import { formToNarrative } from '@/lib/plan-edit';
import { createClient } from '@/lib/supabase/server';

export type PlanActionState = { ok?: boolean; message?: string };
const uuid = z.string().uuid();

/** Save edited text. Numbers are checked against the frozen data again; anything unverified is flagged. */
export async function savePlanText(planId: string, _prev: PlanActionState, fd: FormData): Promise<PlanActionState> {
  if (!uuid.safeParse(planId).success) return { message: 'Plan not found.' };
  const { narrative, error } = formToNarrative((k) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v : undefined;
  });
  if (!narrative) return { message: error ?? 'Please check the text.' };

  const supabase = await createClient();
  const { data: plan } = await supabase.from('plan_versions').select('id, business_id, status, engine_snapshot').eq('id', planId).maybeSingle();
  if (!plan) return { message: 'Plan not found.' };
  if (plan.status === 'approved') return { message: 'This plan is approved. Generate a new version to make changes.' };
  if (plan.status === 'superseded') return { message: 'A newer version exists. Edit the latest version instead.' };

  const snap = plan.engine_snapshot as { context?: unknown } | null;
  const bad = numberGuard(narrative, snap?.context ?? {});
  const { error: upErr } = await supabase
    .from('plan_versions')
    .update({
      narrative,
      status: 'edited',
      narrative_warnings: bad.map((w) => `Number "${w}" in the text is not in the verified data. Please check it.`),
    })
    .eq('id', planId);
  if (upErr) return { message: 'Could not save. Please try again.' };

  revalidatePath(`/cases/${plan.business_id}/plan`);
  return { ok: true, message: bad.length ? `Saved. ${bad.length} number(s) need checking — see the warnings.` : 'Saved.' };
}

/** Reviewer / admin approval. The database also refuses this for anyone else and stamps who approved and when. */
export async function approvePlan(planId: string): Promise<PlanActionState> {
  if (!uuid.safeParse(planId).success) return { message: 'Plan not found.' };
  const viewer = await requireViewer();
  if (viewer.role !== 'reviewer' && viewer.role !== 'admin') return { message: 'Only a reviewer can approve a plan.' };

  const supabase = await createClient();
  const { data: plan } = await supabase.from('plan_versions').select('id, business_id, status, narrative_warnings').eq('id', planId).maybeSingle();
  if (!plan) return { message: 'Plan not found.' };
  if (plan.status === 'superseded') return { message: 'A newer version exists. Review the latest version.' };

  const { error } = await supabase.from('plan_versions').update({ status: 'approved' }).eq('id', planId);
  if (error) return { message: 'Could not approve. Please try again.' };
  await supabase
    .from('plan_versions')
    .update({ status: 'superseded' })
    .eq('business_id', plan.business_id)
    .neq('id', planId)
    .eq('status', 'approved');
  await supabase.from('businesses').update({ status: 'approved' }).eq('id', plan.business_id);

  revalidatePath(`/cases/${plan.business_id}/plan`);
  revalidatePath('/dashboard');
  return { ok: true, message: 'Plan approved.' };
}
