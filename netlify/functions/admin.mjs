import { json } from '../lib/http.mjs';
import { safeEqual } from '../lib/crypto.mjs';
import { registrations } from '../lib/store.mjs';
import { formatPhone } from '../lib/phone.mjs';
import { readIndex, removeFromIndex, reconcileIndex } from '../lib/index.mjs';

// GET /api/admin  (header: x-admin-key: <ADMIN_KEY>)
//   Lists everyone who has registered. Passcode hashes are never returned.
//   Keys come from our own strongly-consistent index, unioned with the
//   store's (eventually consistent) list() as a self-healing fallback.
// DELETE /api/admin?phone=+61…   removes one registration.
// GET /api/admin?diag=1&probe=+61…   diagnostic: what each store can see.

// Two credentials are accepted in the x-admin-key header:
//   • ADMIN_KEY — the long random key (no lockout)
//   • ADMIN_PIN — Robin's short PIN, protected by a global lockout:
//     5 wrong attempts → PIN sign-in frozen for 15 minutes (the long key
//     still works during a freeze).
const LOCK_MAX = 5;
const LOCK_MS = 15 * 60 * 1000;

async function lockStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'admin-lock', region: 'ap-southeast-2', consistency: 'strong' });
}

async function authorise(req) {
  const given = req.headers.get('x-admin-key') || '';
  const key = process.env.ADMIN_KEY || '';
  if (key.length >= 8 && given && safeEqual(given, key)) return { ok: true };

  const pin = process.env.ADMIN_PIN || '';
  if (!pin || !given) return { ok: false, status: 401, error: 'Unauthorised.' };

  const store = await lockStore();
  const lock = (await store.get('pin', { type: 'json' })) || { fails: 0, until: 0 };
  const now = Date.now();
  if (lock.until > now) {
    const mins = Math.ceil((lock.until - now) / 60000);
    return { ok: false, status: 429, error: `Too many attempts. Try again in ${mins} min.` };
  }
  if (safeEqual(given, pin)) {
    if (lock.fails) await store.setJSON('pin', { fails: 0, until: 0 });
    return { ok: true };
  }
  const fails = (lock.fails || 0) + 1;
  if (fails >= LOCK_MAX) {
    await store.setJSON('pin', { fails: 0, until: now + LOCK_MS });
    return { ok: false, status: 429, error: 'Too many attempts. PIN locked for 15 minutes.' };
  }
  await store.setJSON('pin', { fails, until: 0 });
  const left = LOCK_MAX - fails;
  return { ok: false, status: 401, error: `Wrong PIN. ${left} attempt${left === 1 ? '' : 's'} left.` };
}

export default async (req) => {
  const auth = await authorise(req);
  if (!auth.ok) return json(auth.status, { error: auth.error });

  const store = registrations();
  const url = new URL(req.url);

  if (req.method === 'GET' && url.searchParams.get('diag')) {
    const { getStore } = await import('@netlify/blobs');
    const pinned = getStore({ name: 'registrations', region: 'ap-southeast-2', consistency: 'strong' });
    const dflt = getStore({ name: 'registrations', consistency: 'strong' });
    const probe = url.searchParams.get('probe');
    const [lp, ld, idx] = await Promise.all([pinned.list(), dflt.list(), readIndex()]);
    const [gp, gd] = probe
      ? await Promise.all([pinned.get(probe, { type: 'json' }), dflt.get(probe, { type: 'json' })])
      : [null, null];
    return json(200, {
      index: idx.phones,
      pinned: { region: 'ap-southeast-2', listed: lp.blobs.map((b) => b.key), probeFound: !!gp },
      default: { region: 'default (us-east-2)', listed: ld.blobs.map((b) => b.key), probeFound: !!gd },
    });
  }

  if (req.method === 'DELETE') {
    const phone = url.searchParams.get('phone');
    if (!phone) return json(400, { error: 'phone required' });
    await store.delete(phone);
    try { await removeFromIndex(phone); } catch (e) { console.error('index remove failed', phone, e); }
    return json(200, { ok: true, deleted: phone });
  }

  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const [{ phones: indexed }, listed] = await Promise.all([
    readIndex(),
    store.list().then((r) => r.blobs.map((b) => b.key)).catch(() => []),
  ]);
  const keys = [...new Set([...indexed, ...listed])];

  const fetched = await Promise.all(keys.map(async (k) => [k, await store.get(k, { type: 'json' })]));
  const rows = fetched.filter(([, rec]) => rec).map(([, rec]) => rec);
  const liveKeys = fetched.filter(([, rec]) => rec).map(([k]) => k);

  // Self-heal: index should equal the set of keys that actually exist.
  const indexStale = liveKeys.length !== indexed.length || liveKeys.some((k) => !indexed.includes(k));
  if (indexStale) reconcileIndex(liveKeys).catch((e) => console.error('index reconcile failed', e));

  rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  return json(200, {
    count: rows.length,
    feedbackCount: rows.filter((r) => r.feedback).length,
    registrations: rows.map(({ name, phone, createdAt, lastLogin, logins, feedback }) => ({
      name,
      phone,
      phonePretty: formatPhone(phone),
      createdAt,
      lastLogin,
      logins: logins ?? 1,
      feedback: feedback ?? null,
    })),
  });
};

export const config = { path: '/api/admin' };
