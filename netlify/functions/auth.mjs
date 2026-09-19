import { json } from '../lib/http.mjs';
import { normalizePhone } from '../lib/phone.mjs';
import { hashPasscode, verifyPasscode } from '../lib/crypto.mjs';
import { makeSessionCookie } from '../lib/session.mjs';
import { registrations } from '../lib/store.mjs';

// POST /api/auth  { name, phone, passcode }
//
// Register-or-login in one step:
//   • phone not seen before  → create the record (name required), sign in  → 201
//   • phone already exists   → passcode must match the stored hash, sign in → 200
//   • phone exists, mismatch → 401 (no duplicate is ever created)

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }

  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const phone = normalizePhone(String(body.phone ?? ''));
  const passcode = String(body.passcode ?? '');

  if (!phone) return json(400, { error: 'Please enter a valid mobile number.' });
  if (passcode.length < 4) return json(400, { error: 'Passcode needs to be at least 4 characters.' });
  if (passcode.length > 64) return json(400, { error: 'Passcode is too long.' });

  const store = registrations();
  const existing = await store.get(phone, { type: 'json' });
  const now = new Date().toISOString();

  if (existing) {
    if (!verifyPasscode(passcode, existing.salt, existing.hash)) {
      return json(401, { error: 'That number is already registered, but the passcode didn’t match.' });
    }
    existing.lastLogin = now;
    existing.logins = (existing.logins ?? 0) + 1;
    await store.setJSON(phone, existing);
    return json(200, { ok: true, name: existing.name, returning: true }, {
      'set-cookie': makeSessionCookie(phone),
    });
  }

  if (name.length < 2) return json(400, { error: 'Please enter your full name.' });

  const { salt, hash } = hashPasscode(passcode);
  await store.setJSON(phone, { name, phone, salt, hash, createdAt: now, lastLogin: now, logins: 1 });

  return json(201, { ok: true, name, returning: false }, {
    'set-cookie': makeSessionCookie(phone),
  });
};

export const config = { path: '/api/auth' };
