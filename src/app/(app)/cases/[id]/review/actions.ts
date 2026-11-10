'use server';

import { z } from 'zod';
import { loadReadiness } from '@/lib/case-readiness';

export type GenerateState = { ok?: boolean; message?: string; blocking?: number };

/**
 * "Generate business plan". The readiness check is re-run here on the server from the stored data, so a
 * case with blocking issues can never get past this point, whatever the browser sends.
 * Phase 8 plugs the AI narrative + plan_versions in after this gate.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState passes the previous state
export async function requestGeneration(businessId: string, _prev: GenerateState): Promise<GenerateState> {
  if (!z.string().uuid().safeParse(businessId).success) return { message: 'Case not found.' };
  const r = await loadReadiness(businessId);
  if (!r) return { message: 'Case not found.' };
  if (!r.readiness.canGenerate) {
    const n = r.readiness.blocking.length;
    return { blocking: n, message: `${n} thing${n > 1 ? 's' : ''} must be fixed before the plan can be generated.` };
  }
  return { ok: true, message: 'All checks passed. Plan generation is the next build phase (Phase 8) and will start from here.' };
}
