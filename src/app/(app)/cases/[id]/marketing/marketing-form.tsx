'use client';

import { Megaphone, Rocket, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { ChipGroup } from '@/components/chips';
import { Field } from '@/components/field';
import { ErrorFor, StepForm, StepNav, type StepState } from '@/components/step-form';
import { TextInput } from '@/components/text-input';
import { CHANNELS, PRICING_STRATEGIES } from '@/lib/choices';

type Values = {
  target_customers: string | null; current_channels: string[]; proposed_channels: string[];
  pricing_strategy: string | null; competitive_advantage: string | null;
};

/** Prototype step 11: "Marketing & sales". */
export function MarketingForm({ action, values }: { action: (p: StepState, fd: FormData) => Promise<StepState>; values: Values }) {
  return (
    <StepForm action={action}>
      <Field icon={Users} label="Who are her target customers?" htmlFor="target_customers">
        <TextInput id="target_customers" name="target_customers" defaultValue={values.target_customers ?? ''} />
        <ErrorFor name="target_customers" />
      </Field>
      <Field icon={Megaphone} label="How does she currently sell? (select all that apply)">
        <ChipGroup name="current_channels" multiple options={CHANNELS} defaultValue={values.current_channels} />
        <ErrorFor name="current_channels" />
      </Field>
      <Field icon={Rocket} label="Where would she like to sell in future?">
        <ChipGroup name="proposed_channels" multiple options={CHANNELS} defaultValue={values.proposed_channels} />
        <ErrorFor name="proposed_channels" />
      </Field>
      <Field icon={TrendingUp} label="What's her pricing approach?">
        <ChipGroup name="pricing_strategy" options={PRICING_STRATEGIES} defaultValue={values.pricing_strategy} />
        <ErrorFor name="pricing_strategy" />
      </Field>
      <Field icon={ShieldCheck} label="What makes her better than nearby competitors?" htmlFor="competitive_advantage">
        <TextInput id="competitive_advantage" name="competitive_advantage" defaultValue={values.competitive_advantage ?? ''} />
        <ErrorFor name="competitive_advantage" />
      </Field>
      <StepNav />
    </StepForm>
  );
}
