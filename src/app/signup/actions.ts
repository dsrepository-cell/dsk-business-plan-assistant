'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter your name.').max(120, 'Name is too long.'),
  centre_name: z.string().trim().max(120, 'Centre name is too long.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters for the password.').max(72, 'Password is too long.'),
});

export type SignupState = { error?: string; sent?: boolean; values?: { full_name: string; centre_name: string; email: string } };

/**
 * Open sign-up. The database gives every new account its own private centre and the 'operator' role
 * (migration 011) — nothing sent from here can choose a role or join someone else's centre.
 */
export async function signUp(_prev: SignupState, fd: FormData): Promise<SignupState> {
  const raw = {
    full_name: String(fd.get('full_name') ?? ''),
    centre_name: String(fd.get('centre_name') ?? ''),
    email: String(fd.get('email') ?? ''),
    password: String(fd.get('password') ?? ''),
  };
  const values = { full_name: raw.full_name, centre_name: raw.centre_name, email: raw.email };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, centre_name: parsed.data.centre_name || null },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    const msg = /rate limit/i.test(error.message)
      ? 'Too many sign-ups right now. Please try again in a little while.'
      : /password/i.test(error.message)
        ? 'Choose a stronger password.'
        : 'Could not create the account. Please check the details and try again.';
    return { error: msg, values };
  }
  // Email confirmation off → signed in straight away. On → she confirms from her inbox first.
  if (data.session) redirect('/dashboard');
  return { sent: true, values };
}
