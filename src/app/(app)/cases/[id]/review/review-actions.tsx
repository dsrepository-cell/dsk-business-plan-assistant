'use client';

import { useActionState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GenerateState } from './actions';

/** Back to growth / Generate. Generate is disabled while anything blocks; the server checks again anyway. */
export function ReviewActions({
  businessId,
  canGenerate,
  back,
  generate,
}: {
  businessId: string;
  canGenerate: boolean;
  back: (fd: FormData) => Promise<void>;
  generate: (prev: GenerateState) => Promise<GenerateState>;
}) {
  const [state, run, pending] = useActionState(generate, {});
  return (
    <div>
      {state.message && (
        <p
          role="status"
          className={
            state.ok
              ? 'mb-4 flex gap-2 rounded-lg bg-primary-soft p-3.5 text-sm text-primary'
              : 'mb-4 rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive'
          }
        >
          {state.ok && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          {state.message}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
        <form action={back}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="step" value="growth" />
          <Button type="submit" variant="ghost">
            <ArrowLeft /> Back
          </Button>
        </form>
        <form action={run}>
          <Button type="submit" variant="accent" disabled={!canGenerate || pending}>
            {pending ? <Loader2 className="animate-spin" /> : canGenerate ? <FileText /> : <Lock />}
            Generate business plan
          </Button>
        </form>
      </div>
      {!canGenerate && (
        <p className="mt-3 text-right text-xs text-muted-foreground">Fix the items marked “Must fix” to unlock this.</p>
      )}
    </div>
  );
}
