# UMKORA

Aplikasi penilaian kesehatan organisasi UMKM (6 faktor, 35 pertanyaan).
Frontend statis (HTML/CSS/JS) + Supabase (Auth + Postgres). Tanpa server PHP.

## Setup
1. Buat project di https://supabase.com
2. SQL Editor → tempel isi `supabase/schema.sql` → Run
3. Authentication → Providers → Email → matikan **Confirm email**
   (jika dibiarkan aktif, user harus klik link email dulu sebelum bisa masuk)
4. Project Settings → API → salin **Project URL** dan **anon public key**
   ke `js/config.js`
5. Buka `index.html` lewat web server statis (mis. `npx serve .`, Netlify,
   Vercel, GitHub Pages). Jangan dibuka via `file://`.

## Struktur
- `index.html` — satu halaman (landing, login, dashboard, form)
- `css/umkora.css` — tema baru (ubah warna di blok `:root`)
- `js/config.js` — URL & anon key Supabase
- `js/api.js` — klien Supabase (menggantikan backend PHP)
- `supabase/schema.sql` — tabel, fungsi skor, RLS

## Catatan keamanan
- Hanya gunakan **anon key** di frontend, jangan service_role key.
- Penulisan data hanya lewat fungsi `submit_assessment()`; user tidak bisa
  mengubah skor langsung. Validasi & perhitungan skor dilakukan di database.
