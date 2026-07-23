const { getSupabase } = require('./_supabase');
const { requireAuth } = require('./_auth');
const { json, handleOptions } = require('./_utils');
const { sendDashboardLog } = require('./_log-webhook');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method tidak diizinkan.' });

  const auth = requireAuth(event, ['founder', 'dev']);
  if (!auth.ok) return json(auth.status, { error: auth.message });

  try {
    const { kas_kota, pemasukan_bulan_ini, pengeluaran_bulan_ini, keterangan } = JSON.parse(event.body || '{}');

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('city_finance')
      .update({
        kas_kota,
        pemasukan_bulan_ini,
        pengeluaran_bulan_ini,
        keterangan,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.display_name
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;

    await sendDashboardLog({
      action: 'Update Data Keuangan',
      actor: auth.user.display_name,
      detail: `Kas kota: Rp${Number(kas_kota).toLocaleString('id-ID')} | Keterangan: ${keterangan || '-'}`
    });

    return json(200, { message: 'Data keuangan berhasil diperbarui.', finance: data });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
