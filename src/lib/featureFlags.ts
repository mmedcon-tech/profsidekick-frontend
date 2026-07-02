// ─── Temporary UI visibility toggles ─────────────────────────────────────────
// Nav items whose href appears in this Set are hidden from the sidebar.
// Only applies to subscriber and publisher navs — admin is never affected.
//
// To restore everything at once: clear the Set below.
// To restore one item: comment out its line.

export const HIDDEN_NAV_HREFS = new Set<string>([
  // All items visible — simplified view is off
]);
