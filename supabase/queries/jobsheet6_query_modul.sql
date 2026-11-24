-- ============================================================
--  Query modul KB-4 (Q1–Q9) + uji nilai batas — jalankan di Supabase SQL Editor
--  Keluaran acuan dihitung dari 10 baris contoh pada 02_modul_pipeline.sql.
--  (Bila sudah ada data nyata dari aplikasi, angka akan berbeda — itu wajar.)
-- ============================================================

-- Q1. UMKM dengan skor sangat sehat (>= 25), tertinggi dulu
SELECT id_umkm, tanggal, total_skor FROM survei WHERE total_skor >= 25 ORDER BY total_skor DESC;

-- Q2. Status kesehatan dengan CASE (sama dengan fungsi status_kesehatan)
SELECT id_umkm, total_skor,
       CASE WHEN total_skor >= 25 THEN 'SANGAT_SEHAT' WHEN total_skor >= 19 THEN 'SEHAT'
            WHEN total_skor >= 13 THEN 'CUKUP_SEHAT'  ELSE 'KURANG_SEHAT' END AS status_kesehatan
FROM survei ORDER BY total_skor DESC, id_umkm;

-- Q3. INNER JOIN tiga tabel: survei + umkm + sektor
SELECT u.id_umkm, u.nama_umkm, k.nama_sektor, s.tanggal, s.total_skor
FROM survei s
JOIN umkm   u ON u.id_umkm   = s.id_umkm
JOIN sektor k ON k.sektor_id = u.sektor_id
ORDER BY s.survei_id;

-- Q4. UMKM yang belum pernah disurvei (LEFT JOIN + IS NULL)  → acuan: UMKM007 Keramik Pertiwi
SELECT u.id_umkm, u.nama_umkm
FROM umkm u LEFT JOIN survei s ON s.id_umkm = u.id_umkm
WHERE s.survei_id IS NULL;

-- Q5. Jumlah survei dan rata-rata skor per sektor  → Fashion 2/24.00, Kuliner 6/20.33, Kriya 2/13.50
SELECT k.nama_sektor, COUNT(*) AS jumlah_survei, ROUND(AVG(s.total_skor), 2) AS rata_skor
FROM survei s JOIN umkm u ON u.id_umkm = s.id_umkm JOIN sektor k ON k.sektor_id = u.sektor_id
GROUP BY k.nama_sektor ORDER BY rata_skor DESC;

-- Q6. Hanya sektor dengan rata-rata >= 18 (HAVING)  → Fashion dan Kuliner
SELECT k.nama_sektor, COUNT(*) AS jumlah_survei, ROUND(AVG(s.total_skor), 2) AS rata_skor
FROM survei s JOIN umkm u ON u.id_umkm = s.id_umkm JOIN sektor k ON k.sektor_id = u.sektor_id
GROUP BY k.nama_sektor HAVING AVG(s.total_skor) >= 18 ORDER BY rata_skor DESC;

-- Q7. Sebaran status kesehatan  → SANGAT_SEHAT 3, SEHAT 2, CUKUP_SEHAT 4, KURANG_SEHAT 1
SELECT public.status_kesehatan(total_skor) AS status_kesehatan, COUNT(*) AS jumlah
FROM survei GROUP BY public.status_kesehatan(total_skor) ORDER BY MIN(total_skor) DESC;

-- Q8. Rata-rata tiap faktor  → 3.50, 3.30, 3.40, 3.30, 3.20, 3.00
SELECT * FROM v_rata_faktor;

-- Q9. UMKM yang disurvei lebih dari sekali  → UMKM001 28.5, UMKM003 17.0, UMKM004 13.5, UMKM006 15.5
SELECT id_umkm, COUNT(*) AS n, ROUND(AVG(total_skor),1) AS rata
FROM survei GROUP BY id_umkm HAVING COUNT(*) > 1 ORDER BY id_umkm;

-- Mandiri: skor 13–18 di kota Jakarta
SELECT s.id_umkm, u.nama_umkm, s.total_skor FROM survei s JOIN umkm u ON u.id_umkm = s.id_umkm
WHERE s.total_skor BETWEEN 13 AND 18 AND u.kota = 'Jakarta' ORDER BY s.total_skor;

-- Mandiri: rata-rata skor per kota dan per bulan
SELECT u.kota, date_trunc('month', s.tanggal)::date AS bulan, ROUND(AVG(s.total_skor),2) AS rata
FROM survei s JOIN umkm u ON u.id_umkm = s.id_umkm GROUP BY u.kota, bulan ORDER BY bulan, u.kota;

-- ------------------------------------------------------------
--  UJI NILAI BATAS status_kesehatan (tanpa menulis data). Kolom "lolos" harus true semua.
-- ------------------------------------------------------------
SELECT total, diharapkan, public.status_kesehatan(total) AS aktual,
       public.status_kesehatan(total) = diharapkan AS lolos
FROM (VALUES (12,'KURANG_SEHAT'), (13,'CUKUP_SEHAT'), (18,'CUKUP_SEHAT'),
             (19,'SEHAT'), (24,'SEHAT'), (25,'SANGAT_SEHAT')) t(total, diharapkan);

-- Uji masukan tidak valid → harus GAGAL (HTTP 400 lewat API). Jalankan sebagai pengguna login (API/halaman Prediksi):
--   id_umkm 'ABC', atau sumber_daya = 6, atau faktor kosong.

-- Execution Log pemantauan terjadwal (pg_cron)
-- SELECT jobname, status, start_time, end_time FROM cron.job_run_details d JOIN cron.job j USING (jobid) ORDER BY start_time DESC LIMIT 20;
-- Riwayat prediksi
-- SELECT * FROM prediksi_log ORDER BY log_id DESC LIMIT 20;
