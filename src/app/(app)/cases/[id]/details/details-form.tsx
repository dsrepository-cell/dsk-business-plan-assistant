'use client';

import { useState } from 'react';
import { ChipGroup } from '@/components/chips';
import { Field, inputClass } from '@/components/field';
import { ErrorFor, StepForm, StepNav, useStep, type StepState } from '@/components/step-form';
import { iconFor } from '@/lib/icons';
import { YES_NO, visibleQuestions, type Answer, type Answers, type Question, type Stage } from '@/lib/sector-questions';
import { cn } from '@/lib/utils';

function QuestionInput({ q, value, onChange }: { q: Question; value: Answer | undefined; onChange: (v: Answer | null) => void }) {
  const { errors } = useStep();
  const bad = Boolean(errors[q.key]);
  switch (q.type) {
    case 'yesno':
      return <ChipGroup name={q.key} options={YES_NO} defaultValue={value as string | undefined} onChange={(v) => onChange(v[0] ?? null)} />;
    case 'select':
      return <ChipGroup name={q.key} options={q.options ?? []} defaultValue={value as string | undefined} onChange={(v) => onChange(v[0] ?? null)} />;
    case 'multiselect':
      return <ChipGroup name={q.key} multiple options={q.options ?? []} defaultValue={value as string[] | undefined} onChange={(v) => onChange(v.length ? v : null)} />;
    case 'number':
      return (
        <input
          name={q.key}
          inputMode="decimal"
          defaultValue={value == null ? '' : String(value)}
          placeholder={q.placeholder ?? undefined}
          aria-invalid={bad}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, 'max-w-[160px]', bad && 'border-destructive')}
        />
      );
    default:
      return (
        <input
          name={q.key}
          defaultValue={value == null ? '' : String(value)}
          placeholder={q.placeholder ?? undefined}
          aria-invalid={bad}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, bad && 'border-destructive')}
          autoComplete="off"
        />
      );
  }
}

/** Prototype step 6: "<Industry> — a few more details". Questions come from sector_questions. */
export function DetailsForm({
  action,
  questions,
  stage,
  answers: initial,
}: {
  action: (p: StepState, fd: FormData) => Promise<StepState>;
  questions: Question[];
  stage: Stage | null;
  answers: Answers;
}) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const visible = visibleQuestions(questions, stage, answers);

  return (
    <StepForm action={action}>
      {visible.length === 0 && (
        <p className="mb-5 rounded-lg bg-primary-soft p-4 text-sm text-primary">No extra questions for this industry.</p>
      )}
      {visible.map((q) => (
        <Field key={q.key} icon={iconFor(q.icon)} label={q.label} hint={q.required ? 'Required' : undefined}>
          <QuestionInput
            q={q}
            value={answers[q.key]}
            onChange={(v) =>
              setAnswers((a) => {
                const n = { ...a };
                if (v === null || v === '') delete n[q.key];
                else n[q.key] = v;
                return n;
              })
            }
          />
          <ErrorFor name={q.key} />
        </Field>
      ))}
      <StepNav />
    </StepForm>
  );
}
