-- ============================================================
--  UMKORA — Penjadwalan otomatis (pengganti Schedule Trigger n8n)
--  Jalankan SETELAH 02_modul_pipeline.sql.
--  Prasyarat: Dashboard → Database → Extensions → cari "pg_cron" → Enable.
--  pg_cron memakai zona waktu UTC, jadi 07:00 WIB = 00:00 UTC.
-- ============================================================
create extension if not exists pg_cron;

select cron.schedule('umkm-monitoring',       '*/10 * * * *', $$select public.job_monitoring()$$);        -- tiap 10 menit
select cron.schedule('umkm-ringkasan-harian', '0 0 * * *',    $$select public.job_ringkasan_harian()$$);  -- tiap hari 07:00 WIB

-- Periksa jadwal dan Execution Log:
--   select jobid, jobname, schedule, active from cron.job;
--   select j.jobname, d.status, d.start_time, d.end_time
--     from cron.job_run_details d join cron.job j using (jobid) order by d.start_time desc limit 20;
-- Uji manual satu kali (tanpa menunggu jadwal):
--   select public.job_monitoring();  select public.job_ringkasan_harian();
-- Nonaktifkan setelah selesai praktik (checklist JS-5):
--   select cron.unschedule('umkm-monitoring');  select cron.unschedule('umkm-ringkasan-harian');
