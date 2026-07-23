const bcrypt = require('bcryptjs');
const { getSupabase } = require('./_supabase');
const { signToken } = require('./_auth');
const { json, handleOptions } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method tidak diizinkan.' });

  try {
    const { username, password } = JSON.parse(event.body || '{}');
    if (!username || !password) {
      return json(400, { error: 'Username dan password wajib diisi.' });
    }

    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('dashboard_users')
      .select('*')
      .eq('username', username.trim())
      .maybeSingle();

    if (error) throw error;
    if (!user) return json(401, { error: 'Username atau password salah.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return json(401, { error: 'Username atau password salah.' });

    const token = signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name
    });

    return json(200, {
      token,
      user: {
        username: user.username,
        role: user.role,
        display_name: user.display_name
      }
    });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
