const { getSupabase } = require('./_supabase');
const { requireAuth } = require('./_auth');
const { json, handleOptions } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method tidak diizinkan.' });

  const auth = requireAuth(event, ['founder', 'dev', 'admin']);
  if (!auth.ok) return json(auth.status, { error: auth.message });

  try {
    const supabase = getSupabase();
    const formType = event.queryStringParameters?.form_type;

    let query = supabase
      .from('submissions_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (formType) query = query.eq('form_type', formType);

    const { data, error } = await query;
    if (error) throw error;

    return json(200, { submissions: data || [] });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
