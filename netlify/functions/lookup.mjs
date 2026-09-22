import { json } from '../lib/http.mjs';
import { normalizePhone, formatPhone } from '../lib/phone.mjs';
import { registrations } from '../lib/store.mjs';
import { getEvent } from '../lib/events.mjs';

// POST /api/lookup?event=thu|sat  { phone }
// Step 1 of the gate: tells the page whether this number is already on this
// night's list, so it can ask for just a PIN (returning) or name + new PIN
// (first visit). Nothing else about the record is revealed.

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const ev = getEvent(req);
  if (!ev) return json(400, { error: 'Unknown event.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }

  const phone = normalizePhone(String(body.phone ?? ''));
  if (!phone) return json(400, { error: 'Please enter a valid mobile number.' });

  const existing = await registrations(ev).get(phone, { type: 'json' });
  return json(200, { ok: true, registered: !!existing, phone: formatPhone(phone) });
};

export const config = { path: '/api/lookup' };
