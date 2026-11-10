import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Create account · DSK Business Plan Assistant' };

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary">
          <ClipboardList className="size-[26px] text-white" />
        </div>
        <h1 className="mb-2 font-display text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Free to use. Build loan-ready business plans for women entrepreneurs.</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-8 text-center text-xs text-[#93a199]">Access Livelihoods · Digital Seva Kendra</p>
    </main>
  );
}
