import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiEnabled, writeNarrative } from '@/lib/ai/write-narrative';
import { loadReadiness } from '@/lib/case-readiness';
import { PLAN_WRITER_IDS, planWriter } from '@/lib/plan-writers';
import { loadPlanContext } from '@/lib/plan-data';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 120;

/** Max AI-written plans per user per 24 h (sign-up is open; this caps any surprise bill). Standard wording is free. */
const DAILY_AI_LIMIT = Math.max(1, Number(process.env.PLAN_DAILY_AI_LIMIT) || 10);

/**
 * POST { businessId } → a new frozen plan version.
 * auth → readiness gate (re-run here, server-side) → frozen context → narrative (AI or standard wording)
 * → numberGuard → insert plan_versions (RLS + DB trigger also require approved growth) → supersede older drafts.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = z
    .object({ businessId: z.string().uuid(), writer: z.enum(PLAN_WRITER_IDS).default('free') })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Case not found.' }, { status: 400 });
  const businessId = body.data.businessId;
  const writer = planWriter(body.data.writer);
  if (!writer.available) {
    return NextResponse.json({ error: `${writer.label} is coming soon. Please use ${planWriter('free').label} for now.` }, { status: 400 });
  }
  const useAi = writer.id !== 'free';

  const r = await loadReadiness(businessId);
  if (!r) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  if (!r.readiness.canGenerate) {
    return NextResponse.json(
      { error: 'Some items must be fixed first.', blocking: r.readiness.blocking.map((b) => b.message) },
      { status: 422 },
    );
  }

  if (useAi && aiEnabled()) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from('plan_versions')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .gte('created_at', since)
      .neq('model', 'standard-wording');
    if ((count ?? 0) >= DAILY_AI_LIMIT) {
      return NextResponse.json({ error: `Daily limit of ${DAILY_AI_LIMIT} AI-written plans reached. Please try again tomorrow.` }, { status: 429 });
    }
  }

  const context = await loadPlanContext(businessId, r);
  const written = await writeNarrative(context, { allowAi: useAi });

  const { data: last } = await supabase
    .from('plan_versions')
    .select('version')
    .eq('business_id', businessId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;

  const { data: row, error } = await supabase
    .from('plan_versions')
    .insert({
      business_id: businessId,
      version,
      status: 'generated',
      engine_snapshot: JSON.parse(JSON.stringify({ engine: r.readiness.snapshot, context, usage: written.usage ?? null })),
      narrative: written.narrative,
      narrative_warnings: written.warnings,
      model: written.model,
      prompt_version: written.promptVersion,
    })
    .select('id, version')
    .single();
  if (error || !row) {
    return NextResponse.json({ error: 'Could not save the plan. Please try again.' }, { status: 500 });
  }

  // Earlier drafts are superseded (an approved version stays approved); the case now waits for a reviewer.
  await supabase
    .from('plan_versions')
    .update({ status: 'superseded' })
    .eq('business_id', businessId)
    .neq('id', row.id)
    .in('status', ['generated', 'edited']);
  await supabase.from('businesses').update({ status: 'ready_for_review' }).eq('id', businessId);

  return NextResponse.json({ planId: row.id, version: row.version, model: written.model, warnings: written.warnings.length });
}
