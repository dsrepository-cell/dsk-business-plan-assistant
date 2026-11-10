import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { ForgotForm } from './forgot-form';

export const metadata = { title: 'Forgot password · DSK Business Plan Assistant' };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary">
          <KeyRound className="size-[26px] text-white" />
        </div>
        <h1 className="mb-2 font-display text-2xl font-semibold">Forgot password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we will send you a link to set a new password.</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <ForgotForm />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
