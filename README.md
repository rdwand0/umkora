# UMKORA — Dashboard Kesehatan UMKM (versi modul)

Frontend statis (HTML/CSS/JS) + Supabase (Auth + PostgreSQL). Mengikuti kasus pengikat modul
**Otomasi Alur Data dan Dashboard Berpusat Pengguna**: enam faktor skor 1–5, total 6–30,
empat status (≥25 Sangat Sehat · 19–24 Sehat · 13–18 Cukup Sehat · ≤12 Kurang Sehat).
Bagian n8n/Docker ditunda; fungsinya dipetakan ke Supabase (tabel di bawah).

## Pemetaan komponen modul → Supabase
| Modul | Di proyek ini |
|---|---|
| Webhook `POST /predict` + validasi + hitung + status + Respond (200/400) | Fungsi PostgreSQL `predict_umkm` dipanggil `sb.rpc('predict_umkm')`; masukan salah → HTTP 400 |
| Node Postgres INSERT berparameter | `INSERT` di dalam fungsi, nilai dari variabel (bukan penggabungan string) |
| Schedule `*/10 * * * *` + IF/Filter + notifikasi | `pg_cron` → `job_monitoring()` → tabel `notifikasi` (tampil di Pusat Notifikasi) |
| Schedule harian 07:00 | `pg_cron` `0 0 * * *` (UTC) → `job_ringkasan_harian()` |
| Tabel `sektor`, `umkm`, `survei`, `prediksi_log` | `supabase/02_modul_pipeline.sql` |
| Query Q1–Q9, JOIN, GROUP BY + HAVING | `supabase/queries/jobsheet6_query_modul.sql` dan view dashboard |
| Execution Log | `cron.job_run_details`, tabel `prediksi_log` |

## Setup
1. Buat project di https://supabase.com.
2. SQL Editor → jalankan **berurutan**: `supabase/schema.sql` → `supabase/02_modul_pipeline.sql`.
3. Authentication → Providers → Email → matikan **Confirm email**.
4. Database → Extensions → aktifkan **pg_cron**, lalu jalankan `supabase/03_jadwal_cron.sql`.
5. Project Settings → API → salin **Project URL** dan **anon public key** ke `js/config.js`
   (hanya anon key; jangan service_role. Jangan commit kunci asli ke repositori publik).
6. Jalankan lewat server statis (`npx serve .`, Netlify, Vercel, GitHub Pages). Bukan `file://`.

## Fitur baru (menu **Prediksi Kesehatan**)
- Form ID UMKM (format `UMKMxxx`) + 6 slider 1–5 dengan tooltip.
- Hasil: total/30, status berwarna, label, rekomendasi, grafik radar, **waktu respons (ms)** dan rata-rata 10 permintaan.
- Masukan salah (ID salah, skor di luar 1–5) → daftar galat dari server (kode 400).
- Riwayat 10 prediksi terbaru (`prediksi_log`) dengan filter status.
- Grafik dari SQL: sebaran status (Q7), rata-rata faktor (Q8), rata-rata skor per sektor (Q5).
- Setelah kuesioner 35 pertanyaan disimpan dan **Owner + minimal 1 Pegawai** sudah mengisi, prediksi 6 faktor
  otomatis dihitung dari data server dan muncul di popup; UMKM juga dicatat ke `umkm` dan `survei`.
- Pusat Notifikasi menampilkan notifikasi nyata dari job terjadwal.

## Pemetaan 6 pilar UMKORA → 6 faktor modul (asumsi, silakan konfirmasi ke dosen)
INS→sumber_daya · LDI→kepemimpinan · WEQ→lingkungan_kerja · OV→nilai_organisasi · OPS→stabilitas · ECT→kinerja.
Skor pilar (0–1) dikali 5 lalu dibulatkan ke bilangan bulat 1–5.

## Pengujian
- Nilai batas dan Q1–Q9: `supabase/queries/jobsheet6_query_modul.sql` (kolom `lolos` harus true semua).
- Uji lewat halaman Prediksi: skor 2,2,2,2,2,2 → 12 KURANG_SEHAT; 3,2,2,2,2,2 → 13 CUKUP_SEHAT; 4,3,3,3,3,3 → 19 SEHAT; 5,4,4,4,4,4 → 25 SANGAT_SEHAT.
- Pedoman SUS dan tabel pengukuran: `docs/02_pengujian_dan_SUS.md`.

## Keamanan
- Penulisan data hanya lewat fungsi `SECURITY DEFINER`; tidak ada policy INSERT/UPDATE/DELETE langsung.
- Fungsi hanya bisa dipanggil pengguna login (`anon` dicabut); validasi dan skor dihitung di database.
- Job cron tidak dapat dipanggil dari klien.
- Nomor UMKM baru memakai format 3 digit; di atas UMKM999 harus diperluas.

## Catatan batas
- n8n, Docker Compose, dan `.env` belum dikerjakan (ditunda). Capaian CPMK-3 dan CPMK-5 membutuhkannya.
- SQL dan alur halaman sudah diuji logikanya di luar Supabase (query Q1–Q9 dicocokkan dengan keluaran modul; alur JS diuji dengan Supabase tiruan),
  tetapi **belum dijalankan di project Supabase sungguhan**. Jalankan langkah Setup dan periksa pesan galat SQL Editor bila ada.
