import { getStore } from '@netlify/blobs';
import { canonicalPhoneKey } from './phone.mjs';

// Our own index of registered phone numbers, one per night.
//
// Why: Netlify Blobs' list() returns nothing for our region-pinned stores in
// production, while individual get()s are strongly consistent. So we keep a
// single JSON array of keys per night and read that instead.
//
// Concurrency: updates use etag compare-and-set (onlyIfMatch / onlyIfNew),
// so two simultaneous registrations can't overwrite each other's entry.

const KEY = 'phones';

function indexStore(ev) {
  return getStore({ name: ev.indexStore, region: 'ap-southeast-2', consistency: 'strong' });
}

// `phones` is always canonical and free of duplicates. `raw` is what is
// actually stored, so a write can tell whether the stored copy needs
// repairing even when the caller changed nothing.
export async function readIndex(ev) {
  const res = await indexStore(ev).getWithMetadata(KEY, { type: 'json' });
  if (!res) return { phones: [], raw: [], etag: null };
  const raw = Array.isArray(res.data) ? res.data : [];
  const phones = [...new Set(raw.map(canonicalPhoneKey).filter(Boolean))];
  return { phones, raw, etag: res.etag ?? null };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function updateIndex(ev, mutate) {
  const store = indexStore(ev);
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { phones, raw, etag } = await readIndex(ev);
    const next = mutate(phones.slice());
    // Compare against what is stored, not the cleaned copy, so a polluted
    // index gets rewritten cleanly even when the caller is a no-op.
    if (next.length === raw.length && next.every((p, i) => p === raw[i])) return phones;
    const options = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    try {
      const result = await store.setJSON(KEY, next, options);
      if (result?.modified !== false) return next;   // written (or runtime doesn't report → assume ok)
      lastError = new Error('precondition failed (concurrent update)');
    } catch (e) {
      lastError = e;                                   // runtime rejected the conditional write outright
    }
    await sleep(40 * (attempt + 1));                   // re-read and retry
  }

  // Last resort: unconditional write so the index still makes progress.
  // A lost concurrent update here is repaired by the admin list's reconcile.
  console.warn(`${ev.indexStore}: conditional write kept failing, writing unconditionally:`, lastError?.message);
  const { phones } = await readIndex(ev);
  const next = mutate(phones.slice());
  await store.setJSON(KEY, next);
  return next;
}

export class ListFullError extends Error {
  constructor() { super('list full'); this.code = 'FULL'; }
}

// Adds a phone to the night's index. With `cap`, refuses (ListFullError)
// when the list already holds that many numbers. The check runs inside the
// compare-and-set loop, so two simultaneous sign-ups for the last spot
// can't both succeed.
export function addToIndex(ev, phone, cap = 0) {
  const key = canonicalPhoneKey(phone);
  return updateIndex(ev, (p) => {
    if (!key || p.includes(key)) return p;
    if (cap && p.length >= cap) throw new ListFullError();
    return [...p, key];
  });
}

export function removeFromIndex(ev, phone) {
  const key = canonicalPhoneKey(phone);
  return updateIndex(ev, (p) => p.filter((x) => x !== key));
}

// Make the index match a known-good set of keys (used to self-heal).
export function reconcileIndex(ev, keys) {
  const wanted = [...new Set(keys.map(canonicalPhoneKey).filter(Boolean))];
  return updateIndex(ev, (p) => [...new Set([...p, ...wanted])].filter((k) => wanted.includes(k)));
}
