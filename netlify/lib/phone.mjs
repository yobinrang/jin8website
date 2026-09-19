// Normalise a phone number to E.164 so the same person can't register twice
// with different formatting ("0412 345 678" vs "+61412345678").
// Defaults to Australia (+61) when no country code is given.
export function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().replace(/[\s\-().]/g, '');
  if (!s) return null;

  if (s.startsWith('+')) {
    s = '+' + s.slice(1).replace(/\D/g, '');
  } else {
    s = s.replace(/\D/g, '');
    if (s.startsWith('0')) s = '+61' + s.slice(1);          // 04xx xxx xxx → +614xx
    else if (s.startsWith('61') && s.length >= 11) s = '+' + s;  // 614xx… → +614xx…
    else s = '+61' + s;                                      // 4xx xxx xxx → +614xx
  }

  const digits = s.slice(1);
  if (!/^\d{8,15}$/.test(digits)) return null;
  return s;
}

// Pretty form for display: +61 412 345 678
export function formatPhone(e164) {
  if (!e164) return '';
  if (e164.startsWith('+61') && e164.length === 12) {
    return `+61 ${e164.slice(3, 6)} ${e164.slice(6, 9)} ${e164.slice(9)}`;
  }
  return e164;
}
