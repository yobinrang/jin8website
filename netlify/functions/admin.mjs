import { json } from '../lib/http.mjs';
import { safeEqual } from '../lib/crypto.mjs';
import { registrations } from '../lib/store.mjs';
import { formatPhone } from '../lib/phone.mjs';

// GET /api/admin  (header: x-admin-key: <ADMIN_KEY>)
// Lists everyone who has registered. Passcode hashes are never returned.
// DELETE /api/admin?phone=+61…  removes one registration (e.g. a typo'd number).

function authorised(req) {
  const key = req.headers.get('x-admin-key') || '';
  const expected = process.env.ADMIN_KEY || '';
  return expected.length >= 8 && safeEqual(key, expected);
}

export default async (req) => {
  if (!authorised(req)) return json(401, { error: 'Unauthorised.' });

  const store = registrations();

  if (req.method === 'DELETE') {
    const phone = new URL(req.url).searchParams.get('phone');
    if (!phone) return json(400, { error: 'phone required' });
    await store.delete(phone);
    return json(200, { ok: true, deleted: phone });
  }

  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const { blobs } = await store.list();
  const rows = (await Promise.all(
    blobs.map((b) => store.get(b.key, { type: 'json' })),
  )).filter(Boolean);

  rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  return json(200, {
    count: rows.length,
    registrations: rows.map(({ name, phone, createdAt, lastLogin, logins }) => ({
      name,
      phone,
      phonePretty: formatPhone(phone),
      createdAt,
      lastLogin,
      logins: logins ?? 1,
    })),
  });
};

export const config = { path: '/api/admin' };
