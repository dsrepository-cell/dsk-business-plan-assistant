'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { entrepreneurNextErrors, entrepreneurSchema, fieldErrors, readEntrepreneur, readNav } from '@/lib/forms';
import { leaveStep, type StepState } from '@/lib/steps';

export async function saveEntrepreneur(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  const parsed = entrepreneurSchema.safeParse(readEntrepreneur(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select('entrepreneur_id, entrepreneurs(consent_given_at)')
    .eq('id', businessId)
    .maybeSingle();
  if (!biz) return { message: 'Case not found.' };
  const consentedAt = biz.entrepreneurs?.consent_given_at ?? null;

  if (nav === 'next') {
    const errors = entrepreneurNextErrors(v, Boolean(consentedAt));
    if (Object.keys(errors).length) return { errors };
  }

  const { error } = await supabase
    .from('entrepreneurs')
    .update({
      full_name: v.full_name,
      gender: v.gender,
      age_years: v.age_years,
      mobile: v.mobile,
      education: v.education,
      social_category: v.social_category,
      household_members: v.household_members,
      earning_members: v.earning_members,
      dependents: v.dependents,
      monthly_family_income: v.monthly_family_income,
      // Consent is recorded once, with the time it was first given; it is not silently withdrawn by an unticked box.
      ...(v.consent && !consentedAt ? { consent_given_at: new Date().toISOString() } : {}),
    })
    .eq('id', biz.entrepreneur_id);
  if (error) return { message: 'Could not save. Please check your connection and try again.' };

  return leaveStep(businessId, 'entrepreneur', nav);
}
