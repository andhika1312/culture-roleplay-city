const { getSupabase } = require('./_supabase');
const { json, handleOptions } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method tidak diizinkan.' });

  try {
    const supabase = getSupabase();

    const [teamRes, financeRes, expensesRes, updatesRes] = await Promise.all([
      supabase.from('team_members').select('*').order('role_group').order('sort_order'),
      supabase.from('city_finance').select('*').eq('id', 1).maybeSingle(),
      supabase.from('city_expenses').select('*').order('tanggal', { ascending: false }).limit(50),
      supabase.from('city_updates').select('*').order('created_at', { ascending: false }).limit(20)
    ]);

    if (teamRes.error) throw teamRes.error;
    if (financeRes.error) throw financeRes.error;
    if (expensesRes.error) throw expensesRes.error;
    if (updatesRes.error) throw updatesRes.error;

    return json(200, {
      team: teamRes.data || [],
      finance: financeRes.data || null,
      expenses: expensesRes.data || [],
      updates: updatesRes.data || []
    });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
