'use client';

import { ListChecks, Rocket, Target } from 'lucide-react';
import { ChipGroup } from '@/components/chips';
import { Field } from '@/components/field';
import { ErrorFor, StepForm, StepNav, type StepState } from '@/components/step-form';
import { TextInput } from '@/components/text-input';
import { GOAL_LABELS } from '@/lib/choices';

const GOALS = Object.keys(GOAL_LABELS) as (keyof typeof GOAL_LABELS)[];

/** Prototype step 10: "Future plan". Goals feed the suggested growth on the next-but-one screen. */
export function FutureForm({
  action,
  values,
}: {
  action: (p: StepState, fd: FormData) => Promise<StepState>;
  values: { goals: string[]; loan_goal: string | null; three_year_vision: string | null };
}) {
  return (
    <StepForm action={action}>
      <Field icon={Target} label="What does she want to do next? (select all that apply)">
        <ChipGroup name="goals" multiple options={GOALS} labels={GOAL_LABELS} defaultValue={values.goals} />
        <ErrorFor name="goals" />
      </Field>
      <Field icon={Rocket} label="What is the main goal of the proposed loan?" htmlFor="loan_goal">
        <TextInput id="loan_goal" name="loan_goal" defaultValue={values.loan_goal ?? ''} />
        <ErrorFor name="loan_goal" />
      </Field>
      <Field icon={ListChecks} label="In 3 years, where does she want this business to be?" htmlFor="three_year_vision">
        <TextInput id="three_year_vision" name="three_year_vision" defaultValue={values.three_year_vision ?? ''} />
        <ErrorFor name="three_year_vision" />
      </Field>
      <StepNav />
    </StepForm>
  );
}
