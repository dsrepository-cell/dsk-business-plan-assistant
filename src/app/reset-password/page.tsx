import { KeyRound } from 'lucide-react';
import { ResetForm } from './reset-form';

export const metadata = { title: 'Set a new password · DSK Business Plan Assistant' };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary">
          <KeyRound className="size-[26px] text-white" />
        </div>
        <h1 className="mb-2 font-display text-2xl font-semibold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <ResetForm />
      </div>
    </main>
  );
}
