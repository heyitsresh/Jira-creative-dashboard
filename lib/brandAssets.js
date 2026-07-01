// Per-brand visuals for the header banner that shows up on MASTER when
// exactly one brand pill is selected.
//
// - `domain`: used to pull a logo via Clearbit's free logo API
//   (logo.clearbit.com/<domain>) — no API key needed. Only filled in here
//   for brands we're confident about (well-known retailers); left blank for
//   the rest rather than guessing wrong and showing someone else's logo.
//   The banner already falls back to a colored initial badge if the logo
//   fails to load or isn't configured, so leaving this blank is safe.
// - `heroImage`: an optional product photo URL (e.g. a dress for David's
//   Bridal) shown on the right side of the banner. Nothing is auto-fetched
//   here — drop in your own hosted image URL for whichever brands you want
//   this for. Looks fine without one too.

export const BRAND_ASSETS = {
  "David's Bridal - AMZ": { domain: "davidsbridal.com", heroImage: null },
  "David's Bridal - WM": { domain: "davidsbridal.com", heroImage: null },
  "Pendleton": { domain: "pendleton-usa.com", heroImage: null },
  "Co2Lift": { domain: null, heroImage: null },
  "Studio Eclipse / Artisga Crafts": { domain: null, heroImage: null },
  "LMDC / La Maison du Choclat": { domain: null, heroImage: null },
  "My Protect Kit": { domain: null, heroImage: null },
  "Berri Organics": { domain: null, heroImage: null },
  "Byer of Maine": { domain: null, heroImage: null },
  "Voicegift": { domain: null, heroImage: null },
};

export function getBrandAssets(label) {
  return BRAND_ASSETS[label] || { domain: null, heroImage: null };
}
