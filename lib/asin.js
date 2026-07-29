// There's no structured "parent product" field in Jira for this, so the
// grouping key is pulled out of the task title itself: standard Amazon
// ASINs are 10 characters, almost always starting with "B0" (e.g.
// B0D1234567). If your titles use a different pattern — no "B0" prefix, a
// different bracket/prefix convention, etc. — adjust the regex below;
// everything else (the tab, the sidebar, the grouping) just reads whatever
// this function returns.

// Word-boundary (\b) treats underscores as "word" characters, so it fails
// to match an ASIN that's glued to the rest of the title with an
// underscore (a common convention — e.g. "Listing Attributes_B0D1234567"),
// since there's no \b between "_" and "B". These lookarounds only reject
// adjacent letters/digits, so underscores, spaces, brackets, hyphens, etc.
// all count as valid boundaries.
const ASIN_PATTERN = /(?<![A-Z0-9])B0[A-Z0-9]{8}(?![A-Z0-9])/i;

export function extractAsin(text) {
  if (!text) return null;
  const match = text.match(ASIN_PATTERN);
  return match ? match[0].toUpperCase() : null;
}
