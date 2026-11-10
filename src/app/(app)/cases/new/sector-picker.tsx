'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DbIcon } from '@/lib/icons';
import { createCase, type ActionState } from '../actions';

type Sector = { id: string; name: string; icon: string; tint: string | null };

/** Prototype step 1: "Which business is this for?" — a 3-column icon grid. */
export function SectorPicker({ sectors }: { sectors: Sector[] }) {
  const [selected, setSelected] = useState('');
  const [state, action, pending] = useActionState<ActionState, FormData>(createCase, {});

  return (
    <form action={action}>
      <input type="hidden" name="sectorId" value={selected} />
      <div className="mb-8 grid grid-cols-3 gap-3">
        {sectors.map((s) => {
          const active = selected === s.id;
          const tint = s.tint ?? '#1f4b3f';
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(s.id)}
              className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center"
              style={active ? { borderColor: tint, background: tint + '14' } : { background: '#fff' }}
            >
              <DbIcon name={s.icon} className="size-[22px]" color={active ? tint : '#6b7a72'} />
              <span className="text-xs leading-tight font-medium">{s.name}</span>
            </button>
          );
        })}
      </div>
      {state.error && (
        <p role="alert" className="mb-4 rounded-lg bg-warning-soft p-3.5 text-sm text-warning-foreground">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href="/dashboard">
            <ArrowLeft /> Back
          </Link>
        </Button>
        <Button type="submit" disabled={!selected || pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Continue {!pending && <ArrowRight />}
        </Button>
      </div>
    </form>
  );
}
