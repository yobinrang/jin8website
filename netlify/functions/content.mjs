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
      'Cocktails, wine and beer are 25% off for the night. Back bar spirits and mocktails are priced as shown.',
      'Our food menu isn’t ready yet, so please don’t arrive on an empty stomach. We’ll be serving bar snacks.',
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
// Item fields: num, name, cn (汉字), pinyin, tag, desc (short story),
//              pour (flavour, opening · heart · backbone), strength (ABV and
//              allergens), price, noPrice.
// Prices below are the standard menu prices. The soft-opening discount is
// applied automatically for display, so guests see what they actually pay
// with the full price struck through beside it. Set DISCOUNT to 0 when the
// soft opening ends and the menu reverts to full prices on its own.
const DISCOUNT = 0.25;

function money(n) {
  return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

function withDiscount(item) {
  const m = /^\$(\d+(?:\.\d+)?)$/.exec(item.price || '');
  // noDiscount items (back bar spirits, mocktails) and non-numeric prices
  // such as "Ask us" are shown exactly as priced.
  if (!DISCOUNT || item.noDiscount || !m) return item;
  const full = Number(m[1]);
  return { ...item, price: money(full * (1 - DISCOUNT)), was: money(full) };
}

const MENU = {
  note: 'Soft opening discount · 25% off cocktails, wine and beer',
  priceHeader: 'Soft opening prices',
  sections: [
    {
      id: 'the8',
      label: 'Signature Cocktails',
      title: 'The <em>8</em>',
      sub: 'Our signatures, delivered in a new way.',
      numbered: true,
      placeholder: 'To be announced on the day of the soft opening.',
      items: [
        { num: '01', name: 'Spirits of Shanxi', cn: '醉太行', pinyin: 'Zuì Tài Háng', tag: 'The Genesis', price: '$32',
          desc: 'Named for the Taihang Mountains, where the terroir of Shanxi meets the glass.',
          pour: 'Chrysanthemum house soda · hawthorn, jujube, goji · house four-fenjiu blend' },
        { num: '02', name: 'The Offering', cn: '敬山河', pinyin: 'Jìng Shān Hé', tag: 'The Ritual', price: '$26',
          desc: 'After the old custom of pouring a drink to the earth and sky.',
          pour: 'Tart mandarin, citrus · chen pi brine, coriander, white pepper · cucumber, red fenjiu' },
        { num: '03', name: 'Live Long', cn: '长生', pinyin: 'Cháng Shēng', tag: 'The Awakening', price: '$26',
          desc: 'The first half of a blessing, built to wake the palate.',
          pour: 'White peach, fresh floral · earthy oolong, warming ginger, Martell VS · fenjiu Panama, vanilla oak, citrus',
          strength: '≈13% ABV' },
        { num: '04', name: 'Love Long', cn: '长情', pinyin: 'Cháng Qíng', tag: 'The Connection', price: '$28',
          desc: 'The second half of that blessing, deep and lingering.',
          pour: 'Red dragonfruit, soft floral · silken, tart ruby hibiscus · dry gin, blue fenjiu, botanicals',
          strength: '≈12% ABV · contains egg white' },
        { num: '05', name: 'Wongka', cn: '花样年华', pinyin: 'Huāyàng Niánhuá', tag: 'The Secret Recipe', price: '$28',
          desc: 'A slow-burning tribute to fleeting time, anchored by roasted cacao.',
          pour: 'Toasted cacao, smoke · soft spice, dark herbs · Panama black fenjiu 20 year, Punt e Mes',
          strength: '≈22% ABV' },
        { num: '06', name: 'Violet Haze', cn: '紫烟', pinyin: 'Zǐ Yān', tag: 'The Atmosphere', price: '$29',
          desc: 'Ink-wash painting meeting late-night neon.',
          pour: 'Floral, lemon myrtle · violette, Lillet Blanc · Panama fenjiu 20 year' },
        { num: '07', name: 'Floating Fields', cn: '云野', pinyin: 'Yún Yě', tag: 'The Escape', price: '$28',
          desc: 'A weightless pause before the night closes.',
          pour: 'Green, yuzu citrus · roasted rice, velvet matcha · Silk Road fenjiu, grain',
          strength: '≈17% ABV' },
        { num: '08', name: 'Sweet Home', cn: '故里', pinyin: 'Gù Lǐ', tag: 'The Reunion', price: '$26',
          desc: 'After tangyuan, the sweet rice balls eaten for family and harmony.',
          pour: 'Creamy coconut, glutinous rice · black sesame · red fenjiu, meijiu rose',
          strength: 'Contains sesame' },
      ],
    },
    {
      id: 'classics',
      label: 'The Canon',
      title: 'The <em>Classics</em>',
      sub: 'Tastes familiar to you.',
      numbered: false,
      placeholder: 'To be announced on the day of the soft opening.',
      items: [
        { name: 'Your favourite sour', price: '$24',
          pour: 'Fresh lemon, bright citrus · rich demerara, silken foam · Redbreast 12 year, aromatic bitters',
          strength: 'Contains egg white' },
        { name: 'Negroni', price: '$24',
          pour: 'Expressed orange peel, citrus oils · Campari, bittersweet herbal botanicals · Four Pillars gin, Carpano Antica' },
        { name: 'Margarita', price: '$24',
          pour: 'Crisp fresh lime, sea salt · bright agave, Cointreau · Cascahuín Blanco tequila' },
        { name: 'Espresso Martini', price: '$24',
          pour: 'Fresh espresso crema · Mr Black cold brew, dark cacao · Haku vodka, demerara' },
      ],
    },
    {
      id: 'rest',
      label: 'Also Pouring',
      title: 'The <em>Rest</em>',
      sub: 'Everything else behind the bar.',
      numbered: false,
      placeholder: 'To be announced on the day of the soft opening.',
      groups: [
        { title: 'Spirits', items: [
          { name: 'From the back bar', price: 'Ask us',
            desc: 'Ask the team what we’re pouring.',
            pour: 'Craft baijiu · single malts, agave, rums · the whole back bar',
            strength: 'Not part of the discount', noDiscount: true },
        ] },
        { title: 'Wine', items: [
          { name: 'Silver Heights ‘Last Warrior’ 2022', price: '$15',
            desc: 'Ningxia, China. Hand-harvested at the foot of the Helan Mountains.',
            pour: 'Wild-fermented, earthy red blend' },
        ] },
        { title: 'Beer', items: [
          { name: 'Old Snow', cn: '老雪花', pinyin: 'Lǎo Xuě Huā', price: '$14',
            pour: 'Crisp malt, light floral, clean and refreshing',
            strength: '4.7% · 640ml sharing bottle' },
        ] },
        { title: 'Mocktail', items: [
          { name: 'Made to your taste', price: '$10',
            desc: 'Tell us what you like and we’ll build it.',
            pour: 'Fresh fruit, citrus and botanicals · zero proof',
            strength: 'Not part of the discount', noDiscount: true },
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
    sections: MENU.sections.map((s) => {
      if (!ev.menuRevealed) return { ...s, items: [], groups: [] };
      return {
        ...s,
        items: (s.items || []).map(withDiscount),
        groups: (s.groups || []).map((g) => ({ ...g, items: g.items.map(withDiscount) })),
      };
    }),
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
