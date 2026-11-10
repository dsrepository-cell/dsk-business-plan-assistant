'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type ForgotState = { error?: string; sent?: boolean; email?: string };

/** Emails a reset link. Always answers the same way, so it never reveals whether an account exists. */
export async function requestReset(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const email = String(fd.get('email') ?? '').trim();
  if (!z.string().email().safeParse(email).success) return { error: 'Enter a valid email address.', email };

  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error && /rate limit/i.test(error.message)) {
    return { error: 'Too many requests right now. Please wait a few minutes and try again.', email };
  }
  return { sent: true, email };
}
