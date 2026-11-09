import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Indian-format rupees, whole number. Display only — never feed the result back into a calculation. */
export function formatINR(value: number | null | undefined): string {
  const v = Math.round(Number(value) || 0);
  return '₹' + v.toLocaleString('en-IN');
}
