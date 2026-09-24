import { json } from '../lib/http.mjs';
import { buildMenu } from '../lib/menu.mjs';

// GET /api/menu — the public drinks list behind the QR code in the bar.
// No sign-in: anyone holding a phone at a table can read it. Same data as
// the gated invitation, so prices and wording can never disagree.

const HEADER = {
  kicker: 'Jin 8 · Box Hill',
  title: 'The <em>Menu</em>',
  sub: 'Soft opening',
};

const FOOTER = {
  card: 'Card only',
  food: 'Our food menu isn’t ready yet. We’re serving bar snacks tonight.',
  address: '18B Rutland Road, Box Hill VIC 3128',
  instagram: 'https://www.instagram.com/jin8_bar/',
  handle: '@jin8_bar',
};

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });
  return json(200, { header: HEADER, menu: buildMenu({ revealed: true }), footer: FOOTER });
};

export const config = { path: '/api/menu' };
