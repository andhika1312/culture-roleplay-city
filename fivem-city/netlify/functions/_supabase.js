const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diatur di Environment Variables Netlify.');
  }
  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

module.exports = { getSupabase };
