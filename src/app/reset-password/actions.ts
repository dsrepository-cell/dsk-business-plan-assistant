'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type ResetState = { error?: string };

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters for the password.').max(72, 'Password is too long.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'The two passwords do not match.' });

/** Sets the new password for the user signed in by the reset link (the middleware already requires a session). */
export async function resetPassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const parsed = schema.safeParse({ password: String(fd.get('password') ?? ''), confirm: String(fd.get('confirm') ?? '') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error: /different from the old/i.test(error.message)
        ? 'Choose a password different from the old one.'
        : /weak|password/i.test(error.message)
          ? 'Choose a stronger password.'
          : 'Could not change the password. Please open the reset link again.',
    };
  }
  redirect('/dashboard?pw=changed');
}
