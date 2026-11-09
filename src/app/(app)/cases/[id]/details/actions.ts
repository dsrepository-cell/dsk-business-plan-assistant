'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { readNav } from '@/lib/forms';
import { applyAnswers, toQuestion, type Answers } from '@/lib/sector-questions';
import { leaveStep, type StepState } from '@/lib/steps';

export async function saveDetails(businessId: string, _prev: StepState, fd: FormData): Promise<StepState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const nav = readNav(fd.get('nav'));

  const supabase = await createClient();
  const { data: biz } = await supabase.from('businesses').select('sector_id, stage, sector_answers').eq('id', businessId).maybeSingle();
  if (!biz) return { message: 'Case not found.' };

  // Questions come from the database (never from the client), so a tampered form can't add or retype questions.
  const { data: rows } = await supabase
    .from('sector_questions')
    .select('key, label, icon, type, options, placeholder, required, stage, show_if, sort_order')
    .eq('sector_id', biz.sector_id);
  const questions = (rows ?? []).map(toQuestion);

  const stored = (biz.sector_answers && typeof biz.sector_answers === 'object' && !Array.isArray(biz.sector_answers)
    ? biz.sector_answers
    : {}) as Answers;
  const { answers, errors } = applyAnswers(stored, questions, biz.stage, (k) => fd.getAll(k).map(String), nav === 'next');
  if (Object.keys(errors).length) return { errors };

  const { error } = await supabase.from('businesses').update({ sector_answers: answers }).eq('id', businessId);
  if (error) return { message: 'Could not save. Please try again.' };

  return leaveStep(businessId, 'details', nav);
}
