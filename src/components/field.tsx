import type { LucideIcon } from 'lucide-react';

/** Prototype Field: icon in a soft circle, label + optional hint, control indented under the label. */
export function Field({
  icon: Icon,
  label,
  hint,
  htmlFor,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <Icon className="size-[18px] text-primary" />
        </div>
        <div className="pt-1.5">
          <label htmlFor={htmlFor} className="block text-[15px] font-medium">
            {label}
          </label>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
      <div className="ml-12">{children}</div>
    </div>
  );
}

export const inputClass =
  'h-12 w-full rounded-lg border bg-card px-3.5 text-[16px] outline-none focus:border-primary disabled:bg-[#F5F6F0] disabled:text-muted-foreground';
