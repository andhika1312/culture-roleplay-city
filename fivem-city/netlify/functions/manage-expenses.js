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
      const { tanggal, kategori, deskripsi, jumlah, tipe } = JSON.parse(event.body || '{}');
      if (!kategori || !deskripsi || jumlah == null || !tipe) {
        return json(400, { error: 'Kategori, deskripsi, jumlah, dan tipe wajib diisi.' });
      }
      const { data, error } = await supabase
        .from('city_expenses')
        .insert({
          tanggal: tanggal || new Date().toISOString().slice(0, 10),
          kategori,
          deskripsi,
          jumlah,
          tipe,
          created_by: auth.user.display_name
        })
        .select()
        .single();
      if (error) throw error;

      await sendDashboardLog({
        action: tipe === 'pengeluaran' ? 'Laporan Pengeluaran Baru' : 'Laporan Pemasukan Baru',
        actor: auth.user.display_name,
        detail: `${kategori} — ${deskripsi}: Rp${Number(jumlah).toLocaleString('id-ID')}`
      });

      return json(200, { message: 'Catatan berhasil ditambahkan.', expense: data });
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return json(400, { error: 'ID wajib diisi.' });
      const { error } = await supabase.from('city_expenses').delete().eq('id', id);
      if (error) throw error;

      await sendDashboardLog({
        action: 'Hapus Catatan Keuangan',
        actor: auth.user.display_name,
        detail: `ID: ${id}`
      });

      return json(200, { message: 'Catatan berhasil dihapus.' });
    }

    return json(405, { error: 'Method tidak diizinkan.' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
