const { getSupabase } = require('./_supabase');
const { requireAuth } = require('./_auth');
const { json, handleOptions } = require('./_utils');
const { sendDashboardLog } = require('./_log-webhook');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  const auth = requireAuth(event, ['founder', 'dev']);
  if (!auth.ok) return json(auth.status, { error: auth.message });

  const supabase = getSupabase();

  try {
    if (event.httpMethod === 'POST') {
      const { judul, isi, tipe } = JSON.parse(event.body || '{}');
      if (!judul || !isi) return json(400, { error: 'Judul dan isi wajib diisi.' });

      const { data, error } = await supabase
        .from('city_updates')
        .insert({ judul, isi, tipe: tipe || 'info', created_by: auth.user.display_name })
        .select()
        .single();
      if (error) throw error;

      await sendDashboardLog({
        action: 'Update/Info Kota Baru',
        actor: auth.user.display_name,
        detail: judul
      });

      return json(200, { message: 'Update berhasil ditambahkan.', update: data });
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return json(400, { error: 'ID wajib diisi.' });
      const { error } = await supabase.from('city_updates').delete().eq('id', id);
      if (error) throw error;
      return json(200, { message: 'Update berhasil dihapus.' });
    }

    return json(405, { error: 'Method tidak diizinkan.' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
