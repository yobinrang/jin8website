import { json } from '../lib/http.mjs';
import { safeEqual } from '../lib/crypto.mjs';
import { registrations } from '../lib/store.mjs';
import { formatPhone } from '../lib/phone.mjs';
import { readIndex, removeFromIndex, reconcileIndex } from '../lib/index.mjs';
import { getEvent } from '../lib/events.mjs';

// GET    /api/admin?event=thu|sat             one night's guest list (never returns PIN hashes)
// DELETE /api/admin?event=thu|sat&phone=+61…  removes one registration from that night
// GET    /api/admin?event=…&diag=1&probe=+61… diagnostic: what the stores can see
//
// Keys come from our own strongly-consistent index, unioned with the store's
// list() as a self-healing fallback.

// The credential is ADMIN_PIN (Robin's PIN), sent in the x-admin-key header.
// Brute-force protection is per device: 5 wrong attempts from one IP freeze
// that IP for 15 minutes; other devices are unaffected. (A long ADMIN_KEY,
// 16+ chars, is also accepted without lockout if ever set; a short one is
// ignored so it can never bypass the lockout.)
const LOCK_MAX = 5;
const LOCK_MS = 15 * 60 * 1000;

async function lockStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'admin-lock', region: 'ap-southeast-2', consistency: 'strong' });
}

// Netlify passes the real client IP as context.ip (headers are the fallback).
function clientIp(req, context) {
  return (context && context.ip)
    || req.headers.get('x-nf-client-connection-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown';
}

async function authorise(req, context) {
  const given = req.headers.get('x-admin-key') || '';
  const key = process.env.ADMIN_KEY || '';
  if (key.length >= 16 && given && safeEqual(given, key)) return { ok: true };

  const pin = process.env.ADMIN_PIN || '';
  if (!pin || !given) return { ok: false, status: 401, error: 'Unauthorised.' };

  const store = await lockStore();
  const lockKey = 'ip:' + clientIp(req, context);
  const lock = (await store.get(lockKey, { type: 'json' })) || { fails: 0, until: 0 };
  const now = Date.now();
  if (lock.until > now) {
    const mins = Math.ceil((lock.until - now) / 60000);
    return { ok: false, status: 429, error: `Too many attempts from this device. Try again in ${mins} min.` };
  }
  if (safeEqual(given, pin)) {
    if (lock.fails) await store.setJSON(lockKey, { fails: 0, until: 0 });
    return { ok: true };
  }
  const fails = (lock.fails || 0) + 1;
  if (fails >= LOCK_MAX) {
    await store.setJSON(lockKey, { fails: 0, until: now + LOCK_MS });
    return { ok: false, status: 429, error: 'Too many attempts. This device is locked for 15 minutes.' };
  }
  await store.setJSON(lockKey, { fails, until: 0 });
  const left = LOCK_MAX - fails;
  return { ok: false, status: 401, error: `Wrong PIN. ${left} attempt${left === 1 ? '' : 's'} left.` };
}

export default async (req, context) => {
  const auth = await authorise(req, context);
  if (!auth.ok) return json(auth.status, { error: auth.error });

  const ev = getEvent(req);
  if (!ev) return json(400, { error: 'Unknown event.' });

  const store = registrations(ev);
  const url = new URL(req.url);

  if (req.method === 'GET' && url.searchParams.get('diag')) {
    const probe = url.searchParams.get('probe');
    const [listed, idx, found] = await Promise.all([
      store.list().then((r) => r.blobs.map((b) => b.key)).catch((e) => `error: ${e.message}`),
      readIndex(ev),
      probe ? store.get(probe, { type: 'json' }).then((r) => !!r) : Promise.resolve(null),
    ]);
    return json(200, {
      event: ev.id,
      store: ev.store,
      ip: clientIp(req, context),
      index: idx.phones,
      listed,
      probeFound: found,
    });
  }

  if (req.method === 'DELETE') {
    const phone = url.searchParams.get('phone');
    if (!phone) return json(400, { error: 'phone required' });
    await store.delete(phone);
    try { await removeFromIndex(ev, phone); } catch (e) { console.error('index remove failed', ev.id, phone, e); }
    return json(200, { ok: true, event: ev.id, deleted: phone });
  }

  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const [{ phones: indexed }, listed] = await Promise.all([
    readIndex(ev),
    store.list().then((r) => r.blobs.map((b) => b.key)).catch(() => []),
  ]);
  const keys = [...new Set([...indexed, ...listed])];

  const fetched = await Promise.all(keys.map(async (k) => [k, await store.get(k, { type: 'json' })]));
  const rows = fetched.filter(([, rec]) => rec).map(([, rec]) => rec);
  const liveKeys = fetched.filter(([, rec]) => rec).map(([k]) => k);

  // Self-heal: the index should equal the set of keys that actually exist.
  const indexStale = liveKeys.length !== indexed.length || liveKeys.some((k) => !indexed.includes(k));
  if (indexStale) reconcileIndex(ev, liveKeys).catch((e) => console.error('index reconcile failed', ev.id, e));

  rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  return json(200, {
    event: { id: ev.id, name: ev.name, date: ev.date },
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
