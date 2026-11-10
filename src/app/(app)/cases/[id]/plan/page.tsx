import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, FileDown, RefreshCw, Sparkles } from 'lucide-react';
import { SummaryCard } from '@/components/money';
import { Button } from '@/components/ui/button';
import type { Narrative } from '@/lib/ai/prompts';
import { requireViewer } from '@/lib/auth';
import type { buildSnapshot } from '@/lib/engine';
import { GROWTH_PARTS, SWOT_PARTS, TEXT_SECTIONS, narrativeToForm } from '@/lib/plan-edit';
import { createClient } from '@/lib/supabase/server';
import { cn, formatINR } from '@/lib/utils';
import { approvePlan, savePlanText } from './actions';
import { PlanControls } from './plan-controls';

export const metadata = { title: 'Business plan · DSK Business Plan Assistant' };

const STATUS: Record<string, [string, string]> = {
  generated: ['Draft — waiting for review', 'bg-warning-soft text-warning-foreground'],
  edited: ['Edited — waiting for review', 'bg-warning-soft text-warning-foreground'],
  approved: ['Approved', 'bg-primary text-primary-foreground'],
  superseded: ['Older version', 'bg-muted text-muted-foreground'],
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-1.5 font-display text-base font-semibold">{title}</h3>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: biz }, { data: plan }] = await Promise.all([
    supabase.from('businesses').select('id, sectors(name), entrepreneurs(full_name)').eq('id', id).maybeSingle(),
    supabase
      .from('plan_versions')
      .select('id, version, status, narrative, narrative_warnings, model, created_at, approved_at, engine_snapshot')
      .eq('business_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!biz) notFound();

  const name = biz.entrepreneurs?.full_name || 'Entrepreneur';
  if (!plan) {
    return (
      <div className="py-10 text-center">
        <p className="mb-4 text-sm text-muted-foreground">No plan has been generated for this case yet.</p>
        <Button asChild>
          <Link href={`/cases/${id}/review`}>Go to review</Link>
        </Button>
      </div>
    );
  }

  const n = plan.narrative as unknown as Narrative;
  const engine = (plan.engine_snapshot as { engine?: ReturnType<typeof buildSnapshot> } | null)?.engine;
  const warnings = Array.isArray(plan.narrative_warnings) ? plan.narrative_warnings.map(String) : [];
  const isReviewer = viewer.role === 'reviewer' || viewer.role === 'admin';
  const [statusLabel, statusClass] = STATUS[plan.status] ?? [plan.status, 'bg-muted'];
  const byAi = plan.model !== 'standard-wording';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const fields = [
    ...TEXT_SECTIONS.map(([key, label]) => ({ key, label, rows: key === 'conclusion' || key === 'executiveSummary' ? 5 : 4 })),
    ...SWOT_PARTS.map(([k, label]) => ({ key: `swot.${k}`, label: `SWOT – ${label}`, hint: 'One per line', rows: 4 })),
    ...GROWTH_PARTS.map(([k, label]) => ({ key: `growth.${k}`, label: `Growth plan – ${label}`, rows: 2 })),
    { key: 'risks', label: 'Risks and mitigation', hint: 'risk | mitigation — one per line', rows: 5 },
    { key: 'timeline', label: 'Implementation timeline', hint: 'period | activity — one per line', rows: 5 },
  ];

  return (
    <div>
      <Link href={`/cases/${id}/review`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Review
      </Link>
      <div className="mb-1 text-xs text-muted-foreground">
        {biz.sectors?.name} · Version {plan.version} · {fmtDate(plan.created_at)}
      </div>
      <h2 className="mb-2 text-xl font-semibold">Business plan — {name}</h2>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <span className={cn('rounded-full px-2.5 py-1 font-medium', statusClass)}>{statusLabel}</span>
        <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
          {byAi ? <Sparkles className="size-3" /> : null}
          {byAi ? `Text written with AI (${plan.model})` : 'Standard wording (no AI)'}
        </span>
        {plan.approved_at && <span className="text-muted-foreground">Approved {fmtDate(plan.approved_at)}</span>}
      </div>

      {warnings.length > 0 && (
        <div className="mb-5 rounded-lg bg-warning-soft p-4 text-sm text-warning-foreground">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" /> Please check before approving
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {engine && (
        <SummaryCard
          rows={[
            ['Monthly revenue', formatINR(engine.products.revenue)],
            ['Monthly operating profit', formatINR(engine.monthlyOperatingProfit)],
            ['Loan required', formatINR(engine.loan.required)],
            ['EMI', formatINR(engine.loan.emi)],
            ['Indicative DSCR (Year 1)', engine.projection[0]?.dscr == null ? '—' : `${engine.projection[0].dscr.toFixed(2)}×`],
          ]}
        />
      )}

      <PlanControls
        form={narrativeToForm(n)}
        fields={fields}
        canEdit={plan.status === 'generated' || plan.status === 'edited'}
        canApprove={isReviewer && plan.status !== 'approved'}
        save={savePlanText.bind(null, plan.id)}
        approve={approvePlan.bind(null, plan.id)}
      />

      <article className="rounded-xl border p-5">
        {TEXT_SECTIONS.filter(([k]) => k !== 'conclusion').map(([k, label]) => (
          <Section key={k} title={label}>
            <p>{n[k]}</p>
          </Section>
        ))}
        <Section title="SWOT">
          <div className="grid gap-3 sm:grid-cols-2">
            {SWOT_PARTS.map(([k, label]) => (
              <div key={k}>
                <div className="mb-1 text-sm font-medium">{label}</div>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {n.swot[k].map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Future growth plan">
          <dl className="space-y-1.5 text-sm">
            {GROWTH_PARTS.map(([k, label]) => (
              <div key={k}>
                <dt className="font-medium">{label}</dt>
                <dd>{n.futureGrowthPlan[k] || '—'}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Risks and mitigation">
          <ul className="space-y-1.5 text-sm">
            {n.risksAndMitigation.map((r) => (
              <li key={r.risk}>
                <span className="font-medium">{r.risk}</span> — {r.mitigation}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Implementation timeline">
          <ul className="space-y-1 text-sm">
            {n.implementationTimeline.map((t, i) => (
              <li key={`${t.period}-${i}`}>
                <span className="font-medium">{t.period}:</span> {t.activity}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Conclusion">
          <p>{n.conclusion}</p>
        </Section>
      </article>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href={`/cases/${id}/review`}>
            <RefreshCw /> Change data &amp; regenerate
          </Link>
        </Button>
        <Button variant="outline" disabled title="The downloadable DPR (PDF) arrives in Phase 9">
          <FileDown /> Download PDF (coming next)
        </Button>
      </div>
    </div>
  );
}
