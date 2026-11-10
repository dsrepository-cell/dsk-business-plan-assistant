'use client';

import { useActionState } from 'react';
import { Building2, Loader2, Lock, Mail, MailCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signUp, type SignupState } from './actions';

const input = 'h-12 w-full rounded-lg border bg-card px-3.5 text-[16px] outline-none focus:border-primary';

function Row({ icon: Icon, label, hint, children }: { icon: typeof Mail; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-[15px] font-medium">
        <Icon className="size-4 text-primary" /> {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signUp, {});
  if (state.sent) {
    return (
      <div className="space-y-3 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{state.values?.email}</span>. Open it on
          this phone to finish creating your account.
        </p>
      </div>
    );
  }
  const v = state.values;
  return (
    <form action={action} className="space-y-5" noValidate>
      <Row icon={User} label="Your name">
        <input name="full_name" autoComplete="name" required defaultValue={v?.full_name} className={input} />
      </Row>
      <Row icon={Building2} label="DSK centre / organisation" hint="Optional. Your cases are private to your account.">
        <input name="centre_name" autoComplete="organization" defaultValue={v?.centre_name} className={input} />
      </Row>
      <Row icon={Mail} label="Email">
        <input name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={v?.email} className={input} />
      </Row>
      <Row icon={Lock} label="Password" hint="At least 8 characters.">
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className={input} />
      </Row>
      {state.error && (
        <p role="alert" className="rounded-lg bg-warning-soft px-3.5 py-2.5 text-sm text-warning-foreground">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
