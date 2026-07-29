// Jira status names come back however the workspace admin typed them —
// some ALL CAPS ("IN PROGRESS"), some Title Case ("Intake Review"). This
// normalizes display only (never the underlying value used for filtering,
// coloring, or drilling) to a consistent, calmer sentence case.
export function toSentenceCase(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str) return str;
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
