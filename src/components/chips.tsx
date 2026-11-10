'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Prototype Chip group (pill buttons). Works inside a plain <form>: the choice is posted through hidden
 * input(s) named `name`. Tapping the selected chip again clears it (single-choice mode).
 */
export function ChipGroup({
  name,
  options,
  defaultValue,
  multiple = false,
  onChange,
  labels,
}: {
  name: string;
  options: readonly string[];
  defaultValue?: string | string[] | null;
  multiple?: boolean;
  onChange?: (value: string[]) => void;
  labels?: Record<string, string>;
}) {
  const init = defaultValue == null ? [] : Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  const [value, setValue] = useState<string[]>(init);

  function toggle(o: string) {
    const next = multiple ? (value.includes(o) ? value.filter((v) => v !== o) : [...value, o]) : value[0] === o ? [] : [o];
    setValue(next);
    onChange?.(next);
  }

  return (
    <div role={multiple ? 'group' : 'radiogroup'} className="flex flex-wrap">
      {value.length === 0 && <input type="hidden" name={name} value="" />}
      {value.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={active}
            onClick={() => toggle(o)}
            className={cn(
              'mr-2 mb-2 min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground',
            )}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}
