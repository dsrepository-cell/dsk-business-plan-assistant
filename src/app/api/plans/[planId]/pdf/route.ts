import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PlanContext } from '@/lib/ai/context';
import type { Narrative } from '@/lib/ai/prompts';
import type { buildSnapshot } from '@/lib/engine';
import { renderDpr } from '@/lib/pdf/dpr';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET → the DPR PDF for one plan version (RLS decides who may read it). Rendered from the frozen snapshot and
 * stored narrative, saved to the private `plans` bucket at <business_id>/v<version>.pdf, then downloaded.
 * "DRAFT" watermark on every page until a reviewer approves that version.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  if (!z.string().uuid().safeParse(planId).success) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const { data: plan } = await supabase
    .from('plan_versions')
    .select('id, business_id, version, status, approved_at, created_at, model, narrative, engine_snapshot, pdf_path')
    .eq('id', planId)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

  const snap = plan.engine_snapshot as { engine?: ReturnType<typeof buildSnapshot>; context?: PlanContext } | null;
  if (!snap?.engine || !snap.context) {
    return NextResponse.json({ error: 'This plan version is incomplete. Generate a new version.' }, { status: 422 });
  }
  if (!(snap.engine.products.revenue > 0)) {
    return NextResponse.json({ error: 'The plan has no revenue, so no report can be produced.' }, { status: 422 });
  }

  const pdf = await renderDpr({
    version: plan.version,
    status: plan.status,
    approvedAt: plan.approved_at,
    createdAt: plan.created_at,
    writtenWith: plan.model ?? 'standard-wording',
    engine: snap.engine,
    context: snap.context,
    narrative: plan.narrative as unknown as Narrative,
  });

  // Keep a copy in the private bucket (path checked by the storage policy: first folder = a case she can access).
  const storagePath = `${plan.business_id}/v${plan.version}.pdf`;
  const { error: upErr } = await supabase.storage
    .from('plans')
    .upload(storagePath, pdf, { contentType: 'application/pdf', upsert: true });
  if (!upErr && plan.pdf_path !== storagePath) {
    // Ignored if it fails (e.g. an operator may not modify an approved version); the file itself is stored.
    await supabase.from('plan_versions').update({ pdf_path: storagePath }).eq('id', plan.id);
  }

  const approved = plan.status === 'approved';
  const file = `DPR-v${plan.version}${approved ? '' : '-DRAFT'}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${file}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
