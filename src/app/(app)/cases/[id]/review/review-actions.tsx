'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, FileText, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAN_WRITERS, type PlanWriterId } from '@/lib/plan-writers';
import { cn } from '@/lib/utils';

/**
 * Back to growth / Generate. Generate is disabled while anything blocks; the server route re-runs the same
 * check, so it can't be bypassed from the browser.
 */
export function ReviewActions({
  businessId,
  canGenerate,
  latestVersion,
  back,
}: {
  businessId: string;
  canGenerate: boolean;
  latestVersion: number | null;
  back: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writer, setWriter] = useState<PlanWriterId>('free');

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId, writer }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; blocking?: string[] };
      if (!res.ok) {
        setError([data.error ?? 'Could not generate the plan. Please try again.', ...(data.blocking ?? [])].join(' '));
        setPending(false);
        return;
      }
      router.push(`/cases/${businessId}/plan`);
      router.refresh();
    } catch {
      setError('No connection. Check the internet and try again.');
      setPending(false);
    }
  }

  return (
    <div>
      <fieldset className="mb-5" disabled={pending}>
        <legend className="mb-2 text-[15px] font-medium">Plan writer</legend>
        <p className="mb-3 text-xs text-muted-foreground">All numbers are calculated by the app. The writer only words the text.</p>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
          {PLAN_WRITERS.map((w) => {
            const selected = writer === w.id;
            return (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={!w.available}
                disabled={!w.available}
                onClick={() => w.available && setWriter(w.id)}
                className={cn(
                  'relative rounded-lg border bg-card p-3 text-left transition-colors',
                  selected && 'border-primary ring-1 ring-primary',
                  !w.available && 'cursor-not-allowed opacity-60',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{w.label}</span>
                  {w.available ? (
                    selected && <Check className="size-4 text-primary" />
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Coming soon</span>
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{w.blurb}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive">
          {error}
        </p>
      )}
      {pending && (
        <p role="status" className="mb-4 rounded-lg bg-primary-soft p-3.5 text-sm text-primary">
          Writing the business plan… this can take up to a minute. Please keep this screen open.
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
        <form action={back}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="step" value="growth" />
          <Button type="submit" variant="ghost" disabled={pending}>
            <ArrowLeft /> Back
          </Button>
        </form>
        <Button type="button" variant="accent" disabled={!canGenerate || pending} onClick={generate}>
          {pending ? <Loader2 className="animate-spin" /> : canGenerate ? <FileText /> : <Lock />}
          {latestVersion ? 'Generate new version' : 'Generate business plan'}
        </Button>
      </div>
      {!canGenerate && <p className="mt-3 text-right text-xs text-muted-foreground">Fix the items marked “Must fix” to unlock this.</p>}
      {latestVersion && (
        <p className="mt-4 text-center">
          <Link href={`/cases/${businessId}/plan`} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
            View the current plan (version {latestVersion})
          </Link>
        </p>
      )}
    </div>
  );
}
