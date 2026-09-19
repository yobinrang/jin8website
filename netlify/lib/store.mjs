import { getStore } from '@netlify/blobs';

// One Netlify Blobs store, keyed by normalised phone number.
// Record shape: { name, phone, salt, hash, createdAt, lastLogin, logins }
export function registrations() {
  return getStore({ name: 'registrations', consistency: 'strong' });
}
