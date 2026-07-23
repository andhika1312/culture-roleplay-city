const bcrypt = require('bcryptjs');
const { getSupabase } = require('./_supabase');
const { json, handleOptions } = require('./_utils');

// Function ini dipakai untuk MEMBUAT akun dashboard baru (founder/dev/admin).
// Dilindungi oleh SETUP_KEY (Environment Variable rahasia di Netlify) supaya
// tidak sembarang orang bisa membuat akun dashboard dari internet.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method tidak diizinkan.' });

  try {
    const setupKey = process.env.SETUP_KEY;
    if (!setupKey) {
      return json(500, { error: 'SETUP_KEY belum diatur di Environment Variables Netlify.' });
    }

    const { setup_key, username, password, role, display_name } = JSON.parse(event.body || '{}');

    if (setup_key !== setupKey) {
      return json(403, { error: 'Setup key salah.' });
    }
    if (!username || !password || !role || !display_name) {
      return json(400, { error: 'Semua field wajib diisi (username, password, role, display_name).' });
    }
    if (!['founder', 'dev', 'admin'].includes(role)) {
      return json(400, { error: 'Role harus salah satu dari: founder, dev, admin.' });
    }
    if (password.length < 8) {
      return json(400, { error: 'Password minimal 8 karakter.' });
    }

    const supabase = getSupabase();
    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('dashboard_users')
      .insert({ username: username.trim(), password_hash, role, display_name })
      .select('id, username, role, display_name')
      .single();

    if (error) {
      if (error.code === '23505') {
        return json(409, { error: 'Username sudah dipakai.' });
      }
      throw error;
    }

    return json(200, { message: 'Akun berhasil dibuat.', user: data });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
