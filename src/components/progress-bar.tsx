/** Prototype ProgressBar: one segment per step, filled up to the current one. */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-7 flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={i < step ? 'h-1.5 flex-1 rounded-full bg-primary' : 'h-1.5 flex-1 rounded-full bg-border'} />
      ))}
    </div>
  );
}
