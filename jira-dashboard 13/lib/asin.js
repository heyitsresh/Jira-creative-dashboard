// There's no structured "parent product" field in Jira for this, so the
// grouping key is pulled out of the task title itself: standard Amazon
// ASINs are 10 characters, almost always starting with "B0" (e.g.
// B0D1234567). If your titles use a different pattern — no "B0" prefix, a
// different bracket/prefix convention, etc. — adjust the regex below;
// everything else (the tab, the sidebar, the grouping) just reads whatever
// this function returns.

const ASIN_PATTERN = /\bB0[A-Z0-9]{8}\b/i;

export function extractAsin(text) {
  if (!text) return null;
  const match = text.match(ASIN_PATTERN);
  return match ? match[0].toUpperCase() : null;
}
