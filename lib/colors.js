// Deterministic, vibrant "material dashboard" color palette shared by every
// chart/pill so the same assignee/status/client/priority always renders in
// the same color.
export const PALETTE = [
  "#7b61ff", // violet
  "#fb8c00", // orange
  "#2dce89", // green
  "#f5365c", // red/pink
  "#11cdef", // cyan
  "#5e72e4", // indigo
  "#fbb140", // amber
  "#e14eca", // magenta
  "#2bffc6", // mint
  "#ffd600", // yellow
  "#8965e0", // purple
  "#00bcd4", // teal
];

// Gradient pairs (start, end) used for stat cards / sidebar accents,
// matching the same hues as PALETTE above.
export const GRADIENTS = {
  violet: ["#7b61ff", "#9c6bff"],
  orange: ["#fb8c00", "#ffa726"],
  green: ["#2dce89", "#2dceb5"],
  red: ["#f5365c", "#f56036"],
  cyan: ["#11cdef", "#1171ef"],
  indigo: ["#5e72e4", "#825ee4"],
};

export function colorForKey(key) {
  const str = String(key ?? "Unknown");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx];
}

export const DUE_BUCKET_COLORS = {
  Overdue: "#dc2626",
  Today: "#d97706",
  "This Week": "#0ea5e9",
  "Next Week": "#4f46e5",
  Later: "#65a30d",
  "No Due Date": "#94a3b8",
};
