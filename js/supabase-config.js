/* js/supabase-config.js
   PUBLIC browser config. The URL + anon key are safe to expose (RLS protects
   the data). Mirror the same values that are in .env.local.

   ⚠️  Until you replace the placeholders below, the site automatically falls
   back to a local in-browser demo (localStorage) so every page keeps working
   exactly as before. */
window.SUPABASE_CONFIG = {
  url: 'https://wyvdwidioiixczjmiaez.supabase.co',
  anonKey: 'sb_publishable_njlmdQfKZWRQ1zj9DZBKQw_QCHteN2D',
};

/* AYM Rent Car's agency id - must match AGENCY_ID in seed.js. */
window.BESTORE_AGENCY_ID = '11111111-1111-1111-1111-111111111111';

/* AYM Rent Car's slug, used as the fallback when no subdomain is present
   (e.g. on localhost / Vercel preview URLs). */
window.BESTORE_AGENCY_SLUG = 'bestore-car';
