import { notFound, redirect } from 'next/navigation';

/**
 * Every wizard step now has its own screen (static routes win over this one). What can still land here:
 * "sector" — the industry is chosen when the case is created, so go to the first real step — or junk → 404.
 */
export default async function StepPage({ params }: { params: Promise<{ id: string; step: string }> }) {
  const { id, step } = await params;
  if (step === 'sector') redirect(`/cases/${id}/location`);
  notFound();
}
