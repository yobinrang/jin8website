import { json } from '../lib/http.mjs';
import { readSession } from '../lib/session.mjs';
import { registrations } from '../lib/store.mjs';
import { formatPhone } from '../lib/phone.mjs';

// GET /api/content — the gated invitation content.
// Only returned when the request carries a valid session cookie AND the
// phone in that session still exists in the registrations store.

// ── Event copy (edit freely) ─────────────────────────────────────────────
const EVENT = {
  kicker: 'You’re invited',
  title: 'Soft Opening',
  date: 'Thursday 24 September 2026',
  time: 'From 6pm',
  address: '18B Rutland Road, Box Hill VIC 3128',
  mapsUrl: 'https://maps.google.com/?q=18B+Rutland+Road+Box+Hill+VIC+3128',
  intro: 'Before we open the door to Box Hill, we’re pouring for the people who got us here. You’re one of the first through it.',
  notes: [
    'Doors from 6pm. Come whenever suits and stay as long as you like.',
    'Standard prices are shown on the menu — a soft-opening discount comes off at the bar.',
    'This is a practice run for us. If something is slow or not quite right, tell us; that’s the point of the night.',
    'Please keep this link to yourself. It’s just for friends.',
  ],
  contact: 'hello@jin8bar.com',
  instagram: 'https://www.instagram.com/jin8_bar/',
};

// ── Menu ─────────────────────────────────────────────────────────────────
// Classics and Limited are empty until Robin sends the lists; the page hides
// any section with no items.
const MENU = {
  pricingNote: 'Soft-opening discount applied at the bar',
  sections: [
    {
      id: 'signature',
      label: 'Craft Cocktails',
      title: 'The <em>Signature</em> 8',
      sub: 'The ancient made new.',
      numbered: true,
      items: [
        { num: '01', name: 'Fén Jiǔ <em>Old Fashioned</em>', price: '$24', pour: 'Xinghuacun baijiu, rock sugar syrup, walnut bitters, dried tangerine peel', strength: 'Strong · Spirit-Forward' },
        { num: '02', name: 'The <em>Jin</em> Merchant', price: '$26', pour: 'Rye, aged Shanxi vinegar shrub, jujube honey, smoked walnut bitters', strength: 'Strong · Balanced' },
        { num: '03', name: 'Pingyao <em>Wall</em>', price: '$25', pour: 'Dark rum, Qingxu black vinegar reduction, five spice, smoked salt rim', strength: 'Medium · Savoury' },
        { num: '04', name: '<em>Wutai</em> Cloud', price: '$23', pour: 'Gin, snow fungus syrup, chrysanthemum, white grape, elderflower foam', strength: 'Light · Floral' },
        { num: '05', name: 'Yungang <em>Stone</em>', price: '$26', pour: 'Aged baijiu, osmanthus honey, lychee, a slow pour of aged vinegar', strength: 'Medium · Aromatic' },
        { num: '06', name: '<em>Hengshan</em> Sour', price: '$25', pour: 'Whisky, Shanxi millet vinegar, millet syrup, egg white, sesame oil drop', strength: 'Medium · Tart' },
        { num: '07', name: 'Taihang <em>Dusk</em>', price: '$27', pour: 'Mezcal, sea buckthorn, goji reduction, Sichuan pepper tincture', strength: 'Strong · Smoky' },
        { num: '08', name: 'Silk <em>Road</em> Martini', price: '$28', pour: 'Vodka, dry vermouth washed with Xinghuacun, saffron, caviar of black vinegar', strength: 'Strong · Dry' },
      ],
    },
    {
      id: 'classics',
      label: 'The Canon',
      title: '<em>Classics</em>',
      sub: 'Done properly. Stirred long, served cold.',
      numbered: false,
      items: [
        // { name: 'Negroni', price: '$22', pour: 'Gin, Campari, sweet vermouth' },
      ],
    },
    {
      id: 'limited',
      label: 'Soft Opening Only',
      title: '<em>Limited</em> Pours',
      sub: 'Here for the opening, and then gone.',
      numbered: false,
      items: [],
    },
  ],
};

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const session = readSession(req);
  if (!session) return json(401, { error: 'Not signed in.' });

  const rec = await registrations().get(session.p, { type: 'json' });
  if (!rec) return json(401, { error: 'Registration not found.' });

  return json(200, {
    guest: { name: rec.name, phone: formatPhone(rec.phone) },
    event: EVENT,
    menu: MENU,
  });
};

export const config = { path: '/api/content' };
