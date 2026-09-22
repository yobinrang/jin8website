import { json } from '../lib/http.mjs';
import { normalizePhone } from '../lib/phone.mjs';
import { hashPasscode, verifyPasscode } from '../lib/crypto.mjs';
import { makeSessionCookie } from '../lib/session.mjs';
import { registrations } from '../lib/store.mjs';
import { addToIndex } from '../lib/index.mjs';
import { getEvent, fullMessage } from '../lib/events.mjs';

// POST /api/auth?event=thu|sat  { name, phone, passcode }
//
// Register-or-login for one night's list:
//   • phone not on this night's list → create the record (name required) → 201
//   • phone already on it           → PIN must match the stored hash    → 200
//   • phone on it, PIN mismatch     → 401 (no duplicate is ever created)

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const ev = getEvent(req);
  if (!ev) return json(400, { error: 'Unknown event.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }

  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const phone = normalizePhone(String(body.phone ?? ''));
  const passcode = String(body.passcode ?? '');

  if (!phone) return json(400, { error: 'Please enter a valid mobile number.' });
  if (passcode.length < 4) return json(400, { error: 'PIN needs to be at least 4 characters.' });
  if (passcode.length > 64) return json(400, { error: 'PIN is too long.' });

  const store = registrations(ev);
  const existing = await store.get(phone, { type: 'json' });
  const now = new Date().toISOString();

  if (existing) {
    if (!verifyPasscode(passcode, existing.salt, existing.hash)) {
      return json(401, { error: 'That number is already registered, but the PIN didn’t match.' });
    }
    existing.lastLogin = now;
    existing.logins = (existing.logins ?? 0) + 1;
    // Records created before the index existed (or whose index write once
    // failed) get indexed on their next login; after that we skip the extra
    // database round-trips.
    if (!existing.indexed) {
      try { await addToIndex(ev, phone); existing.indexed = true; } catch (e) { console.error('index touch failed', ev.id, phone, e); }
    }
    await store.setJSON(phone, existing);
    return json(200, { ok: true, name: existing.name, returning: true }, {
      'set-cookie': makeSessionCookie(phone, ev.id),
    });
  }

  if (name.length < 2) return json(400, { error: 'Please enter your full name.' });

  const { salt, hash } = hashPasscode(passcode);
  const record = { name, phone, salt, hash, createdAt: now, lastLogin: now, logins: 1, indexed: false };

  // Claim a place on the list first; this is where the capacity is enforced.
  // A full list refuses the new number. Any other index glitch is logged and
  // the guest is let in (indexed:false, retried on next login) rather than
  // turned away.
  try {
    await addToIndex(ev, phone, ev.capacity);
    record.indexed = true;
  } catch (e) {
    if (e.code === 'FULL') return json(409, { error: fullMessage(ev), full: true });
    console.error('index add failed', ev.id, phone, e);
  }
  await store.setJSON(phone, record);

  return json(201, { ok: true, name, returning: false }, {
    'set-cookie': makeSessionCookie(phone, ev.id),
  });
};

export const config = { path: '/api/auth' };
