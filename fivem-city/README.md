# Culture Roleplay — Portal Kota FiveM

Website lengkap untuk kota FiveM: profil kota (budaya, mata uang, sistem), susunan tim,
pendaftaran admin & whitelist (7 instansi) yang terkirim ke Discord webhook, serta
dashboard admin dengan 3 level akses (Founder, Developer, Admin).

## Isi Proyek

```
fivem-city/
├── public/                    → semua file yang tampil ke pengunjung
│   ├── index.html             → halaman utama
│   ├── dashboard.html         → halaman dashboard admin
│   ├── css/
│   ├── js/
├── netlify/functions/         → backend (Netlify Functions)
├── supabase-schema.sql        → skema database yang harus dijalankan di Supabase
├── netlify.toml                → konfigurasi Netlify
├── package.json
└── .env.example                → daftar semua Environment Variables yang dibutuhkan
```

## Cara Kerja Singkat

- **Frontend** (HTML/CSS/JS murni) di-hosting statis oleh Netlify.
- **Backend** berupa *Netlify Functions* (serverless) yang menangani: login dashboard,
  kirim data ke Discord webhook, dan baca/tulis data ke database.
- **Database**: Supabase (gratis) — menyimpan akun dashboard, susunan tim, data keuangan,
  riwayat pengeluaran, pengumuman, dan arsip pendaftar.
- Password dan URL webhook **tidak pernah** ada di kode frontend — semua disimpan sebagai
  Environment Variables di Netlify dan hanya diakses dari sisi server (Functions).

---

## LANGKAH DEPLOY (ikuti berurutan)

### 1. Buat Project Supabase (gratis)

