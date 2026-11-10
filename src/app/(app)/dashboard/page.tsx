import Link from 'next/link';
import { ArrowRight, ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canCreateCases, requireViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DbIcon } from '@/lib/icons';
import { CASE_STATUS_LABEL, WIZARD_STEPS, resumeHref, stepIndex } from '@/lib/wizard';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Cases · DSK Business Plan Assistant' };

/** Cases that already have a generated plan open on the plan screen instead of the wizard. */
const HAS_PLAN = new Set(['ready_for_review', 'approved', 'submitted']);

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-secondary text-secondary-foreground',
  assumptions_pending: 'bg-warning-soft text-warning-foreground',
  ready_for_review: 'bg-[#e8eefb] text-[#1e3a8a]',
  approved: 'bg-primary text-primary-foreground',
  submitted: 'bg-[#16241f] text-white',
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (mins < 60) return rtf.format(-mins, 'minute');
  if (mins < 60 * 24) return rtf.format(-Math.round(mins / 60), 'hour');
  return rtf.format(-Math.round(mins / 1440), 'day');
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ pw?: string }> }) {
  const { pw } = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();
  // RLS scopes this to the operator's centre (reviewers/admins see all).
  const { data: cases, error } = await supabase
    .from('businesses')
    .select('id, status, current_step, updated_at, business_name, sectors(name, icon, tint), entrepreneurs(full_name, dsk_centers(name))')
    .order('updated_at', { ascending: false })
    .limit(200);

  const rows = cases ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
  const showCentre = viewer.role !== 'operator';

  return (
    <div>
      {pw === 'changed' && (
        <p role="status" className="mb-4 rounded-lg bg-primary-soft px-3.5 py-2.5 text-sm text-primary">
          Your password has been changed.
        </p>
      )}
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Cases</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'entrepreneur' : 'entrepreneurs'}
            {viewer.centerName ? ` · ${viewer.centerName}` : ''}
          </p>
        </div>
        {canCreateCases(viewer) && (
          <Button asChild variant="accent">
            <Link href="/cases/new">
              <Plus /> New entrepreneur
            </Link>
          </Button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(CASE_STATUS_LABEL)
            .filter(([k]) => counts[k])
            .map(([k, label]) => (
              <span key={k} className={cn('rounded-full px-3 py-1 text-xs font-medium', STATUS_STYLE[k])}>
                {label} · {counts[k]}
              </span>
            ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-warning-soft p-4 text-sm text-warning-foreground">
          Couldn&apos;t load cases right now. Please refresh.
        </p>
      )}

      {rows.length === 0 && !error ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft">
            <ClipboardList className="size-6 text-primary" />
          </div>
          <p className="mb-1 font-medium">No cases yet</p>
          <p className="text-sm text-muted-foreground">
            {canCreateCases(viewer)
              ? 'Tap “New entrepreneur” to start the first business plan.'
              : 'Cases created by DSK operators will appear here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((c) => {
            const step = stepIndex(c.current_step);
            const name = c.entrepreneurs?.full_name || 'Name not added yet';
            return (
              <li key={c.id}>
                <Link
                  href={HAS_PLAN.has(c.status) ? `/cases/${c.id}/plan` : resumeHref(c.id, c.current_step)}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: (c.sectors?.tint ?? '#1f4b3f') + '14' }}
                  >
                    <DbIcon name={c.sectors?.icon} className="size-5" color={c.sectors?.tint ?? '#1f4b3f'} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate font-medium', !c.entrepreneurs?.full_name && 'text-muted-foreground italic')}>
                      {name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.sectors?.name}
                      {showCentre && c.entrepreneurs?.dsk_centers?.name ? ` · ${c.entrepreneurs.dsk_centers.name}` : ''}
                      {' · '}
                      {c.status === 'draft' ? `Step ${step + 1} of ${WIZARD_STEPS.length}: ${WIZARD_STEPS[step].label}` : timeAgo(c.updated_at)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', STATUS_STYLE[c.status])}>
                      {CASE_STATUS_LABEL[c.status]}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-primary">
                      {c.status === 'draft' ? 'Resume' : 'Open'} <ArrowRight className="size-3" />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
