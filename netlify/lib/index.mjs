import { getStore } from '@netlify/blobs';

// Our own index of registered phone numbers.
//
// Why: Netlify Blobs' list() is eventually consistent (and has no strong
// option), so a fresh registration can be missing from the admin list for
// a minute or more. Individual get()s are strongly consistent, so we keep a
// single JSON array of keys and read that instead.
//
// Concurrency: updates use etag compare-and-set (onlyIfMatch / onlyIfNew),
// so two simultaneous registrations can't overwrite each other's entry.

const KEY = 'phones';

function indexStore() {
  return getStore({ name: 'registrations-index', region: 'ap-southeast-2', consistency: 'strong' });
}

export async function readIndex() {
  const res = await indexStore().getWithMetadata(KEY, { type: 'json' });
  if (!res) return { phones: [], etag: null };
  return { phones: Array.isArray(res.data) ? res.data : [], etag: res.etag ?? null };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function updateIndex(mutate) {
  const store = indexStore();
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { phones, etag } = await readIndex();
    const next = mutate(phones.slice());
    if (next.length === phones.length && next.every((p, i) => p === phones[i])) return phones;
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
  console.warn('registrations-index: conditional write kept failing, writing unconditionally:', lastError?.message);
  const { phones } = await readIndex();
  const next = mutate(phones.slice());
  await store.setJSON(KEY, next);
  return next;
}

export function addToIndex(phone) {
  return updateIndex((p) => (p.includes(phone) ? p : [...p, phone]));
}

export function removeFromIndex(phone) {
  return updateIndex((p) => p.filter((x) => x !== phone));
}

// Make the index match a known-good set of keys (used to self-heal from list()).
export function reconcileIndex(keys) {
  const wanted = [...new Set(keys)];
  return updateIndex((p) => {
    const merged = [...new Set([...p, ...wanted])].filter((k) => wanted.includes(k));
    return merged;
  });
}
