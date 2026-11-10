'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/field';
import { cleanPincodeInput, isPincode, singleDistrict, type PlaceHit } from '@/lib/location';
import { cn } from '@/lib/utils';
import { getDistricts, lookupPincode, savePlace, searchPlaces } from './actions';
import { goToStep } from '../../actions';

type Opt = { id: number; name: string };
type Selected = { id: number; name: string; pincode: string; district: string; state: string };

export function LocationPicker({
  businessId,
  states,
  initial,
}: {
  businessId: string;
  states: Opt[];
  initial: { stateId: number; districtId: number; districts: Opt[]; selected: Selected } | null;
}) {
  const [stateId, setStateId] = useState<number | ''>(initial?.stateId ?? '');
  const [districts, setDistricts] = useState<Opt[]>(initial?.districts ?? []);
  const [districtId, setDistrictId] = useState<number | ''>(initial?.districtId ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: number; name: string; pincode: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [pin, setPin] = useState(initial?.selected.pincode ?? '');
  const [pinHits, setPinHits] = useState<PlaceHit[] | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(initial?.selected ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(initial ? 'saved' : 'idle');
  const [, startTransition] = useTransition();
  const searchSeq = useRef(0);

  const stateName = states.find((s) => s.id === stateId)?.name ?? '';
  const districtName = districts.find((d) => d.id === districtId)?.name ?? '';

  async function chooseState(id: number | '') {
    setStateId(id);
    setDistrictId('');
    setDistricts([]);
    setResults([]);
    if (id !== '') setDistricts(await getDistricts(id));
  }

  // Debounced, server-side village search (max 50). Ignores out-of-order responses.
  useEffect(() => {
    if (districtId === '' || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchPlaces(districtId, query);
      if (seq === searchSeq.current) {
        setResults(r);
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [districtId, query]);

  function choose(p: Selected) {
    setSelected(p);
    setPin(p.pincode);
    setSaveState('saving');
    startTransition(async () => {
      const res = await savePlace(businessId, p.id);
      setSaveState(res.error ? 'error' : 'saved');
    });
  }

  async function runPincode(value: string) {
    setPinHits(null);
    if (!isPincode(value)) return;
    setPinLoading(true);
    const hits = await lookupPincode(value);
    setPinLoading(false);
    setPinHits(hits);
    const one = singleDistrict(hits);
    if (one) {
      // Reverse-fill state + district when the pincode belongs to one district.
      setStateId(one.stateId);
      setDistricts(await getDistricts(one.stateId));
      setDistrictId(one.districtId);
    }
  }

  return (
    <div>
      <Field icon={Search} label="Pincode" hint="Quickest way: type the 6-digit pincode, then tap her village." htmlFor="pin">
        <div className="flex gap-2">
          <input
            id="pin"
            inputMode="numeric"
            autoComplete="postal-code"
            value={pin}
            onChange={(e) => {
              const v = cleanPincodeInput(e.target.value);
              setPin(v);
              if (v.length === 6) runPincode(v);
              else setPinHits(null);
            }}
            className={cn(inputClass, 'max-w-[150px] tracking-widest')}
            placeholder="500001"
          />
          {pinLoading && <Loader2 className="mt-3.5 size-5 animate-spin text-primary" />}
        </div>
        {pin.length === 6 && !isPincode(pin) && <p className="mt-1 text-xs text-destructive">Pincodes don&apos;t start with 0.</p>}
        {pinHits && pinHits.length === 0 && (
          <p className="mt-1 text-xs text-warning-foreground">No post office found for this pincode. Choose state and district below.</p>
        )}
        {pinHits && pinHits.length > 0 && (
          <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border bg-card">
            {pinHits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => choose({ id: h.id, name: h.name, pincode: h.pincode, district: h.district, state: h.state })}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 border-b px-3.5 py-3 text-left text-sm last:border-b-0',
                    selected?.id === h.id && 'bg-primary-soft',
                  )}
                >
                  <span className="font-medium">{h.name}</span>
                  <span className="text-xs text-muted-foreground">{h.district}, {h.state}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <div className="mb-5 ml-12 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or choose step by step <span className="h-px flex-1 bg-border" />
      </div>

      <Field icon={MapPin} label="State" htmlFor="state">
        <select
          id="state"
          value={stateId}
          onChange={(e) => chooseState(e.target.value ? Number(e.target.value) : '')}
          className={inputClass}
        >
          <option value="">Select state…</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>

      <Field icon={MapPin} label="District" hint="Mandal / Taluk isn't in the India Post data yet." htmlFor="district">
        <select
          id="district"
          value={districtId}
          disabled={stateId === '' || districts.length === 0}
          onChange={(e) => {
            setDistrictId(e.target.value ? Number(e.target.value) : '');
            setResults([]);
          }}
          className={inputClass}
        >
          <option value="">{stateId === '' ? 'Select state first' : 'Select district…'}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </Field>

      <Field icon={MapPin} label="Village / post-office area" hint="Type at least 2 letters." htmlFor="village">
        <input
          id="village"
          value={query}
          disabled={districtId === ''}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={districtId === '' ? 'Select district first' : 'Search village…'}
          className={inputClass}
          autoComplete="off"
        />
        {searching && <p className="mt-1 text-xs text-muted-foreground">Searching…</p>}
        {!searching && query.trim().length >= 2 && results.length === 0 && districtId !== '' && (
          <p className="mt-1 text-xs text-warning-foreground">No match in {districtName}. Try a shorter spelling or the pincode.</p>
        )}
        {results.length > 0 && (
          <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border bg-card">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => choose({ id: r.id, name: r.name, pincode: r.pincode, district: districtName, state: stateName })}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 border-b px-3.5 py-3 text-left text-sm last:border-b-0',
                    selected?.id === r.id && 'bg-primary-soft',
                  )}
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs tracking-wider text-muted-foreground">{r.pincode}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      {selected && (
        <div className="mb-5 rounded-lg bg-primary-soft p-4 text-sm text-primary">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">{selected.name}</span>
            <span className="flex items-center gap-1 text-xs">
              {saveState === 'saving' && (<><Loader2 className="size-3 animate-spin" /> Saving…</>)}
              {saveState === 'saved' && (<><Check className="size-3" /> Saved</>)}
              {saveState === 'error' && <span className="text-destructive">Not saved — tap the village again</span>}
            </span>
          </div>
          <div>{selected.district}, {selected.state} · {selected.pincode}</div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href="/dashboard"><ArrowLeft /> Cases</Link>
        </Button>
        <form action={goToStep}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="step" value="entrepreneur" />
          <Button type="submit" disabled={!selected || saveState !== 'saved'}>
            Continue <ArrowRight />
          </Button>
        </form>
      </div>
    </div>
  );
}
