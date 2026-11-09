import { redirect } from 'next/navigation';
import { canCreateCases, requireViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProgressBar } from '@/components/progress-bar';
import { WIZARD_STEPS } from '@/lib/wizard';
import { SectorPicker } from './sector-picker';

export const metadata = { title: 'New entrepreneur · DSK Business Plan Assistant' };

export default async function NewCasePage() {
  const viewer = await requireViewer();
  if (!canCreateCases(viewer)) redirect('/dashboard');

  const supabase = await createClient();
  const { data: sectors } = await supabase
    .from('sectors')
    .select('id, name, icon, tint')
    .eq('active', true)
    .order('sort_order');

  return (
    <div>
      <ProgressBar step={1} total={WIZARD_STEPS.length} />
      <h2 className="mb-1 text-xl font-semibold">Which business is this for?</h2>
      <p className="mb-6 text-sm text-muted-foreground">Choose the enterprise type closest to what she does.</p>
      <SectorPicker sectors={sectors ?? []} />
    </div>
  );
}
