import { json } from '../lib/http.mjs';
import { clearSessionCookie } from '../lib/session.mjs';
import { getEvent } from '../lib/events.mjs';

// POST /api/logout?event=thu|sat — clears that night's session cookie.
export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const ev = getEvent(req);
  if (!ev) return json(400, { error: 'Unknown event.' });
  return json(200, { ok: true }, { 'set-cookie': clearSessionCookie(ev.id) });
};

export const config = { path: '/api/logout' };
