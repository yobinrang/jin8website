// The drinks list, shared by the gated invitation (/api/content) and the
// public menu people scan in the bar (/api/menu). One source of truth, so
// the two can never drift apart.

// ── Digital menu on/off ──────────────────────────────────────────────────
// One switch for the QR page (/menu), its data (/api/menu) and the menu
// section of the invitation pages. false shows a "printed menu for now" note
// instead and keeps the drinks off the server's responses.
// On again from 1 Oct 2026 (Robin), with the extended soft opening prices.
export const MENU_ONLINE = true;

// ── Menu (same both nights) ──────────────────────────────────────────────
// Shown on the page above the lists, even while the lists are hidden.
// The drink data stays here so menuRevealed can be flipped on the day.
// A section has either `items` or `groups: [{ title, items }]`.
// Item fields: num, name, cn (汉字), pinyin, tag, desc (short story),
//              pour (flavour, opening · heart · backbone), strength (allergens
//              and serving notes; no ABV, per Robin 2 Oct 2026), price, noPrice.
// Prices below are the standard menu prices. The soft-opening discount is
// applied automatically for display, rounded down to the whole dollar, so
// guests see what they actually pay. (`was` still carries the full price;
// the QR menu no longer shows it.) Set DISCOUNT to 0 when the soft opening
// ends and the menu reverts to full prices on its own.
const DISCOUNT = 0.15;   // extended soft opening, from Thu 1 Oct 2026 (was 0.25 for the invite nights)

function money(n) {
  return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

function withDiscount(item) {
  const m = /^\$(\d+(?:\.\d+)?)$/.exec(item.price || '');
  // noDiscount items (back bar spirits, mocktails) and non-numeric prices
  // such as "Ask us" are shown exactly as priced.
  if (!DISCOUNT || item.noDiscount || !m) return item;
  const full = Number(m[1]);
  // Round to cents first so float noise can't drop a dollar (17.000000001 → 16).
  const off = Math.floor(Math.round(full * (1 - DISCOUNT) * 100) / 100);
  return { ...item, price: money(off), was: money(full) };
}

const MENU = {
  note: '15% off',
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
          pour: 'Orange marmalade, bright citrus · chen pi brine, coriander, white pepper · cucumber, red fenjiu' },
        { num: '03', name: 'Live Long', cn: '长生', pinyin: 'Cháng Shēng', tag: 'The Awakening', price: '$26',
          desc: 'The first half of a blessing, built to wake the palate.',
          pour: 'White peach, fresh floral · earthy oolong, warming ginger, Martell VS · fenjiu Panama, vanilla oak, citrus',
          strength: 'Contains dairy' },   // milk-clarified; the clear drink still carries milk traces
        { num: '04', name: 'Love Long', cn: '长情', pinyin: 'Cháng Qíng', tag: 'The Connection', price: '$28',
          desc: 'The second half of that blessing, deep and lingering.',
          // No egg white (Robin, 4 Oct 2026; the recipe's "dry shake the egg white" step is an error).
          pour: 'Red dragonfruit, soft floral · silken, tart ruby hibiscus · sloe gin, blue fenjiu, botanicals' },
        { num: '05', name: 'Wongka', cn: '花样年华', pinyin: 'Huāyàng Niánhuá', tag: 'The Secret Recipe', price: '$28',
          desc: 'A slow-burning tribute to fleeting time, anchored by roasted cacao.',
          pour: 'Toasted cacao, smoke · soft spice, dark herbs · Panama black fenjiu 20 year, Punt e Mes' },
        { num: '06', name: 'Violet Haze', cn: '紫烟', pinyin: 'Zǐ Yān', tag: 'The Atmosphere', price: '$29',
          desc: 'Ink-wash painting meeting late-night neon.',
          pour: 'Floral, lemon myrtle · violette, Lillet Blanc · Panama fenjiu 20 year' },
        { num: '07', name: 'Floating Fields', cn: '云野', pinyin: 'Yún Yě', tag: 'The Escape', price: '$28',
          desc: 'A weightless pause before the night closes.',
          pour: 'Green tea, roasted rice · velvet matcha cream · Silk Road fenjiu, grain',   // no yuzu for now (Robin, 4 Oct)
          strength: 'Contains dairy' },
        { num: '08', name: 'Sweet Home', cn: '故里', pinyin: 'Gù Lǐ', tag: 'The Reunion', price: '$26',
          desc: 'After tangyuan, the sweet rice balls eaten for family and harmony.',
          pour: 'Creamy coconut, ruby grapefruit · black sesame, glutinous rice · rose fenjiu',
          strength: 'Contains sesame' },
      ],
    },
    {
      id: 'classics',
      label: 'The Canon',
      title: 'The <em>Classics</em>',
      sub: 'Tastes familiar to you. Don’t see yours? Just ask the bar.',
      numbered: false,
      placeholder: 'To be announced on the day of the soft opening.',
      items: [
        { name: 'Your Favourite Sour', price: '$24',
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
          // Silver Heights 'Last Warrior' 2022 ($15) is out of stock. Robin: "just say ask the team".
          { name: 'By the glass', desc: 'Ask the team.', noPrice: true },
        ] },
        { title: 'Beer', items: [
          { name: 'Old Snow', cn: '老雪花', pinyin: 'Lǎo Xuě Huā', price: '$14',
            pour: 'Crisp malt, light floral, clean and refreshing',
            strength: '640ml sharing bottle' },
        ] },
        { title: 'Mocktail', items: [
          { name: 'Made to your taste', price: '$10',
            desc: 'Tell us what you like and we’ll build it.',
            pour: 'Fresh fruit, citrus and botanicals · zero proof',
            noDiscount: true },   // still $10 flat; the label was removed (Robin, 4 Oct 2026)
        ] },
      ],
    },
  ],
};

// Returns the menu ready to render. `revealed: false` empties every list so
// the invitation can hide the drinks until the day.
export function buildMenu({ revealed = true } = {}) {
  return {
    ...MENU,
    sections: MENU.sections.map((s) => {
      if (!revealed) return { ...s, items: [], groups: [] };
      return {
        ...s,
        items: (s.items || []).map(withDiscount),
        groups: (s.groups || []).map((g) => ({ ...g, items: g.items.map(withDiscount) })),
      };
    }),
  };
}

export { MENU, DISCOUNT };
