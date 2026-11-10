'use client';

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type StepState = { errors?: Record<string, string>; message?: string };
type Ctx = { errors: Record<string, string>; pending: boolean };
const StepCtx = createContext<Ctx>({ errors: {}, pending: false });
export const useStep = () => useContext(StepCtx);

/**
 * Wraps a wizard step. Submits through a server action WITHOUT React's automatic form reset, so a validation
 * error never wipes what she typed. The pressed button's name/value (nav=next|back|exit) is sent along.
 */
export function StepForm({
  action,
  children,
}: {
  action: (prev: StepState, fd: FormData) => Promise<StepState>;
  children: React.ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.errors && Object.keys(state.errors).length) {
      ref.current?.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [state]);

  return (
    <form
      ref={ref}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (sub?.name) fd.set(sub.name, sub.value);
        startTransition(() => dispatch(fd));
      }}
    >
      <StepCtx.Provider value={{ errors: state.errors ?? {}, pending }}>
        {state.message && (
          <p role="alert" className="mb-4 rounded-lg bg-warning-soft p-3.5 text-sm text-warning-foreground">
            {state.message}
          </p>
        )}
        {children}
      </StepCtx.Provider>
    </form>
  );
}

export function ErrorFor({ name }: { name: string }) {
  const { errors } = useStep();
  return errors[name] ? (
    <p role="alert" data-error="true" className="mt-1.5 text-xs text-destructive">
      {errors[name]}
    </p>
  ) : null;
}

/** Back / Continue / Save draft. All three submit, so every move saves. */
export function StepNav({ nextLabel = 'Continue', canGoBack = true }: { nextLabel?: string; canGoBack?: boolean }) {
  const { pending } = useStep();
  const legacy = useFormStatus(); // harmless outside an action-form; kept for screen readers' busy state
  const busy = pending || legacy.pending;
  return (
    <div aria-busy={busy}>
      <div className="mt-2 flex items-center justify-between">
        {canGoBack ? (
          <Button type="submit" name="nav" value="back" variant="ghost" disabled={busy}>
            <ArrowLeft /> Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" name="nav" value="next" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          {nextLabel} {!busy && <ArrowRight />}
        </Button>
      </div>
      <div className="mt-8 text-center">
        <Button type="submit" name="nav" value="exit" variant="link" disabled={busy}>
          <Save /> Save draft &amp; back to cases
        </Button>
      </div>
    </div>
  );
}
