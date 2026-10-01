import { json } from '../lib/http.mjs';
import { buildMenu, MENU_ONLINE } from '../lib/menu.mjs';

// GET /api/menu — the public drinks list behind the QR code in the bar.
// No sign-in: anyone holding a phone at a table can read it. Same data as
// the gated invitation, so prices and wording can never disagree.

// kicker and title are HTML: the Jin 8 | 晋八 wordmark and a two-line title.
const HEADER = {
  kicker: '<span class="en">Jin 8</span> <span class="sep">|</span> <span class="han">晋八</span>',
  title: '<span class="pre">The Soft Opening</span><em>Menu</em>',
  sub: 'Extended soft opening',
};

const FOOTER = {
  card: 'Card only',
  food: 'Our food menu isn’t ready yet. We’re serving bar snacks tonight.',
  address: '18B Rutland Road, Box Hill VIC 3128',
  instagram: 'https://www.instagram.com/jin8_bar/',
  handle: '@jin8_bar',
};

// While the menu is offline, the QR cards still land somewhere helpful, and
// no drinks or prices leave the server.
const PAUSED = {
  sub: 'On paper for now',
  message: 'During our extended soft opening we’re pouring from a printed menu, with 15% off selected items. Ask the team for one.',
  home: { label: 'Visit jin8bar.com', href: '/' },
};

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });
  if (!MENU_ONLINE) {
    const { food, ...footer } = FOOTER;
    return json(200, { hidden: true, header: { ...HEADER, sub: PAUSED.sub }, paused: PAUSED, footer });
  }
  return json(200, { header: HEADER, menu: buildMenu({ revealed: true }), footer: FOOTER });
};

export const config = { path: '/api/menu' };
