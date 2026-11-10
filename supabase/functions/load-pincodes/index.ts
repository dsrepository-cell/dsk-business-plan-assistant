/**
 * One-off loader for the location hierarchy (Phase 3). Retired after use (redeployed as a 410 stub).
 *
 * Fetches the pinned India Post directory file, refuses it unless its sha256 matches the copy that was
 * inspected (165,627 offices, 755 districts), cleans names the same way kit/06_location/import_pincodes.py
 * does, and writes one slice (`part` of `parts`) into private.loc_import. Slicing keeps each call well under
 * the Edge Function CPU limit. Authorised by a one-time token stored in private.load_tokens (not exposed by
 * the REST API), so no dashboard secret is needed.
 */
import postgres from 'npm:postgres@3.4.5';

const SRC = 'https://cdn.jsdelivr.net/npm/india-pincode@2.5.9/data/pincodes.json.gz';
const SHA256 = '10b80a286d60baed60e8e6630ac8d76992ecd240b8373d1a6b3f0ab98efae401';
const SUFFIX = /\s+(B\.?\s?O\.?|S\.?\s?O\.?|H\.?\s?O\.?|G\.?P\.?O\.?)$/i;

// Same rule as import_pincodes.py clean(): collapse spaces; Title-case words that are ALL CAPS or all lower.
function clean(s: string): string {
  const t = (s ?? '').trim().replace(/\s+/g, ' ');
  return t
    .split(' ')
    .map((w) => (w === w.toUpperCase() || w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bOf\b/g, 'of');
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Row = { s: string; i: string; o: string; p: string };

Deno.serve(async (req) => {
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1 });
  try {
    const token = req.headers.get('x-load-token') ?? '';
    const [ok] = await sql`select 1 from private.load_tokens where token = ${token} and expires_at > now()`;
    if (!ok) return json({ error: 'forbidden' }, 403);

    const { part, parts } = (await req.json()) as { part: number; parts: number };
    if (!Number.isInteger(part) || !Number.isInteger(parts) || part < 0 || part >= parts || parts > 50)
      return json({ error: 'bad part' }, 400);

    const res = await fetch(SRC);
    if (!res.ok) return json({ error: `fetch ${res.status}` }, 502);
    const buf = await res.arrayBuffer();
    const digest = hex(await crypto.subtle.digest('SHA-256', buf));
    if (digest !== SHA256) return json({ error: 'checksum mismatch', digest }, 409);

    const text = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const all = JSON.parse(text) as Row[];
    const size = Math.ceil(all.length / parts);
    const rows = all.slice(part * size, (part + 1) * size).flatMap((r) => {
      const pincode = String(r.p ?? '').replace(/\D/g, '').slice(0, 6);
      const state = clean(r.s);
      const district = clean(r.i);
      if (pincode.length !== 6 || !state || !district) return [];
      return [{ part, state, district, place: clean(String(r.o ?? '').replace(SUFFIX, '')), pincode }];
    });

    await sql.begin(async (tx) => {
      await tx`delete from private.loc_import where part = ${part}`;
      for (let i = 0; i < rows.length; i += 2000) {
        const chunk = rows.slice(i, i + 2000);
        await tx`insert into private.loc_import ${tx(chunk, 'part', 'state', 'district', 'place', 'pincode')}`;
      }
    });
    return json({ part, parts, total: all.length, inserted: rows.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  } finally {
    await sql.end({ timeout: 2 });
  }
});