1. Buka [supabase.com](https://supabase.com) → daftar/login → **New Project**.
2. Pilih nama project bebas, buat password database (simpan baik-baik), pilih region terdekat (Singapore).
3. Tunggu project selesai dibuat (±2 menit).
4. Buka menu **SQL Editor** di sidebar kiri → **New query**.
5. Buka file `supabase-schema.sql` di proyek ini, **copy semua isinya**, paste ke SQL Editor, lalu klik **Run**.
   - Ini akan membuat semua tabel yang dibutuhkan (akun dashboard, tim, keuangan, pengeluaran, pengumuman, arsip pendaftar).
6. Buka menu **Project Settings** (ikon gerigi) → **API**.
   - Catat **Project URL** → ini nilai `SUPABASE_URL`.
   - Catat **service_role key** (bagian "Project API keys", yang **service_role**, BUKAN yang `anon public`) → ini nilai `SUPABASE_SERVICE_ROLE_KEY`.
   - ⚠️ **service_role key bersifat rahasia total** — jangan pernah taruh di kode frontend, hanya di Environment Variables Netlify.

### 2. Buat 9 Webhook Discord

Di server Discord kota kamu:

1. Buka **Server Settings** → **Integrations** → **Webhooks** → **New Webhook**.
2. Buat **9 webhook** berbeda, masing-masing di channel yang sesuai:
   - `WEBHOOK_ADMIN` → channel pendaftaran admin
   - `WEBHOOK_POLISI` → channel whitelist polisi
   - `WEBHOOK_EMS` → channel whitelist EMS
   - `WEBHOOK_PEDAGANG` → channel whitelist pedagang
   - `WEBHOOK_PEMERINTAH` → channel whitelist pemerintah
   - `WEBHOOK_MEKANIK` → channel whitelist mekanik
   - `WEBHOOK_BAHAMAS` → channel whitelist bahamas
   - `WEBHOOK_MEDIA` → channel whitelist media
   - `WEBHOOK_DASHBOARD_LOG` → channel log aktivitas dashboard (update keuangan, pengeluaran, susunan tim)
3. Untuk masing-masing, klik **Copy Webhook URL** — simpan sementara, nanti dipakai di langkah 4.

### 3. Upload Proyek ke GitHub

1. Buat repository baru di [github.com](https://github.com) (bisa privat).
2. Upload seluruh isi folder proyek ini ke repository tersebut (lewat GitHub Desktop, web upload, atau `git push`).
   - **Pastikan file `.env` (jika ada) TIDAK ikut ter-upload** — `.gitignore` sudah mengatur ini.

### 4. Deploy ke Netlify

1. Buka [app.netlify.com](https://app.netlify.com) → login/daftar.
2. Klik **Add new site** → **Import an existing project** → hubungkan ke GitHub → pilih repository proyek ini.
3. Netlify akan otomatis membaca `netlify.toml`. Pastikan pengaturan build:
   - **Build command**: (boleh dikosongkan)
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
4. **Sebelum klik Deploy**, buka **Site configuration** → **Environment variables** → **Add a variable**, lalu masukkan SATU PER SATU semua variabel berikut (nilainya sesuai yang kamu catat di langkah 1 & 2):

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | dari langkah 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | dari langkah 1 |
   | `JWT_SECRET` | string acak panjang, bebas kamu buat sendiri (contoh: pakai [generator ini](https://generate-secret.vercel.app/32)) |
   | `SETUP_KEY` | string acak bebas, buat sendiri, INGAT baik-baik (dipakai sekali di langkah 6) |
   | `WEBHOOK_ADMIN` | dari langkah 2 |
   | `WEBHOOK_POLISI` | dari langkah 2 |
   | `WEBHOOK_EMS` | dari langkah 2 |
   | `WEBHOOK_PEDAGANG` | dari langkah 2 |
   | `WEBHOOK_PEMERINTAH` | dari langkah 2 |
   | `WEBHOOK_MEKANIK` | dari langkah 2 |
   | `WEBHOOK_BAHAMAS` | dari langkah 2 |
   | `WEBHOOK_MEDIA` | dari langkah 2 |
   | `WEBHOOK_DASHBOARD_LOG` | dari langkah 2 |

5. Klik **Deploy site**. Tunggu sampai statusnya "Published" (±1-2 menit).
6. Situs kamu sekarang sudah live di URL seperti `https://nama-acak.netlify.app` (bisa diganti di **Site configuration > Domain management** jadi custom domain).

### 5. Uji Coba

- Buka `https://situs-kamu.netlify.app` → cek halaman utama tampil dengan benar.
- Coba isi salah satu form pendaftaran → cek apakah masuk ke channel Discord yang sesuai.

### 6. Buat Akun Dashboard Pertama (Founder)

Karena belum ada akun sama sekali, buat akun pertama lewat request API (sekali saja, pakai `SETUP_KEY`):

**Cara termudah** — buka https://reqbin.com/curl (atau tool serupa seperti Postman), atau jalankan lewat terminal jika familiar:

```bash
curl -X POST https://situs-kamu.netlify.app/api/setup-akun \
  -H "Content-Type: application/json" \
  -d '{
    "setup_key": "ISI_SESUAI_SETUP_KEY_DI_NETLIFY",
    "username": "founder1",
    "password": "buatPasswordKuatMinimal8Karakter",
    "role": "founder",
    "display_name": "Nama Kamu"
  }'
```

- `role` bisa diisi: `founder`, `dev`, atau `admin`.
- Ulangi request ini untuk membuat akun dev dan admin lain, cukup ganti `username`, `password`, `role`, `display_name`.
- Jika berhasil, akan muncul respons `{"message":"Akun berhasil dibuat", ...}`.
- Setelah semua akun yang dibutuhkan selesai dibuat, **sangat disarankan** hapus/ubah nilai `SETUP_KEY` di Netlify Environment Variables (atau biarkan tapi jaga kerahasiaannya) supaya tidak ada orang lain bisa membuat akun dashboard baru sembarangan.

### 7. Login ke Dashboard

Buka `https://situs-kamu.netlify.app/dashboard.html`, login dengan username/password yang baru dibuat.

---

## Hak Akses Dashboard (3 Role)

| Fitur | Founder | Developer | Admin |
|---|---|---|---|
| Lihat data keuangan & pengeluaran | ✅ | ✅ | ✅ (lihat saja) |
| Edit/tambah/hapus data keuangan & pengeluaran | ✅ | ✅ | ❌ |
| Kelola susunan tim (semua entri) | ✅ | ✅ | ❌ |
| Kelola susunan tim (entri miliknya sendiri saja) | — | — | ✅ |
| Tambah/hapus pengumuman/update kota | ✅ | ✅ | ❌ (lihat saja) |
| Lihat arsip data pendaftar | ✅ | ✅ | ✅ |

Setiap admin yang menambahkan anggota tim baru, entri tersebut otomatis tercatat sebagai
"miliknya" — hanya admin itu (atau founder/dev) yang bisa mengedit/menghapusnya.

## Mengganti Logo

Logo saat ini ada di `public/assets/logo.png` dan sudah dipakai otomatis di header, hero,
footer, dan halaman dashboard. Untuk ganti logo di kemudian hari, cukup timpa file
`public/assets/logo.png` dengan file baru (nama file harus tetap sama: `logo.png`), lalu
upload ulang ke GitHub — Netlify otomatis re-deploy.

## Mengedit Konten Statis (Budaya, Mata Uang, Sistem Kota)

Bagian "Tentang Kota" (budaya, mata uang, sistem) saat ini berupa teks langsung di
`public/index.html` (cari komentar `<!-- TENTANG KOTA -->`). Edit teks di sana lalu
upload ulang (Netlify otomatis re-deploy tiap kali kamu push ke GitHub).

## Catatan Keamanan

- Jangan bagikan `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, atau `SETUP_KEY` ke siapa pun.
- Semua Environment Variables hanya tersimpan di server Netlify, tidak pernah terkirim ke browser.
- Password akun dashboard disimpan ter-enkripsi (bcrypt hash), bukan teks polos.
- Jika lupa password dashboard, buat ulang akun lewat `setup-akun` menggunakan `SETUP_KEY`,
  atau hapus & ganti password langsung lewat Supabase Table Editor (tabel `dashboard_users`).

## Troubleshooting

- **Form tidak masuk ke Discord**: cek nama Environment Variable webhook sudah persis sama
  (huruf besar semua, contoh `WEBHOOK_POLISI`), dan URL webhook masih aktif di Discord.
- **Dashboard tidak bisa login**: cek `JWT_SECRET` dan `SUPABASE_SERVICE_ROLE_KEY` sudah
  benar di Netlify, lalu cek tabel `dashboard_users` di Supabase apakah akun sudah dibuat.
- **Error 500 di mana pun**: buka Netlify → **Functions** tab → klik function terkait →
  lihat log error untuk detail penyebabnya.
