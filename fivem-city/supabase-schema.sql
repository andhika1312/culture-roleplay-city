-- =========================================================
-- SKEMA DATABASE PORTAL KOTA FIVEM
-- Jalankan seluruh file ini di: Supabase Dashboard > SQL Editor > New Query
-- =========================================================

-- Ekstensi untuk generate UUID
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. TABEL AKUN DASHBOARD (founder, dev, admin)
-- ---------------------------------------------------------
create table if not exists dashboard_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('founder', 'dev', 'admin')),
  display_name text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 2. TABEL SUSUNAN TIM (founder, co-founder, dev, management, admin, helper)
-- ---------------------------------------------------------
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  role_group text not null check (role_group in ('founder','co_founder','dev','management','admin','helper')),
  name text not null,
  discord_tag text,
  photo_url text,
  sort_order int default 0,
  owner_username text, -- diisi username admin/founder pemilik entri ini (untuk role admin yg hanya bisa edit entri sendiri)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 3. TABEL DATA KEUANGAN KOTA (ringkasan saldo/kas)
-- ---------------------------------------------------------
create table if not exists city_finance (
  id int primary key default 1,
  kas_kota numeric default 0,
  pemasukan_bulan_ini numeric default 0,
  pengeluaran_bulan_ini numeric default 0,
  keterangan text,
  updated_at timestamptz default now(),
  updated_by text
);

insert into city_finance (id, kas_kota, pemasukan_bulan_ini, pengeluaran_bulan_ini, keterangan)
values (1, 0, 0, 0, 'Inisialisasi data keuangan kota')
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- 4. TABEL RIWAYAT PENGELUARAN / LAPORAN KEUANGAN
-- ---------------------------------------------------------
create table if not exists city_expenses (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  kategori text not null,
  deskripsi text not null,
  jumlah numeric not null,
  tipe text not null check (tipe in ('pemasukan','pengeluaran')),
  created_by text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 5. TABEL INFORMASI / UPDATE KOTA
-- ---------------------------------------------------------
create table if not exists city_updates (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  isi text not null,
  tipe text default 'info' check (tipe in ('info','update','pengumuman')),
  created_by text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 6. TABEL KONTEN HALAMAN (culture, mata uang, sistem kota - bisa diedit dari dashboard opsional)
-- ---------------------------------------------------------
create table if not exists site_content (
  key text primary key,
  content text,
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 7. TABEL LOG PENDAFTARAN (arsip semua submission form, cadangan selain Discord)
-- ---------------------------------------------------------
create table if not exists submissions_log (
  id uuid primary key default gen_random_uuid(),
  form_type text not null, -- 'admin' | 'polisi' | 'ems' | 'pedagang' | 'pemerintah' | 'mekanik' | 'bahamas' | 'media'
  data jsonb not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- Semua akses ke tabel-tabel ini HANYA lewat Netlify Functions
-- menggunakan Service Role Key (bukan dari browser langsung),
-- jadi RLS diaktifkan dan tidak ada policy publik dibuat di sini.
-- ---------------------------------------------------------
alter table dashboard_users enable row level security;
alter table team_members enable row level security;
alter table city_finance enable row level security;
alter table city_expenses enable row level security;
alter table city_updates enable row level security;
alter table site_content enable row level security;
alter table submissions_log enable row level security;

-- Tidak ada policy ditambahkan = default deny untuk anon/public key.
-- Service role key (dipakai di Netlify Functions) otomatis bypass RLS.

-- =========================================================
-- SELESAI. Lanjutkan ke langkah membuat akun dashboard pertama
-- lewat Netlify Function /api/setup-akun-pertama (lihat README).
-- =========================================================
