'use client';

import { Calendar, GraduationCap, Home, Phone, ShieldCheck, User, Users, Wallet } from 'lucide-react';
import { ChipGroup } from '@/components/chips';
import { Field, inputClass } from '@/components/field';
import { ErrorFor, StepForm, StepNav, useStep, type StepState } from '@/components/step-form';
import { EDUCATION, GENDERS, SOCIAL_CATS } from '@/lib/choices';
import { cn } from '@/lib/utils';

type Values = {
  full_name: string | null; gender: string | null; age_years: number | null; mobile: string | null;
  education: string | null; social_category: string | null; household_members: number | null;
  earning_members: number | null; dependents: number | null; monthly_family_income: number | null;
  consent_given_at: string | null;
};

const num = (v: number | null) => (v == null ? '' : String(v));

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const { errors } = useStep();
  return <input {...props} aria-invalid={Boolean(errors[props.name])} className={cn(inputClass, props.className, errors[props.name] && 'border-destructive')} />;
}

/** Prototype step 3: "Entrepreneur & household" — same fields, wording and icons. */
export function EntrepreneurForm({ action, values }: { action: (p: StepState, fd: FormData) => Promise<StepState>; values: Values }) {
  return (
    <StepForm action={action}>
      <Field icon={User} label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={values.full_name ?? ''} placeholder="As per Aadhaar" autoComplete="off" />
        <ErrorFor name="full_name" />
      </Field>
      <Field icon={Users} label="Gender">
        <ChipGroup name="gender" options={GENDERS} defaultValue={values.gender} />
        <ErrorFor name="gender" />
      </Field>
      <Field icon={Calendar} label="Age" htmlFor="age_years">
        <Input id="age_years" name="age_years" inputMode="numeric" defaultValue={num(values.age_years)} className="max-w-[140px]" />
        <ErrorFor name="age_years" />
      </Field>
      <Field icon={Phone} label="Mobile number" htmlFor="mobile">
        <Input id="mobile" name="mobile" type="tel" inputMode="numeric" defaultValue={values.mobile ?? ''} placeholder="10-digit number" autoComplete="off" />
        <ErrorFor name="mobile" />
      </Field>
      <Field icon={GraduationCap} label="Education level">
        <ChipGroup name="education" options={EDUCATION} defaultValue={values.education} />
        <ErrorFor name="education" />
      </Field>
      <Field icon={Users} label="Social category">
        <ChipGroup name="social_category" options={SOCIAL_CATS} defaultValue={values.social_category} />
        <ErrorFor name="social_category" />
      </Field>
      <Field icon={Home} label="Household" hint="Members, earning members, dependents">
        <div className="flex gap-2">
          <Input name="household_members" inputMode="numeric" defaultValue={num(values.household_members)} placeholder="Members" aria-label="Household members" />
          <Input name="earning_members" inputMode="numeric" defaultValue={num(values.earning_members)} placeholder="Earning" aria-label="Earning members" />
          <Input name="dependents" inputMode="numeric" defaultValue={num(values.dependents)} placeholder="Dependents" aria-label="Dependents" />
        </div>
        <ErrorFor name="household_members" />
        <ErrorFor name="earning_members" />
        <ErrorFor name="dependents" />
      </Field>
      <Field icon={Wallet} label="Total monthly family income (₹)" htmlFor="monthly_family_income">
        <Input id="monthly_family_income" name="monthly_family_income" inputMode="numeric" defaultValue={num(values.monthly_family_income)} />
        <ErrorFor name="monthly_family_income" />
      </Field>

      <Field icon={ShieldCheck} label="Her consent">
        {values.consent_given_at ? (
          <p className="text-sm text-primary">
            Consent recorded on {new Date(values.consent_given_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
          </p>
        ) : (
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" name="consent" className="mt-0.5 size-5 accent-[#1f4b3f]" />
            <span>
              She agrees that the DSK can use this information to prepare her business plan and share it with a bank or
              lender she chooses.
            </span>
          </label>
        )}
        <ErrorFor name="consent" />
      </Field>

      <StepNav />
    </StepForm>
  );
}
