import { notFound } from 'next/navigation';
import { ProgressBar } from '@/components/progress-bar';
import { createClient } from '@/lib/supabase/server';
import { DbIcon } from '@/lib/icons';
import { WIZARD_STEPS, stepIndex } from '@/lib/wizard';
import { LocationPicker } from './location-picker';

export const metadata = { title: 'Location · DSK Business Plan Assistant' };

/** Prototype step 2: "Where is the business located?" Stores only entrepreneurs.place_id. */
export default async function LocationStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from('businesses')
    .select(
      'id, sectors(name, icon, tint), entrepreneurs(full_name, place_id, loc_places(id, name, pincode, loc_taluks(loc_districts(id, name, loc_states(id, name)))))',
    )
    .eq('id', id)
    .maybeSingle();
  if (!biz) notFound();

  const [{ data: states }] = await Promise.all([supabase.from('loc_states').select('id, name').order('name')]);

  const place = biz.entrepreneurs?.loc_places;
  const district = place?.loc_taluks?.loc_districts;
  let initial = null;
  if (place && district?.loc_states) {
    const { data: districts } = await supabase
      .from('loc_districts')
      .select('id, name')
      .eq('state_id', district.loc_states.id)
      .order('name');
    initial = {
      stateId: district.loc_states.id,
      districtId: district.id,
      districts: districts ?? [],
      selected: { id: place.id, name: place.name, pincode: place.pincode, district: district.name, state: district.loc_states.name },
    };
  }

  return (
    <div>
      <ProgressBar step={stepIndex('location') + 1} total={WIZARD_STEPS.length} />
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <DbIcon name={biz.sectors?.icon} className="size-3.5" color={biz.sectors?.tint ?? undefined} />
        {biz.sectors?.name} · {biz.entrepreneurs?.full_name || 'Name not added yet'}
      </div>
      <h2 className="mb-5 text-xl font-semibold">Where is the business located?</h2>
      <LocationPicker businessId={biz.id} states={states ?? []} initial={initial} />
    </div>
  );
}
