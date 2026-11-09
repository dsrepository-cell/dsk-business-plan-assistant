import Link from 'next/link';
import { Building2, LogOut } from 'lucide-react';
import { requireViewer } from '@/lib/auth';
import { signOut } from '@/app/login/actions';

const ROLE_LABEL = { admin: 'Admin', reviewer: 'Reviewer', operator: 'DSK operator' } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  return (
    <div className="min-h-dvh">
      <header className="no-print border-b bg-card">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 shrink-0 text-primary" />
            <span className="truncate">{viewer.centerName ?? 'All centres'}</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {viewer.fullName ?? viewer.email} · {ROLE_LABEL[viewer.role]}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-secondary"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
    </div>
  );
}
