'use client';

import { useActionState } from 'react';
import { Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signIn, type LoginState } from './actions';

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-[15px] font-medium">
          <Mail className="size-4 text-primary" /> Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state.email}
          className="h-12 w-full rounded-lg border bg-card px-3.5 text-[16px] outline-none focus:border-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-[15px] font-medium">
          <Lock className="size-4 text-primary" /> Password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
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
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
