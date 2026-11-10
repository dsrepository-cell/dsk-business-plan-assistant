/**
 * Who writes the plan's text. Numbers always come from the engine whichever is picked.
 * Only "free" (standard wording, no AI, no cost) is switched on; the AI writers are shown as "Coming soon".
 */
export const PLAN_WRITER_IDS = ['free', 'haiku', 'sonnet'] as const;
export type PlanWriterId = (typeof PLAN_WRITER_IDS)[number];

export type PlanWriter = { id: PlanWriterId; label: string; blurb: string; available: boolean };

export const PLAN_WRITERS: readonly PlanWriter[] = [
  { id: 'free', label: 'Free', blurb: 'Standard wording. Same verified numbers, no cost.', available: true },
  { id: 'haiku', label: 'Haiku', blurb: 'AI-written text, quick and low cost.', available: false },
  { id: 'sonnet', label: 'Sonnet', blurb: 'AI-written text, most detailed.', available: false },
];

export const planWriter = (id: PlanWriterId): PlanWriter => PLAN_WRITERS.find((w) => w.id === id) ?? PLAN_WRITERS[0];
