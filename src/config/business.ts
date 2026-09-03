/**
 * The few pieces of "how to work with us" copy that both the in-app
 * BusinessScreen and the public `/advertise/` webpage need to agree on.
 * Kept as one small module (not scattered string literals) so updating a
 * link/price stance later means one edit, not a hunt across two codebases
 * (this app + firebase/public's static HTML, which can't import this file
 * directly — keep that page's copy in sync by hand, see its own comment).
 *
 * SUBMISSION_FORM_URL is a placeholder — see README's "Featured/network
 * game submissions" section for the exact steps to create the real Google
 * Form, then paste its share link here (and into
 * firebase/public/advertise/index.html's matching href).
 */
export const SUBMISSION_FORM_URL = 'https://forms.gle/REPLACE_WITH_YOUR_FORM_ID'

export const BUSINESS_CONTACT_EMAIL = 'dejanradoman00@gmail.com'

/**
 * Presentational only — never read by any pricing/billing code. Promo
 * terms are still set per-campaign via `addPromoGame` (see
 * firebase/FIREBASE_SCHEMA.md); this is just what the submission/business
 * copy tells a visitor before they reach out.
 */
export const FEATURED_IS_FREE_DURING_EARLY_ACCESS = true
