import { createHmac, timingSafeEqual } from 'node:crypto';

// Signed, HttpOnly session cookie, one per night (jin8_thu, jin8_sat).
// Payload = { p: phone, v: event id, e: expiry }. The HMAC over the payload
// (SESSION_SECRET) means it can't be forged or edited client-side, and the
// event id stops a Thursday session from opening Saturday's page.

export const TTL_SECONDS = 5 * 60; // 5 minutes from login, then the guest re-enters number + PIN

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET is not set (or too short)');
  return s;
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function cookieName(eventId) {
  return `jin8_${eventId}`;
}

export function makeSessionCookie(phone, eventId) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ p: phone, v: eventId, e: exp })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${cookieName(eventId)}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
}

export function clearSessionCookie(eventId) {
  return `${cookieName(eventId)}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// Returns { p, v, e } if the request carries a valid, unexpired session for
// this night; else null.
export function readSession(req, eventId) {
  const cookieHeader = req.headers.get('cookie') || '';
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName(eventId)}=([^;]+)`));
  if (!m) return null;

  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Date.now() / 1000;
    if (!data.p || !data.e || data.e < now) return null;
    if (data.v !== eventId) return null;
    // Reject sessions issued under a longer TTL so shortening it takes effect at once.
    if (data.e - now > TTL_SECONDS + 5) return null;
    return data;
  } catch {
    return null;
  }
}
