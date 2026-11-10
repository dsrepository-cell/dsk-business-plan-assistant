'use client';

import { useActionState } from 'react';
import { Loader2, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestReset, type ForgotState } from './actions';

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, {});
  if (state.sent) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto mb-3 size-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{state.email}</span>, we have sent a link to
          set a new password. Open it on this phone. Check the spam folder if it does not arrive in a few minutes.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-[15px] font-medium">
          <Mail className="size-4 text-primary" /> Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          className="h-12 w-full rounded-lg border bg-card px-3.5 text-[16px] outline-none focus:border-primary"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-warning-soft px-3.5 py-2.5 text-sm text-warning-foreground">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
