'use client';

import { inputClass } from '@/components/field';
import { useStep } from '@/components/step-form';
import { cn } from '@/lib/utils';

/** Prototype TInput inside a StepForm: shows the error border for its own field name. */
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const { errors } = useStep();
  return (
    <input
      autoComplete="off"
      maxLength={500}
      {...props}
      aria-invalid={Boolean(errors[props.name])}
      className={cn(inputClass, props.className, errors[props.name] && 'border-destructive')}
    />
  );
}
