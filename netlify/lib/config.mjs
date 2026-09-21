// Day-of switches. Edit, commit, push — Netlify redeploys in ~30s.

// true → guests see the drink lists inside "The 8" / "The Classics".
// false → each list shows "To be announced on the day of the soft opening."
export const MENU_REVEALED = false;

// true → the feedback panel shows the form and /api/feedback accepts answers.
// false → the panel says when feedback opens; /api/feedback refuses.
export const FEEDBACK_OPEN = false;
export const FEEDBACK_OPENS_ON = 'Friday 25 September';
