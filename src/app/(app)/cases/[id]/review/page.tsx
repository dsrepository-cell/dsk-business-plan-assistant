import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ChevronRight, Info, OctagonAlert } from 'lucide-react';
import { SummaryCard } from '@/components/money';
import { StepHeader } from '@/components/step-header';
import { loadReadiness } from '@/lib/case-readiness';
import type { Issue } from '@/lib/readiness';
import { cn, formatINR } from '@/lib/utils';
import { WIZARD_STEPS } from '@/lib/wizard';
import { goToStep } from '../../actions';
import { createClient } from '@/lib/supabase/server';
import { ReviewActions } from './review-actions';

export const metadata = { title: 'Review · DSK Business Plan Assistant' };

const STEP_LABEL = Object.fromEntries(WIZARD_STEPS.map((s) => [s.key, s.label]));

function IssueList({ id, title, issues, tone }: { id: string; title: string; issues: Issue[]; tone: 'error' | 'warning' }) {
  if (!issues.length) return null;
  return (
    <section className={cn('mb-4 rounded-lg p-4', tone === 'error' ? 'bg-destructive/10' : 'bg-warning-soft')}>
      <h3 className={cn('mb-2 flex items-center gap-2 text-sm font-semibold', tone === 'error' ? 'text-destructive' : 'text-warning-foreground')}>
        {tone === 'error' ? <OctagonAlert className="size-4" /> : <AlertTriangle className="size-4" />}
        {title} ({issues.length})
      </h3>
      <ul className="space-y-1">
        {issues.map((i, n) => (
          <li key={`${i.code}-${n}`}>
            {i.step === 'review' ? (
              <span className="flex gap-2 py-1.5 text-sm">
                {i.severity === 'info' && <Info className="mt-0.5 size-4 shrink-0" />}
                {i.message}
              </span>
            ) : (
              <Link
                href={`/cases/${id}/${i.step}`}
                className={cn(
                  'flex min-h-11 items-center justify-between gap-3 rounded-md py-1.5 text-sm',
                  tone === 'error' ? 'text-destructive' : 'text-warning-foreground',
                )}
              >
                <span className="flex gap-2">
                  {i.severity === 'info' && <Info className="mt-0.5 size-4 shrink-0" />}
                  {i.message}
                </span>
                <span className="flex shrink-0 items-center text-xs font-medium underline-offset-2 hover:underline">
                  {STEP_LABEL[i.step]} <ChevronRight className="size-3.5" />
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Prototype step 13: "Review before generating" — engine summary + every issue, linked to where it is fixed. */
export default async function ReviewStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await loadReadiness(id);
  if (!r) notFound();
  const supabase = await createClient();
  const { data: latest } = await supabase
    .from('plan_versions')
    .select('version')
    .eq('business_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { finance: f, readiness } = r;
  const s = readiness.snapshot;
  const approved = r.growth.isApproved;
  const dscr = s.projection[0]?.dscr ?? null;
  const errors = readiness.issues.filter((i) => i.severity === 'error');
  const others = readiness.issues.filter((i) => i.severity !== 'error');

  return (
    <div>
      <StepHeader step="review" title="Review before generating" sector={f.biz.sectors} name={f.biz.entrepreneurs?.full_name ?? null} />

      <div className="mb-4 rounded-xl border p-5">
        <div className="mb-3 font-semibold">
          {f.biz.entrepreneurs?.full_name || 'Entrepreneur'} · {f.biz.sectors?.name}
        </div>
        <SummaryCard
          className="mb-0 bg-transparent p-0"
          rows={[
            ['Monthly revenue', formatINR(s.products.revenue)],
            ['Monthly expenses', formatINR(s.expenses.monthly)],
            ['Monthly operating profit', formatINR(s.monthlyOperatingProfit)],
            ['Total project cost', formatINR(readiness.projectCost.totalProjectCost)],
            ['Loan required', formatINR(s.loan.required)],
            ['EMI', formatINR(s.loan.emi)],
            ['Indicative DSCR (Year 1)', dscr === null ? '—' : `${dscr.toFixed(2)}×`],
            ['Year 3 revenue (approved growth)', approved ? formatINR(s.projection[2].revenue) : 'Not approved yet'],
          ]}
        />
      </div>

      {readiness.canGenerate && !others.length && (
        <p className="mb-4 rounded-lg bg-primary-soft p-3.5 text-sm text-primary">All checks passed — nothing to review.</p>
      )}
      <IssueList id={id} title="Must fix before generating" issues={errors} tone="error" />
      <IssueList id={id} title="Worth reviewing" issues={others} tone="warning" />

      <p className="mb-6 text-xs text-muted-foreground">
        All figures are calculated by the system from what was entered — nothing is estimated by AI; the plan text may only quote them. Known limits: the
        DSCR is indicative; location is based on post-office data; growth figures are rule-based suggestions that the
        DSK operator has reviewed.
      </p>

      <ReviewActions
        businessId={id}
        canGenerate={readiness.canGenerate}
        latestVersion={latest?.version ?? null}
        back={goToStep}
      />
    </div>
  );
}
