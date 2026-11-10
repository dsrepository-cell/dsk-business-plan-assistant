'use client';

import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import type { Flag } from '@/lib/engine';
import { useStep } from '@/components/step-form';
import { cn } from '@/lib/utils';

/** Prototype MiniField: small label above a compact input. */
export function MiniField({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export const miniInputClass =
  'h-11 w-full rounded-lg border bg-card px-3 text-[16px] outline-none focus:border-primary aria-[invalid=true]:border-destructive';

/** Text/number input wired to the step's error map by `errorKey`. */
export function MiniInput({
  errorKey,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { errorKey: string }) {
  const { errors } = useStep();
  return <input {...props} aria-invalid={Boolean(errors[errorKey])} className={cn(miniInputClass, className)} />;
}

/** Prototype SectionCard + KV rows. Every value shown here comes from the engine. */
export function SummaryCard({ rows, className }: { rows: [string, React.ReactNode][]; className?: string }) {
  return (
    <div className={cn('mb-4 rounded-lg bg-primary-soft p-4', className)}>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-sm text-primary">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className="text-right font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Engine flags as the prototype's warning boxes. Errors and warnings are shown; nothing here blocks saving. */
export function FlagNotes({ flags }: { flags: Flag[] }) {
  if (!flags.length) return null;
  return (
    <ul className="mb-4 space-y-2">
      {flags.map((f, i) => {
        const Icon = f.severity === 'error' ? OctagonAlert : f.severity === 'warning' ? AlertTriangle : Info;
        return (
          <li
            key={`${f.code}-${i}`}
            className={cn(
              'flex gap-3 rounded-lg p-3.5 text-sm',
              f.severity === 'error' && 'bg-destructive/10 text-destructive',
              f.severity === 'warning' && 'bg-warning-soft text-warning-foreground',
              f.severity === 'info' && 'bg-primary-soft text-primary',
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span>{f.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Small "+ Add …" text button. */
export function AddRowButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-50"
    >
      {children}
    </button>
  );
}

let seq = 0;
/** Client-only key for a new, unsaved row. */
export const newKey = () => `new-${Date.now().toString(36)}-${(seq++).toString(36)}`;
