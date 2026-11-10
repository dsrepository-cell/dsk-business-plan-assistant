'use client';

import { useActionState, useState, useTransition } from 'react';
import { CheckCircle2, Loader2, PencilLine, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlanActionState } from './actions';

type Meta = { key: string; label: string; hint?: string; rows: number }[];

function Status({ s }: { s: PlanActionState }) {
  if (!s.message) return null;
  return (
    <p role="status" className={s.ok ? 'mb-4 flex gap-2 rounded-lg bg-primary-soft p-3.5 text-sm text-primary' : 'mb-4 rounded-lg bg-warning-soft p-3.5 text-sm text-warning-foreground'}>
      {s.ok && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      {s.message}
    </p>
  );
}

/** Edit the plan text (operators, until approved) and approve it (reviewers / admins only). */
export function PlanControls({
  form,
  fields,
  canEdit,
  canApprove,
  save,
  approve,
}: {
  form: Record<string, string>;
  fields: Meta;
  canEdit: boolean;
  canApprove: boolean;
  save: (prev: PlanActionState, fd: FormData) => Promise<PlanActionState>;
  approve: () => Promise<PlanActionState>;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, saveAction, saving] = useActionState(save, {});
  const [approved, setApproved] = useState<PlanActionState>({});
  const [approving, startApprove] = useTransition();

  return (
    <div>
      <Status s={saved} />
      <Status s={approved} />
      {editing ? (
        <form
          action={(fd) => {
            saveAction(fd);
          }}
          className="mb-6 rounded-xl border p-4"
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Lists: one item per line. Risks and timeline: write “first part | second part” on each line. Numbers you type are
            checked against the verified figures.
          </p>
          {fields.map((f) => (
            <label key={f.key} className="mb-4 block">
              <span className="mb-1 block text-sm font-medium">{f.label}</span>
              {f.hint && <span className="mb-1 block text-xs text-muted-foreground">{f.hint}</span>}
              <textarea
                name={f.key}
                defaultValue={form[f.key]}
                rows={f.rows}
                maxLength={4000}
                className="w-full rounded-lg border bg-card p-3 text-[15px] leading-relaxed outline-none focus:border-primary"
              />
            </label>
          ))}
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              <X /> Close
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null} Save text
            </Button>
          </div>
        </form>
      ) : (
        <div className="mb-6 flex flex-wrap gap-3">
          {canEdit && (
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              <PencilLine /> Edit text
            </Button>
          )}
          {canApprove && (
            <Button
              type="button"
              variant="accent"
              disabled={approving}
              onClick={() =>
                startApprove(async () => {
                  setApproved(await approve());
                })
              }
            >
              {approving ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Approve plan
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
