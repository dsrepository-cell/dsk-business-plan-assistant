'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  next: z.string().optional(),
});

export type LoginState = { error?: string; email?: string };

function safeNext(next: string | undefined) {
  // Only allow same-site paths, never an absolute URL (open-redirect guard).
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: String(formData.get('email') ?? '') };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    // Same message for wrong email or wrong password: don't reveal which accounts exist.
    return { error: 'Email or password is not correct.', email: parsed.data.email };
  }
  redirect(safeNext(parsed.data.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
