'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { escapeLike, isPincode, mergeSearch, type PlaceHit } from '@/lib/location';

const LIMIT = 50;

export async function getDistricts(stateId: number): Promise<{ id: number; name: string }[]> {
  if (!Number.isInteger(stateId)) return [];
  const supabase = await createClient();
  const { data } = await supabase.from('loc_districts').select('id, name').eq('state_id', stateId).order('name');
  return data ?? [];
}

type PlaceRow = { id: number; name: string; pincode: string };

/** Village / post-office search inside one district. Server-side, max 50 rows, prefix matches first. */
export async function searchPlaces(districtId: number, q: string): Promise<PlaceRow[]> {
  const term = q.trim();
  if (!Number.isInteger(districtId) || term.length < 2) return [];
  const supabase = await createClient();
  const base = () =>
    supabase
      .from('loc_places')
      .select('id, name, pincode, loc_taluks!inner(district_id)')
      .eq('loc_taluks.district_id', districtId)
      .order('name')
      .limit(LIMIT);
  const like = escapeLike(term);
  const { data: prefix } = await base().ilike('name', `${like}%`);
  const p = (prefix ?? []).map(({ id, name, pincode }) => ({ id, name, pincode }));
  if (p.length >= LIMIT) return p;
  const { data: contains } = await base().ilike('name', `%${like}%`);
  return mergeSearch(p, (contains ?? []).map(({ id, name, pincode }) => ({ id, name, pincode })), LIMIT);
}

/** Pincode → all post-office areas with that pincode, with their district and state (for reverse-fill). */
export async function lookupPincode(pin: string): Promise<PlaceHit[]> {
  if (!isPincode(pin)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('loc_places')
    .select('id, name, pincode, loc_taluks!inner(loc_districts!inner(id, name, loc_states!inner(id, name)))')
    .eq('pincode', pin)
    .order('name')
    .limit(LIMIT);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    pincode: r.pincode,
    districtId: r.loc_taluks.loc_districts.id,
    district: r.loc_taluks.loc_districts.name,
    stateId: r.loc_taluks.loc_districts.loc_states.id,
    state: r.loc_taluks.loc_districts.loc_states.name,
  }));
}

/** Autosave: store ONLY place_id on the entrepreneur (state/district/pincode are derived from it). */
export async function savePlace(businessId: string, placeId: number): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(businessId).success || !Number.isInteger(placeId)) return { error: 'Invalid input.' };
  const supabase = await createClient();
  const { data: biz } = await supabase.from('businesses').select('entrepreneur_id').eq('id', businessId).maybeSingle();
  if (!biz) return { error: 'Case not found.' };
  const { error, count } = await supabase
    .from('entrepreneurs')
    .update({ place_id: placeId }, { count: 'exact' })
    .eq('id', biz.entrepreneur_id);
  if (error) return { error: 'Could not save the location. Please try again.' };
  if (!count) return { error: 'Case not found.' };
  revalidatePath('/dashboard');
  return {};
}
