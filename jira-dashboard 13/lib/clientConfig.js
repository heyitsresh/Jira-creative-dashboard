// Whitelist of brands this dashboard should ever show. Every issue's raw
// Client value (customfield_10866) is matched against these patterns; any
// issue that matches none of them is dropped before it ever reaches the
// browser.
//
// Matching is case-insensitive substring/regex based (not exact-string)
// because we can't verify the literal values Jira stores for every brand.
// If a brand's tasks aren't showing up, or the wrong tasks are grouped
// together, this is the file to edit — add another `test` pattern to the
// relevant entry, or split/merge entries as needed.

export const BRANDS = [
  {
    id: "davids-bridal-amz",
    label: "David's Bridal - AMZ",
    test: (v) => /david.?s\s*bridal/i.test(v) && /\bamz\b|amazon/i.test(v),
  },
  {
    id: "davids-bridal-wm",
    label: "David's Bridal - WM",
    test: (v) => /david.?s\s*bridal/i.test(v) && /\bwm\b|walmart/i.test(v),
  },
  {
    id: "pendleton",
    label: "Pendleton",
    test: (v) => /pendleton/i.test(v),
  },
  {
    id: "co2lift",
    label: "Co2Lift",
    test: (v) => /co\s*2\s*lift/i.test(v),
  },
  {
    id: "studio-eclipse",
    label: "Studio Eclipse / Artisga Crafts",
    test: (v) => /studio\s*eclipse/i.test(v) || /artisga/i.test(v),
  },
  {
    id: "lmdc",
    label: "LMDC / La Maison du Choclat",
    test: (v) => /\blmdc\b/i.test(v) || /maison\s*du\s*choc/i.test(v),
  },
  {
    id: "my-protect-kit",
    label: "My Protect Kit",
    test: (v) => /my\s*protect\s*kit/i.test(v),
  },
  {
    id: "berri-organics",
    label: "Berri Organics",
    test: (v) => /berri\s*organics/i.test(v),
  },
  {
    id: "byer-of-maine",
    label: "Byer of Maine",
    test: (v) => /byer\s*of\s*maine/i.test(v),
  },
  {
    id: "voicegift",
    label: "Voicegift",
    test: (v) => /voice\s*gift/i.test(v),
  },
];

// Returns the matching brand's label, or null if the raw client value
// doesn't belong to any whitelisted brand.
export function matchBrand(rawClient) {
  if (!rawClient) return null;
  for (const brand of BRANDS) {
    if (brand.test(rawClient)) return brand.label;
  }
  return null;
}

export const BRAND_LABELS = BRANDS.map((b) => b.label);
