import { createHmac, timingSafeEqual } from 'node:crypto';

// Signed, HttpOnly session cookie. Payload = { p: phone, e: expiry }.
// Signature is an HMAC over the payload using SESSION_SECRET, so it can't be
// forged or altered client-side.

const COOKIE = 'jin8_invite';
export const TTL_SECONDS = 5 * 60; // 5 minutes from login, then the guest re-enters number + PIN

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET is not set (or too short)');
  return s;
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function makeSessionCookie(phone) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ p: phone, e: exp })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// Returns { p, e } if the request carries a valid, unexpired session; else null.
export function readSession(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
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
    // Reject sessions issued under a longer TTL (e.g. cookies from before the
    // 5-minute rule) so shortening the TTL takes effect immediately.
    if (data.e - now > TTL_SECONDS + 5) return null;
    return data;
  } catch {
    return null;
  }
}
