import { ProgressBar } from '@/components/progress-bar';
import { DbIcon } from '@/lib/icons';
import { WIZARD_STEPS, stepIndex, type StepKey } from '@/lib/wizard';

export function StepHeader({
  step,
  title,
  subtitle,
  sector,
  name,
}: {
  step: StepKey;
  title: string;
  subtitle?: string;
  sector: { name: string; icon: string; tint: string | null } | null;
  name: string | null;
}) {
  return (
    <>
      <ProgressBar step={stepIndex(step) + 1} total={WIZARD_STEPS.length} />
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <DbIcon name={sector?.icon} className="size-3.5" color={sector?.tint ?? undefined} />
        {sector?.name} · {name || 'Name not added yet'}
      </div>
      <h2 className={subtitle ? 'mb-1 text-xl font-semibold' : 'mb-5 text-xl font-semibold'}>{title}</h2>
      {subtitle && <p className="mb-5 text-sm text-muted-foreground">{subtitle}</p>}
    </>
  );
}
