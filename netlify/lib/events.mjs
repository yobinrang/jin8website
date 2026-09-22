// The soft-opening nights. Each night has its own guest list (its own Blobs
// stores) and its own day-of switches. Edit, commit, push; Netlify redeploys
// in about 30 seconds.
//
//   menuRevealed  true  → guests see the drink lists
//                 false → each list says "To be announced on the day…"
//   feedbackOpen  true  → the feedback form works
//                 false → the panel says when feedback opens
//   capacity      most guests on that night's list; new numbers are refused
//                 once it's reached (people already on the list can still log in)
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
    capacity: 40,
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
    capacity: 40,
    menuRevealed: false,
    feedbackOpen: false,
    feedbackOpensOn: 'Sunday 27 September',
  },
};

export function fullMessage(ev) {
  return `Sorry, ${ev.name} is full. If you think you should be on the list, message hello@jin8bar.com.`;
}

// Which night a request is for: ?event=thu|sat. Defaults to Thursday.
export function getEvent(req) {
  const id = new URL(req.url).searchParams.get('event') || 'thu';
  return Object.prototype.hasOwnProperty.call(EVENTS, id) ? EVENTS[id] : null;
}
