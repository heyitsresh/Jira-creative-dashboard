// People pinned to the header bar for one-click access to their open tasks.
// Matching is a case-insensitive "does the assignee's display name contain
// this" check, so slight spelling differences (Shiela vs Sheila) against
// what's actually in Jira still resolve — edit the list below if a name
// isn't matching who you expect.

export const PINNED_PEOPLE = ["Resh", "Shiela", "Vannessa"];

// Given the list of distinct assignee display names currently in the issue
// set, resolve each pinned name to the best-matching real display name (or
// null if nobody matches yet).
export function resolvePinnedPeople(assigneeNames) {
  return PINNED_PEOPLE.map((name) => {
    const match = assigneeNames.find((a) =>
      a.toLowerCase().includes(name.toLowerCase())
    );
    return { configuredName: name, resolvedName: match || null };
  });
}
