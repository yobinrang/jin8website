import { getStore } from '@netlify/blobs';

// One Netlify Blobs store, keyed by normalised phone number.
// Record shape: { name, phone, salt, hash, createdAt, lastLogin, logins }
//
// region:      ap-southeast-2 (Sydney) — keep guest data in Australia.
//              Netlify's default would be us-east-2. Do NOT change this
//              once real registrations exist: a region change does not
//              migrate data, the store would simply appear empty.
// consistency: strong — the duplicate check must always read the latest
//              write, not an edge-cached copy.
export function registrations() {
  return getStore({ name: 'registrations', region: 'ap-southeast-2', consistency: 'strong' });
}
