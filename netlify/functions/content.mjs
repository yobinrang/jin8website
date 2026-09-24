import { json } from '../lib/http.mjs';
import { readSession } from '../lib/session.mjs';
import { registrations } from '../lib/store.mjs';
import { formatPhone } from '../lib/phone.mjs';
import { getEvent } from '../lib/events.mjs';
import { buildMenu } from '../lib/menu.mjs';

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

  const menu = buildMenu({ revealed: ev.menuRevealed });

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
