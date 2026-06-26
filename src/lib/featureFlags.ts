// ─── Temporary UI visibility toggles ─────────────────────────────────────────
// Nav items whose href appears in this Set are hidden from the sidebar.
// Only applies to subscriber and publisher navs — admin is never affected.
//
// To restore everything at once: clear the Set below.
// To restore one item: comment out its line.

export const HIDDEN_NAV_HREFS = new Set<string>([
  // ── Subscriber ──────────────────────────────────────────────────────────────
  '/subscriber/marketplace',   // Marketplace
  '/subscriber/my-avatars',    // My Avatars
  '/subscriber/history',       // Learning History
  '/billing',                  // Wallet

  // ── Publisher ───────────────────────────────────────────────────────────────
  '/publisher/dashboard',      // Dashboard
  '/publisher/avatars',        // My Avatars
]);
