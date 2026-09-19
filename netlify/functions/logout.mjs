import { json } from '../lib/http.mjs';
import { clearSessionCookie } from '../lib/session.mjs';

// POST /api/logout — clears the session cookie.
export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  return json(200, { ok: true }, { 'set-cookie': clearSessionCookie() });
};

export const config = { path: '/api/logout' };
