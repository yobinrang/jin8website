import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Passcodes are stored as salted scrypt hashes — never in plaintext.
export function hashPasscode(passcode) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(passcode, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPasscode(passcode, salt, hash) {
  const computed = scryptSync(passcode, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

// Constant-time string compare (admin key).
export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x, y);
}
