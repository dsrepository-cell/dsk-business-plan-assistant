import { ClipboardList } from 'lucide-react';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in · DSK Business Plan Assistant' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary">
          <ClipboardList className="size-[26px] text-white" />
        </div>
        <h1 className="mb-2 font-display text-2xl font-semibold">DSK Business Plan Assistant</h1>
        <p className="text-sm text-muted-foreground">Sign in with your DSK operator account.</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <LoginForm next={next} />
      </div>
      <p className="mt-8 text-center text-xs text-[#93a199]">Access Livelihoods · Digital Seva Kendra</p>
    </main>
  );
}
