'use client';

import { useActionState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/password-input';
import { resetPassword, type ResetState } from './actions';

export function ResetForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <label htmlFor="password" className="mb-1.5 flex items-center gap-2 text-[15px] font-medium">
          <Lock className="size-4 text-primary" /> New password
        </label>
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
        <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 flex items-center gap-2 text-[15px] font-medium">
          <Lock className="size-4 text-primary" /> Type it again
        </label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={8} />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-warning-soft px-3.5 py-2.5 text-sm text-warning-foreground">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  );
}
