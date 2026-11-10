'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId }),
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
