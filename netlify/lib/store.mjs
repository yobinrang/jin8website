import { getStore } from '@netlify/blobs';

// One Netlify Blobs store per night (see events.mjs), keyed by normalised
// phone number.
// Record shape: { name, phone, salt, hash, createdAt, lastLogin, logins, indexed, feedback? }
//
// region:      ap-southeast-2 (Sydney) — keep guest data in Australia.
//              Netlify's default would be us-east-2. Do NOT change this
//              once real registrations exist: a region change does not
//              migrate data, the store would simply appear empty.
// consistency: strong — the duplicate check must always read the latest
//              write, not an edge-cached copy.
export function registrations(ev) {
  return getStore({ name: ev.store, region: 'ap-southeast-2', consistency: 'strong' });
}
