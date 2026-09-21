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
    'We’re pouring The 8 — our signature cocktails — plus a short list of classics.',
    'This is a practice run for us. If something is slow or not quite right, tell us; that’s the point of the night.',
    'Please keep this link to yourself. It’s just for friends.',
  ],
  contact: 'hello@jin8bar.com',
  instagram: 'https://www.instagram.com/jin8_bar/',
};

// ── Menu ─────────────────────────────────────────────────────────────────
// Two sections. No prices during the soft opening (add a `price` field to an
// item and it will render). The Classics list is pending from Robin; while a
// section has no items its `placeholder` line is shown instead (or the
// section is hidden if there is no placeholder either).
//
// Item fields: num, name, cn (汉字), pinyin, tag (e.g. "The Genesis"),
//              desc, and optionally price, pour, strength.
const MENU = {
  sections: [
    {
      id: 'the8',
      label: 'Signature Cocktails',
      title: 'The <em>8</em>',
      sub: 'A journey, in eight glasses.',
      numbered: true,
      items: [
        { num: '01', name: 'Spirits of Shanxi', cn: '醉太行', pinyin: 'Zuì Tài Háng', tag: 'The Genesis',
          desc: 'Named after the towering Taihang Mountains, this is a bold, unapologetic introduction to the complex, savoury depth of traditional northern spirits. It brings the raw, rugged terroir of Shanxi straight to the glass.' },
        { num: '02', name: 'The Offering', cn: '敬山河', pinyin: 'Jìng Shān Hé', tag: 'The Ritual',
          desc: 'Inspired by the ancient custom of pouring a drink to the earth and sky, this cocktail pays respect to the natural elements that define our bar. A grounded, elemental drink that bridges ancient tradition with modern craft.' },
        { num: '03', name: 'Live Long', cn: '长生', pinyin: 'Cháng Shēng', tag: 'The Awakening',
          desc: 'The first half of a traditional blessing. A bright, revitalising mix drawing on time-honoured botanicals. It is designed to awaken the palate and symbolise vitality and new beginnings.' },
        { num: '04', name: 'Love Long', cn: '长情', pinyin: 'Cháng Qíng', tag: 'The Connection',
          desc: 'The second half of the blessing. Where Live Long is bright, this drink is deep, lingering and romantic. It acts as the perfect counterpart, celebrating the enduring connections and conversations shared across the bar.' },
        { num: '05', name: 'Wongka', cn: '花样年华', pinyin: 'Huāyàng Niánhuá', tag: 'The Secret Recipe',
          desc: 'A slow-burning tribute to fleeting time. This heavy, spirit-forward classic is anchored by roasted cacao — a touch of eccentric magic hidden beneath a dark, moody, cinematic exterior.' },
        { num: '06', name: 'Violet Haze', cn: '紫烟', pinyin: 'Zǐ Yān', tag: 'The Atmosphere',
          desc: 'Evoking the ethereal, flowing energy of traditional ink-wash paintings colliding with late-night neon. A visually striking, highly aromatic drink that drifts softly across the palate like evening mist.' },
        { num: '07', name: 'Floating Fields', cn: '云野', pinyin: 'Yún Yě', tag: 'The Escape',
          desc: 'A delicate, weightless palate cleanser before the night concludes. Inspired by sprawling eastern landscapes, it offers a surreal, floating sensation that elevates the senses.' },
        { num: '08', name: 'Sweet Home', cn: '故里', pinyin: 'Gù Lǐ', tag: 'The Reunion',
          desc: 'The perfect closing scene. Inspired by tangyuan — the traditional sweet glutinous rice balls eaten to symbolise harmony and family. A rich, comforting, dessert-like finish that brings the entire journey full circle.' },
      ],
    },
    {
      id: 'classics',
      label: 'The Canon',
      title: 'The <em>Classics</em>',
      sub: 'Done properly. Stirred long, served cold.',
      numbered: false,
      placeholder: 'The list is being finalised — it will be here before Thursday.',
      items: [
        // { name: 'Negroni', pour: 'Gin, Campari, sweet vermouth' },
      ],
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
    session: { expiresAt: session.e * 1000 },   // ms epoch; the page signs itself out at this moment
    event: EVENT,
    menu: MENU,
  });
};

export const config = { path: '/api/content' };
