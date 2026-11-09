import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: 'admin' | 'reviewer' | 'operator';
  centerId: string | null;
  centerName: string | null;
};

/** The signed-in user with role and centre. Redirects to /login if there is no valid session. Cached per request. */
export const requireViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, center_id, dsk_centers(name)')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: profile?.role ?? 'operator',
    centerId: profile?.center_id ?? null,
    centerName: profile?.dsk_centers?.name ?? null,
  };
});

/** Operators create cases; reviewers/admins without a centre can't (the database enforces this too). */
export function canCreateCases(v: Viewer) {
  return Boolean(v.centerId);
}
