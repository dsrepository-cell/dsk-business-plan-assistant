'use client';

import { useState } from 'react';
import { Banknote, Briefcase, FileText, TrendingUp } from 'lucide-react';
import { ChipGroup } from '@/components/chips';
import { Field, inputClass } from '@/components/field';
import { ErrorFor, StepForm, StepNav, useStep, type StepState } from '@/components/step-form';
import { cn } from '@/lib/utils';

const STAGE_LABELS = { existing: 'Yes, existing business', new: 'No, new idea' };

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const { errors } = useStep();
  return <input {...props} aria-invalid={Boolean(errors[props.name])} className={cn(inputClass, props.className, errors[props.name] && 'border-destructive')} />;
}

/** Prototype step 4: "Existing business". */
export function BusinessForm({
  action,
  values,
}: {
  action: (p: StepState, fd: FormData) => Promise<StepState>;
  values: { stage: 'existing' | 'new' | null; business_name: string | null; stated_monthly_turnover: number | null; existing_monthly_emi: number | null };
}) {
  const [stage, setStage] = useState(values.stage);
  return (
    <StepForm action={action}>
      <Field icon={Briefcase} label="Does she already run a business?">
        <ChipGroup
          name="stage"
          options={['existing', 'new']}
          labels={STAGE_LABELS}
          defaultValue={values.stage}
          onChange={(v) => setStage((v[0] as 'existing' | 'new') ?? null)}
        />
        <ErrorFor name="stage" />
      </Field>

      {stage === 'existing' && (
        <>
          <Field icon={FileText} label="Business name" htmlFor="business_name">
            <Input id="business_name" name="business_name" defaultValue={values.business_name ?? ''} autoComplete="off" />
            <ErrorFor name="business_name" />
          </Field>
          <Field icon={TrendingUp} label="Current monthly turnover (₹)" hint="We'll cross-check this against the product numbers you enter next." htmlFor="stated_monthly_turnover">
            <Input id="stated_monthly_turnover" name="stated_monthly_turnover" inputMode="numeric" defaultValue={values.stated_monthly_turnover ?? ''} />
            <ErrorFor name="stated_monthly_turnover" />
          </Field>
        </>
      )}
      {stage === 'new' && (
        <>
          <div className="mb-5 rounded-lg bg-primary-soft p-4 text-sm text-primary">
            Understood — this is a new business. The products you enter next will be used as the Year 1 plan.
          </div>
          <input type="hidden" name="business_name" value={values.business_name ?? ''} />
        </>
      )}

      {stage && (
        <Field icon={Banknote} label="Existing loan EMI, if any (₹/month)" hint="SHG, bank or any other loan she is repaying now. Leave blank if none." htmlFor="existing_monthly_emi">
          <Input id="existing_monthly_emi" name="existing_monthly_emi" inputMode="numeric" defaultValue={values.existing_monthly_emi || ''} className="max-w-[200px]" />
          <ErrorFor name="existing_monthly_emi" />
        </Field>
      )}

      <StepNav />
    </StepForm>
  );
}
