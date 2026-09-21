import { json } from '../lib/http.mjs';
import { readSession } from '../lib/session.mjs';
import { registrations } from '../lib/store.mjs';
import { FEEDBACK_OPEN, FEEDBACK_OPENS_ON } from '../lib/config.mjs';

// POST /api/feedback
//   { drinks: { rating, note }, service: { rating, note }, venue: { rating, note }, other }
// Requires a signed-in guest. Stored on the guest's own registration record
// (one feedback per guest; sending again replaces it). Refused while
// FEEDBACK_OPEN is false.

const AREAS = ['drinks', 'service', 'venue'];

function cleanRating(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
function cleanNote(v, max = 1000) {
  return String(v ?? '').trim().slice(0, max);
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!FEEDBACK_OPEN) return json(403, { error: `Feedback opens on ${FEEDBACK_OPENS_ON}.` });

  const session = readSession(req);
  if (!session) return json(401, { error: 'Not signed in.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }

  const feedback = { submittedAt: new Date().toISOString() };
  let anything = false;
  for (const area of AREAS) {
    const a = body?.[area] ?? {};
    const rating = cleanRating(a.rating);
    const note = cleanNote(a.note);
    if (rating || note) anything = true;
    feedback[area] = { rating, note };
  }
  feedback.other = cleanNote(body?.other, 2000);
  if (feedback.other) anything = true;
  if (!anything) return json(400, { error: 'Add a rating or a few words first.' });

  const store = registrations();
  const rec = await store.get(session.p, { type: 'json' });
  if (!rec) return json(401, { error: 'Registration not found.' });

  rec.feedback = feedback;
  await store.setJSON(session.p, rec);

  return json(200, { ok: true, feedback });
};

export const config = { path: '/api/feedback' };
