# Redam — Skrining Kemarahan (DAR-5)

Web statis (HTML/CSS/JS) + Supabase Auth & Postgres.
Pengguna masuk dengan email dan kata sandi; hasil dihitung di browser dan disimpan di akun masing-masing.

## Menjalankan
1. Supabase → SQL Editor → jalankan `supabase/schema.sql`.
2. Authentication → Providers → Email → matikan **Confirm email** (atau pengguna harus klik link email dulu).
3. Isi `js/config.js` dengan Project URL dan anon key.
4. Jalankan lewat web server statis (`npx serve .`) atau deploy ke Vercel/Netlify. Pastikan `index.html` ada di root repo.

## Instrumen
DAR-5 (Dimensions of Anger Reactions-5; Forbes et al., 2014, *Depression and Anxiety* 31(2):166-173): 5 butir, skala 1-5,
periode 4 minggu terakhir, total 5-25, ambang skrining >= 12. Tidak ada butir yang dibalik.
Terjemahan Indonesia di aplikasi ini **tidak resmi dan belum divalidasi**; teks asli Inggris dicantumkan di laporan.
Untuk penggunaan klinis/penelitian resmi, gunakan versi Indonesia tervalidasi dan periksa ketentuan penggunaan instrumen.

## Fitur
Asesmen DAR-5, analitik skor (terhadap ambang), pemantauan perkembangan (grafik riwayat), laporan cetak/PDF.

## Catatan penting
- Hasil bukan diagnosis. Hotline: Healing119 (119 ekstensi 8, healing119.id), SAPA 129, polisi 110.
- Data tersimpan per akun di tabel `dar5_assessments` (RLS: hanya pemilik yang bisa membaca/menghapus).
- Tabel lama `anger_responses` dari versi 20 butir tidak dipakai lagi dan boleh dihapus.
