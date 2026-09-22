// The soft-opening nights. Each night has its own guest list (its own Blobs
// stores) and its own day-of switches. Edit, commit, push; Netlify redeploys
// in about 30 seconds.
//
//   menuRevealed  true  → guests see the drink lists
//                 false → each list says "To be announced on the day…"
//   feedbackOpen  true  → the feedback form works
//                 false → the panel says when feedback opens
//
// Thursday keeps the original store names because they already hold live data.
export const EVENTS = {
  thu: {
    id: 'thu',
    name: 'Thursday',
    date: 'Thursday 24 September 2026',
    time: 'From 7pm',
    doors: '7',
    store: 'registrations',
    indexStore: 'registrations-index',
    menuRevealed: false,
    feedbackOpen: false,
    feedbackOpensOn: 'Friday 25 September',
  },
  sat: {
    id: 'sat',
    name: 'Saturday',
    date: 'Saturday 26 September 2026',
    time: 'From 7pm',
    doors: '7',
    store: 'registrations-sat',
    indexStore: 'registrations-sat-index',
    menuRevealed: false,
    feedbackOpen: false,
    feedbackOpensOn: 'Sunday 27 September',
  },
};

// Which night a request is for: ?event=thu|sat. Defaults to Thursday.
export function getEvent(req) {
  const id = new URL(req.url).searchParams.get('event') || 'thu';
  return Object.prototype.hasOwnProperty.call(EVENTS, id) ? EVENTS[id] : null;
}
