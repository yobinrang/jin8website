import { json } from '../lib/http.mjs';
import { readSession } from '../lib/session.mjs';
import { registrations } from '../lib/store.mjs';
import { formatPhone } from '../lib/phone.mjs';
import { getEvent } from '../lib/events.mjs';

// GET /api/content?event=thu|sat — the gated invitation content.
// Only returned when the request carries a valid session cookie for that
// night AND the phone in it is on that night's list.

// ── Event copy (edit freely; dates and switches live in events.mjs) ──────
function eventCopy(ev) {
  return {
    kicker: 'You’re invited',
    title: 'Soft Opening',
    date: ev.date,
    time: ev.time,
    address: '18B Rutland Road, Box Hill VIC 3128',
    mapsUrl: 'https://maps.google.com/?q=18B+Rutland+Road+Box+Hill+VIC+3128',
    intro: 'Thank you for being here from day one.',
    notes: [
      `Doors open at ${ev.doors}. Come whenever suits you.`,
      'You’ll get a first look at our signatures, plus a short list of classics.',
      'We’re still testing how the bar runs, so bear with us while we get it right.',
      'The soft opening is invite only, and the list is closed.',
    ],
    contact: 'hello@jin8bar.com',
    instagram: 'https://www.instagram.com/jin8_bar/',
  };
}

// ── About the bar ────────────────────────────────────────────────────────
const ABOUT = {
  label: 'Jin 8',
  title: 'Where this <em>goes</em>',
  body: 'Jin 8 began in the inner cities of China. Here, in this bar, the journey puts down roots and grows. One day, we hope, it reaches the world stage. None of that happens without you in the room.',
};

// ── Menu (same both nights) ──────────────────────────────────────────────
// Shown on the page above the lists, even while the lists are hidden.
// The drink data stays here so menuRevealed can be flipped on the day.
// A section has either `items` or `groups: [{ title, items }]`.
// Item fields: num, name, cn (汉字), pinyin, tag, desc, price, noPrice.
const MENU = {
  note: '25% off all drinks for the soft opening',
  sections: [
    {
      id: 'the8',
      label: 'Signature Cocktails',
      title: 'The <em>8</em>',
      sub: 'Our signatures, delivered in a new way.',
      numbered: true,
      placeholder: 'To be announced on the day of the soft opening.',
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
          desc: 'A slow-burning tribute to fleeting time. This heavy, spirit-forward classic is anchored by roasted cacao, a touch of eccentric magic hidden beneath a dark, moody, cinematic exterior.' },
        { num: '06', name: 'Violet Haze', cn: '紫烟', pinyin: 'Zǐ Yān', tag: 'The Atmosphere',
          desc: 'Evoking the ethereal, flowing energy of traditional ink-wash paintings colliding with late-night neon. A visually striking, highly aromatic drink that drifts softly across the palate like evening mist.' },
        { num: '07', name: 'Floating Fields', cn: '云野', pinyin: 'Yún Yě', tag: 'The Escape',
          desc: 'A delicate, weightless palate cleanser before the night concludes. Inspired by sprawling eastern landscapes, it offers a surreal, floating sensation that elevates the senses.' },
        { num: '08', name: 'Sweet Home', cn: '故里', pinyin: 'Gù Lǐ', tag: 'The Reunion',
          desc: 'The perfect closing scene. Inspired by tangyuan, the traditional sweet glutinous rice balls eaten to symbolise harmony and family. A rich, comforting, dessert-like finish that brings the entire journey full circle.' },
      ],
    },
    {
      id: 'classics',
      label: 'The Canon',
      title: 'The <em>Classics</em>',
      sub: 'Tastes familiar to you.',
      numbered: false,
      placeholder: 'To be announced on the day of the soft opening.',
      groups: [
        { title: 'Cocktails', items: [
          { name: 'Sour', desc: 'With the spirit of your choice.' },
          { name: 'Negroni' },
          { name: 'Margarita' },
          { name: 'Espresso Martini' },
        ] },
        { title: 'Spirits', items: [
          { name: 'From the back bar', desc: 'Ask the team what we’re pouring.', noPrice: true },
        ] },
        { title: 'Wine', items: [
          { name: 'Last Warrior' },
        ] },
        { title: 'Beer', items: [
          { name: 'Old Snow' },
        ] },
        { title: 'Mocktail', items: [
          { name: 'Bartender’s choice', desc: 'Made to your taste.' },
        ] },
      ],
    },
  ],
};

// ── Feedback panel copy ──────────────────────────────────────────────────
function feedbackCopy(ev) {
  return {
    label: 'After the night',
    title: 'Tell us how it <em>was</em>',
    button: 'Leave feedback',
    closedText: `Feedback opens on ${ev.feedbackOpensOn}, the day after. We’ll ask about the drinks, the service, the venue and anything else on your mind.`,
    areas: [
      { id: 'drinks', title: 'The drinks', sub: 'Our signatures, overall', prompt: 'What stood out? What would you change?' },
      { id: 'service', title: 'Service', sub: 'How we looked after you', prompt: 'Anything we should keep doing, or stop?' },
      { id: 'venue', title: 'Venue & operations', sub: 'The room, the pace, the flow', prompt: 'What worked, what didn’t?' },
    ],
    otherPrompt: 'Anything else?',
    thanks: 'Thank you. That helps more than you know.',
    open: ev.feedbackOpen,
    opensOn: ev.feedbackOpensOn,
  };
}

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });
  const ev = getEvent(req);
  if (!ev) return json(400, { error: 'Unknown event.' });

  const session = readSession(req, ev.id);
  if (!session) return json(401, { error: 'Not signed in.' });

  const rec = await registrations(ev).get(session.p, { type: 'json' });
  if (!rec) return json(401, { error: 'Registration not found.' });

  const menu = {
    ...MENU,
    sections: MENU.sections.map((s) => (ev.menuRevealed ? s : { ...s, items: [], groups: [] })),
  };

  return json(200, {
    night: { id: ev.id, name: ev.name },
    guest: { name: rec.name, phone: formatPhone(rec.phone), feedback: rec.feedback ?? null },
    session: { expiresAt: session.e * 1000 },   // ms epoch; the page signs itself out at this moment
    event: eventCopy(ev),
    about: ABOUT,
    menu,
    feedback: feedbackCopy(ev),
  });
};

export const config = { path: '/api/content' };
