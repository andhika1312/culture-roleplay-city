const { getSupabase } = require('./_supabase');
const { requireAuth } = require('./_auth');
const { json, handleOptions } = require('./_utils');
const { sendDashboardLog } = require('./_log-webhook');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  const auth = requireAuth(event, ['founder', 'dev', 'admin']);
  if (!auth.ok) return json(auth.status, { error: auth.message });

  const supabase = getSupabase();
  const isFullAccess = auth.user.role === 'founder' || auth.user.role === 'dev';

  try {
    if (event.httpMethod === 'POST') {
      const { id, role_group, name, discord_tag, photo_url, sort_order } = JSON.parse(event.body || '{}');
      if (!role_group || !name) {
        return json(400, { error: 'Role group dan nama wajib diisi.' });
      }

      if (id) {
        // Update entri yang sudah ada
        const { data: existing, error: fetchErr } = await supabase
          .from('team_members')
          .select('owner_username')
          .eq('id', id)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!existing) return json(404, { error: 'Data tidak ditemukan.' });

        // Admin (non full-access) hanya boleh edit entri miliknya sendiri
        if (!isFullAccess && existing.owner_username !== auth.user.username) {
          return json(403, { error: 'Anda hanya bisa mengedit susunan tim milik Anda sendiri.' });
        }

        const { data, error } = await supabase
          .from('team_members')
          .update({
            role_group,
            name,
            discord_tag,
            photo_url,
            sort_order: sort_order ?? 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;

        await sendDashboardLog({
          action: 'Edit Susunan Tim',
          actor: auth.user.display_name,
          detail: `${name} (${role_group})`
        });

        return json(200, { message: 'Data tim berhasil diperbarui.', member: data });
      } else {
        // Buat entri baru — admin non-full-access entri barunya otomatis jadi miliknya
        const owner = isFullAccess ? null : auth.user.username;
        const { data, error } = await supabase
          .from('team_members')
          .insert({
            role_group,
            name,
            discord_tag,
            photo_url,
            sort_order: sort_order ?? 0,
            owner_username: owner
          })
          .select()
          .single();
        if (error) throw error;

        await sendDashboardLog({
          action: 'Tambah Anggota Tim',
          actor: auth.user.display_name,
          detail: `${name} (${role_group})`
        });

        return json(200, { message: 'Anggota tim berhasil ditambahkan.', member: data });
      }
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return json(400, { error: 'ID wajib diisi.' });

      const { data: existing, error: fetchErr } = await supabase
        .from('team_members')
        .select('owner_username, name')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!existing) return json(404, { error: 'Data tidak ditemukan.' });

      if (!isFullAccess && existing.owner_username !== auth.user.username) {
        return json(403, { error: 'Anda hanya bisa menghapus susunan tim milik Anda sendiri.' });
      }

      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;

      await sendDashboardLog({
        action: 'Hapus Anggota Tim',
        actor: auth.user.display_name,
        detail: existing.name
      });

      return json(200, { message: 'Anggota tim berhasil dihapus.' });
    }

    return json(405, { error: 'Method tidak diizinkan.' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
