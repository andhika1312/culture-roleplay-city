const { getSupabase } = require('./_supabase');
const { json, handleOptions } = require('./_utils');

// Peta jenis form -> nama Environment Variable webhook Discord
const WEBHOOK_MAP = {
  admin: 'WEBHOOK_ADMIN',
  polisi: 'WEBHOOK_POLISI',
  ems: 'WEBHOOK_EMS',
  pedagang: 'WEBHOOK_PEDAGANG',
  pemerintah: 'WEBHOOK_PEMERINTAH',
  mekanik: 'WEBHOOK_MEKANIK',
  bahamas: 'WEBHOOK_BAHAMAS',
  media: 'WEBHOOK_MEDIA'
};

const LABEL_MAP = {
  admin: 'Pendaftaran Admin',
  polisi: 'Whitelist Kepolisian',
  ems: 'Whitelist EMS',
  pedagang: 'Whitelist Pedagang',
  pemerintah: 'Whitelist Pemerintah',
  mekanik: 'Whitelist Mekanik',
  bahamas: 'Whitelist Bahamas',
  media: 'Whitelist Media'
};

const COLOR_MAP = {
  admin: 15105570,   // orange
  polisi: 3447003,    // blue
  ems: 15158332,      // red
  pedagang: 3066993,  // green
  pemerintah: 10181046, // purple
  mekanik: 9807270,   // gray
  bahamas: 1752220,   // teal
  media: 15277667     // pink
};

function buildEmbed(formType, data) {
  const fields = Object.entries(data)
    .filter(([key]) => key !== 'form_type')
    .map(([key, value]) => ({
      name: humanizeKey(key),
      value: String(value || '-').slice(0, 1000) || '-',
      inline: String(value || '').length < 40
    }));

  return {
    embeds: [
      {
        title: `📋 ${LABEL_MAP[formType] || formType}`,
        color: COLOR_MAP[formType] || 5793266,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'Portal Pendaftaran Kota' }
      }
    ]
  };
}

function humanizeKey(key) {
  const map = {
    nama_ooc: 'Nama OOC',
    umur: 'Umur',
    tanggal_lahir: 'Tanggal Lahir',
    kesibukan: 'Kesibukan',
    nama_discord: 'Nama Discord',
    pengalaman_rp: 'Pengalaman RP',
    pengalaman_admin: 'Pengalaman Admin',
    alasan: 'Alasan Mendaftar',
    nama_karakter: 'Nama Karakter IC',
    alasan_whitelist: 'Alasan Ingin Whitelist',
    komitmen: 'Komitmen Waktu',
    kontak: 'Kontak Lain'
  };
  if (map[key]) return map[key];
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method tidak diizinkan.' });

  try {
    const body = JSON.parse(event.body || '{}');
    const { form_type, ...data } = body;

    if (!form_type || !WEBHOOK_MAP[form_type]) {
      return json(400, { error: 'Jenis formulir tidak valid.' });
    }

    // Validasi dasar: semua value harus string/number, tidak boleh kosong semua
    const hasContent = Object.values(data).some((v) => String(v || '').trim().length > 0);
    if (!hasContent) {
      return json(400, { error: 'Formulir tidak boleh kosong.' });
    }

    const webhookUrl = process.env[WEBHOOK_MAP[form_type]];
    if (!webhookUrl) {
      return json(500, { error: `Webhook untuk ${form_type} belum diatur di server.` });
    }

    // Kirim ke Discord
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildEmbed(form_type, data))
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      console.error('Discord webhook error:', errText);
      // Tetap lanjut simpan ke database walau discord gagal, supaya data tidak hilang
    }

    // Simpan cadangan ke database
    const supabase = getSupabase();
    await supabase.from('submissions_log').insert({ form_type, data });

    return json(200, { message: 'Formulir berhasil dikirim.' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Terjadi kesalahan server: ' + err.message });
  }
};
