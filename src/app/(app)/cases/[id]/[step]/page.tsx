import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, Construction, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/progress-bar';
import { createClient } from '@/lib/supabase/server';
import { DbIcon } from '@/lib/icons';
import { WIZARD_STEPS, isStepKey, nextStep, prevStep, stepIndex } from '@/lib/wizard';
import { goToStep } from '../../actions';

/** Which build phase delivers each screen. Placeholder until then; navigation + autosave are real. */
const ARRIVES_IN: Record<string, number> = {
  future: 6, marketing: 6, growth: 6, review: 7,
};

export default async function StepPage({ params }: { params: Promise<{ id: string; step: string }> }) {
  const { id, step } = await params;
  if (!isStepKey(step)) notFound();
  if (step === 'sector') redirect(`/cases/${id}/location`); // industry is chosen when the case is created

  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, current_step, sectors(name, icon, tint), entrepreneurs(full_name)')
    .eq('id', id)
    .maybeSingle();
  if (!biz) notFound(); // also what another centre's operator gets (RLS hides the row)

  const i = stepIndex(step);
  const back = prevStep(step);
  const next = nextStep(step);

  return (
    <div>
      <ProgressBar step={i + 1} total={WIZARD_STEPS.length} />
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <DbIcon name={biz.sectors?.icon} className="size-3.5" color={biz.sectors?.tint ?? undefined} />
        {biz.sectors?.name} · {biz.entrepreneurs?.full_name || 'Name not added yet'}
      </div>
      <h2 className="mb-5 text-xl font-semibold">{WIZARD_STEPS[i].label}</h2>

      <div className="mb-6 flex gap-3 rounded-lg bg-primary-soft p-4 text-sm text-primary">
        <Construction className="mt-0.5 size-4 shrink-0" />
        <span>
          This screen arrives in Phase {ARRIVES_IN[step]}. Moving between steps already saves where you are, so the case
          resumes here from the dashboard.
        </span>
      </div>

      <div className="flex items-center justify-between">
        {back && back !== 'sector' ? (
          <form action={goToStep}>
            <input type="hidden" name="businessId" value={biz.id} />
            <input type="hidden" name="step" value={back} />
            <Button type="submit" variant="ghost">
              <ArrowLeft /> Back
            </Button>
          </form>
        ) : (
          <Button asChild variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft /> Cases
            </Link>
          </Button>
        )}
        {next && (
          <form action={goToStep}>
            <input type="hidden" name="businessId" value={biz.id} />
            <input type="hidden" name="step" value={next} />
            <Button type="submit">
              Continue <ArrowRight />
            </Button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="link">
          <Link href="/dashboard">
            <Save /> Save draft &amp; back to cases
          </Link>
        </Button>
      </div>
    </div>
  );
}
