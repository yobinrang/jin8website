import { json } from '../lib/http.mjs';
import { normalizePhone, formatPhone } from '../lib/phone.mjs';
import { registrations } from '../lib/store.mjs';
import { readIndex } from '../lib/index.mjs';
import { getEvent, fullMessage } from '../lib/events.mjs';

// POST /api/lookup?event=thu|sat  { phone }
// Step 1 of the gate: tells the page whether this number is already on this
// night's list, so it can ask for just a PIN (returning) or name + new PIN
// (first visit). When the night is at capacity, a new number is told so here,
// before typing a name and PIN. Nothing else about the record is revealed.

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const ev = getEvent(req);
  if (!ev) return json(400, { error: 'Unknown event.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }

  const phone = normalizePhone(String(body.phone ?? ''));
  if (!phone) return json(400, { error: 'Please enter a valid mobile number.' });

  const [existing, index] = await Promise.all([
    registrations(ev).get(phone, { type: 'json' }),
    ev.capacity ? readIndex(ev).catch(() => null) : Promise.resolve(null),
  ]);

  const full = !existing && !!index && index.phones.length >= ev.capacity;
  return json(200, {
    ok: true,
    registered: !!existing,
    full,
    message: full ? fullMessage(ev) : undefined,
    phone: formatPhone(phone),
  });
};

export const config = { path: '/api/lookup' };
