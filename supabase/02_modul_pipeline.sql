-- ============================================================
--  UMKORA — Pipeline modul "Otomasi Alur Data dan Dashboard Berpusat Pengguna"
--  Dijalankan SETELAH supabase/schema.sql.
--  Supabase Dashboard → SQL Editor → New query → Run. Aman dijalankan ulang.
--
--  Pemetaan komponen modul → Supabase
--    Webhook POST /predict (n8n)   → fungsi RPC  public.predict_umkm()   (HTTP: /rest/v1/rpc/predict_umkm)
--    Respond to Webhook 200 / 400  → hasil jsonb / RAISE EXCEPTION (PostgREST membalas 400)
--    Node Postgres INSERT          → INSERT ... VALUES (parameter) di dalam fungsi
--    Schedule Trigger (cron)       → pg_cron (lihat 03_jadwal_cron.sql: monitoring tiap 10 menit, ringkasan harian)
--    IF / Filter + Telegram        → CASE/WHERE di SQL + tabel public.notifikasi
--    Execution Log                 → cron.job_run_details dan tabel prediksi_log
--    PostgreSQL (Docker)           → PostgreSQL milik Supabase
-- ============================================================

-- 1. TABEL MODEL DATA (KB-4 §4.2) ----------------------------
create table if not exists public.sektor (
  sektor_id   serial primary key,
  nama_sektor varchar(40) not null unique
);

create table if not exists public.umkm (
  id_umkm   varchar(10) primary key check (id_umkm ~ '^UMKM[0-9]{3}$'),
  nama_umkm varchar(80) not null,
  sektor_id int not null references public.sektor(sektor_id),
  kota      varchar(40) not null,
  umkm_key  text unique          -- kunci penghubung ke profiles.umkm_name (NULL untuk data contoh)
);

create table if not exists public.survei (
  survei_id        serial primary key,
  id_umkm          varchar(10) not null references public.umkm(id_umkm),
  tanggal          date not null default current_date,
  sumber_daya      smallint not null check (sumber_daya      between 1 and 5),
  kepemimpinan     smallint not null check (kepemimpinan     between 1 and 5),
  lingkungan_kerja smallint not null check (lingkungan_kerja between 1 and 5),
  nilai_organisasi smallint not null check (nilai_organisasi between 1 and 5),
  stabilitas       smallint not null check (stabilitas       between 1 and 5),
  kinerja          smallint not null check (kinerja          between 1 and 5),
  total_skor       smallint generated always as
    (sumber_daya + kepemimpinan + lingkungan_kerja + nilai_organisasi + stabilitas + kinerja) stored
);

create table if not exists public.prediksi_log (
  log_id      serial primary key,
  id_umkm     varchar(10) not null,
  total_skor  smallint not null,
  status      varchar(20) not null,
  sumber      varchar(10) not null check (sumber in ('webhook','schedule')),
  dibuat_pada timestamptz not null default now()
);
create index if not exists idx_prediksi_waktu on public.prediksi_log (dibuat_pada);

-- Notifikasi bersyarat (pengganti node IF + Telegram)
create table if not exists public.notifikasi (
  notif_id    serial primary key,
  log_id      int unique references public.prediksi_log(log_id) on delete cascade, -- unique = tidak dobel
  jenis       varchar(20) not null check (jenis in ('best_practice','intervensi','ringkasan')),
  id_umkm     varchar(10),
  pesan       text not null,
  dibuat_pada timestamptz not null default now()
);

-- Nomor UMKM baru dari aplikasi mulai dari 008 (001–007 dipakai data contoh modul)
create sequence if not exists public.umkm_kode_seq start 8;

-- 2. FUNGSI KLASIFIKASI (ambang modul: 25 / 19 / 13) ---------
create or replace function public.status_kesehatan(total int)
returns text language sql immutable as $$
  select case when total >= 25 then 'SANGAT_SEHAT'
              when total >= 19 then 'SEHAT'
              when total >= 13 then 'CUKUP_SEHAT'
              else 'KURANG_SEHAT' end
$$;

create or replace function public.label_status(s text)
returns text language sql immutable as $$
  select case s when 'SANGAT_SEHAT' then 'Best Practice'
                when 'SEHAT'        then 'Perlu Perhatian'
                when 'CUKUP_SEHAT'  then 'Perlu Intervensi'
                else 'Prioritas Intervensi' end
$$;

create or replace function public.rekomendasi_status(s text)
returns text language sql immutable as $$
  select case s
    when 'SANGAT_SEHAT' then 'Pertahankan kinerja! Jadikan UMKM ini sebagai role model.'
    when 'SEHAT'        then 'Kinerja sudah baik. Tingkatkan faktor yang masih di bawah rata-rata.'
    when 'CUKUP_SEHAT'  then 'Perlu perbaikan signifikan pada 1-2 faktor kesehatan organisasi.'
    else 'Prioritas intervensi! Segera konsultasi dengan pendamping UMKM.' end
$$;

-- 3. "WEBHOOK" POST /predict  →  RPC predict_umkm ------------
--  Masukan  : {"id_umkm":"UMKM008","sumber_daya":5,"kepemimpinan":4,"lingkungan_kerja":5,
--              "nilai_organisasi":5,"stabilitas":4,"kinerja":5}
--  Keluaran : {"success":true,"data":{"id_umkm","total_skor","status","label","rekomendasi","log_id"}}
--  Masukan salah → RAISE EXCEPTION → HTTP 400 (setara cabang IF-false + Respond to Webhook 400).
create or replace function public.predict_umkm(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  faktor text[] := array['sumber_daya','kepemimpinan','lingkungan_kerja','nilai_organisasi','stabilitas','kinerja'];
  f text; v numeric; errs text[] := '{}'; total int := 0; st text; lid int;
begin
  if auth.uid() is null then raise exception 'Tidak terautentikasi. Silakan login.'; end if;
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'Format masukan harus objek JSON.'; end if;

  if coalesce(p->>'id_umkm','') !~ '^UMKM[0-9]{3}$' then
    errs := errs || 'id_umkm harus berformat UMKMxxx'::text;
  end if;

  foreach f in array faktor loop
    if jsonb_typeof(p->f) is distinct from 'number' then
      errs := errs || (f || ' harus bilangan bulat 1-5')::text;
    else
      v := (p->>f)::numeric;
      if v <> trunc(v) or v < 1 or v > 5 then errs := errs || (f || ' harus bilangan bulat 1-5')::text; end if;
    end if;
  end loop;

  if array_length(errs,1) is not null then
    raise exception '%', array_to_string(errs, '; ');
  end if;

  foreach f in array faktor loop total := total + (p->>f)::int; end loop;
  st := public.status_kesehatan(total);

  -- INSERT berparameter (nilai berasal dari variabel, bukan penggabungan string)
  insert into public.prediksi_log (id_umkm, total_skor, status, sumber)
  values (p->>'id_umkm', total, st, 'webhook')
  returning log_id into lid;

  return jsonb_build_object('success', true, 'data', jsonb_build_object(
    'id_umkm', p->>'id_umkm', 'total_skor', total, 'status', st,
    'label', public.label_status(st), 'rekomendasi', public.rekomendasi_status(st), 'log_id', lid));
end $$;

-- 4. PENGHUBUNG APLIKASI → PIPELINE (skor diambil dari server, bukan dari klien)
--  Dipanggil form setelah semua enam faktor tersedia (Owner + minimal 1 Pegawai).
--  Pemetaan 6 pilar UMKORA → 6 faktor modul (skala 1–5, dibulatkan ke bilangan bulat):
--    INS→sumber_daya  LDI→kepemimpinan  WEQ→lingkungan_kerja  OV→nilai_organisasi  OPS→stabilitas  ECT→kinerja
create or replace function public.predict_saya()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me public.profiles; s public.submissions; k text; kode text; sid int; kota text; hasil jsonb;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Tidak terautentikasi. Silakan login.'; end if;

  -- baris Owner memuat rata-rata seluruh pegawai UMKM yang sama
  select sub.* into s from public.submissions sub join public.profiles p on p.id = sub.user_id
   where sub.role = 'owner' and lower(trim(p.umkm_name)) = lower(trim(me.umkm_name)) limit 1;
  if s.id is null or s.score_ins is null or s.score_ops is null or s.score_ect is null
     or s.score_ov is null or s.score_ldi is null or s.score_weq is null then
    raise exception 'Enam faktor belum lengkap: Owner dan minimal satu Pegawai harus sudah mengisi.';
  end if;

  k := lower(trim(me.umkm_name));
  select u.id_umkm into kode from public.umkm u where u.umkm_key = k;
  if kode is null then
    insert into public.sektor (nama_sektor) values (left(coalesce(nullif(trim(me.sektor),''),'Lainnya'), 40))
      on conflict (nama_sektor) do nothing;
    select sektor_id into sid from public.sektor
      where nama_sektor = left(coalesce(nullif(trim(me.sektor),''),'Lainnya'), 40);
    kota := left(coalesce(nullif(trim(me.lokasi),''),'Tidak diketahui'), 40);
    kode := 'UMKM' || lpad(nextval('public.umkm_kode_seq')::text, 3, '0');
    insert into public.umkm (id_umkm, nama_umkm, sektor_id, kota, umkm_key)
    values (kode, left(me.umkm_name, 80), sid, kota, k);
  end if;

  -- simpan satu baris survei (data kini dapat dikueri dengan JOIN/GROUP BY)
  insert into public.survei (id_umkm, sumber_daya, kepemimpinan, lingkungan_kerja, nilai_organisasi, stabilitas, kinerja)
  values (kode,
    least(5, greatest(1, round(s.score_ins * 5)))::int, least(5, greatest(1, round(s.score_ldi * 5)))::int,
    least(5, greatest(1, round(s.score_weq * 5)))::int, least(5, greatest(1, round(s.score_ov  * 5)))::int,
    least(5, greatest(1, round(s.score_ops * 5)))::int, least(5, greatest(1, round(s.score_ect * 5)))::int);

  hasil := public.predict_umkm(jsonb_build_object(
    'id_umkm', kode,
    'sumber_daya',      least(5, greatest(1, round(s.score_ins * 5)))::int,
    'kepemimpinan',     least(5, greatest(1, round(s.score_ldi * 5)))::int,
    'lingkungan_kerja', least(5, greatest(1, round(s.score_weq * 5)))::int,
    'nilai_organisasi', least(5, greatest(1, round(s.score_ov  * 5)))::int,
    'stabilitas',       least(5, greatest(1, round(s.score_ops * 5)))::int,
    'kinerja',          least(5, greatest(1, round(s.score_ect * 5)))::int));
  return hasil;
end $$;

-- 5. "SCHEDULE": fungsi yang dipanggil pg_cron --------------
--  5a. Pemantauan tiap 10 menit: IF total >= 25 atau < 13 → catat notifikasi (sekali per log)
create or replace function public.job_monitoring()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with ins as (
    insert into public.notifikasi (log_id, jenis, id_umkm, pesan)
    select l.log_id,
           case when l.total_skor >= 25 then 'best_practice' else 'intervensi' end,
           l.id_umkm,
           case when l.total_skor >= 25
                then 'UMKM Best Practice terdeteksi: ' || l.id_umkm || ' (skor ' || l.total_skor || ')'
                else 'Prioritas Intervensi: ' || l.id_umkm || ' (skor ' || l.total_skor || ')' end
    from public.prediksi_log l
    where l.dibuat_pada >= now() - interval '10 minutes'
      and l.total_skor between 6 and 30                       -- Filter: hanya data valid
      and (l.total_skor >= 25 or l.total_skor < 13)           -- IF: kondisi bersyarat
    on conflict (log_id) do nothing
    returning 1)
  select count(*) into n from ins;
  return n;
end $$;

--  5b. Ringkasan harian: hitung ulang dari survei terbaru tiap UMKM → prediksi_log (sumber = schedule)
create or replace function public.job_ringkasan_harian()
returns jsonb language plpgsql security definer set search_path = public as $$
declare ringkas text; n int; rata numeric;
begin
  insert into public.prediksi_log (id_umkm, total_skor, status, sumber)
  select distinct on (s.id_umkm) s.id_umkm, s.total_skor, public.status_kesehatan(s.total_skor), 'schedule'
  from public.survei s order by s.id_umkm, s.tanggal desc, s.survei_id desc;

  select count(*), round(avg(total_skor),2) into n, rata
  from (select distinct on (id_umkm) id_umkm, total_skor from public.survei
        order by id_umkm, tanggal desc, survei_id desc) t;

  select string_agg(st || ': ' || jml, ', ' order by ord) into ringkas from (
    select public.status_kesehatan(total_skor) st, count(*) jml, min(total_skor) ord
    from (select distinct on (id_umkm) id_umkm, total_skor from public.survei
          order by id_umkm, tanggal desc, survei_id desc) t
    group by public.status_kesehatan(total_skor)) g;

  insert into public.notifikasi (jenis, pesan)
  values ('ringkasan', 'Ringkasan harian: ' || coalesce(n,0) || ' UMKM, rata-rata skor ' || coalesce(rata,0)
                       || '. Sebaran status → ' || coalesce(ringkas,'-'));
  return jsonb_build_object('umkm', n, 'rata_skor', rata, 'sebaran', ringkas);
end $$;

revoke all on function public.job_monitoring(), public.job_ringkasan_harian() from public, anon, authenticated;

-- 6. DATA CONTOH MODUL (10 baris, hasil query dapat dicocokkan dengan modul) ----------
insert into public.sektor (nama_sektor) values ('Kuliner'), ('Fashion'), ('Kriya') on conflict (nama_sektor) do nothing;

insert into public.umkm (id_umkm, nama_umkm, sektor_id, kota)
select v.id, v.nama, s.sektor_id, v.kota
from (values ('UMKM001','Warung Bu Sari','Kuliner','Jakarta'), ('UMKM002','Batik Nusa','Fashion','Surakarta'),
             ('UMKM003','Kopi Senja','Kuliner','Bandung'),     ('UMKM004','Anyam Karya','Kriya','Yogyakarta'),
             ('UMKM005','Tenun Lestari','Fashion','Yogyakarta'),('UMKM006','Roti Pagi','Kuliner','Jakarta'),
             ('UMKM007','Keramik Pertiwi','Kriya','Magelang')) v(id,nama,sektor,kota)
join public.sektor s on s.nama_sektor = v.sektor
on conflict (id_umkm) do nothing;

insert into public.survei (id_umkm, tanggal, sumber_daya, kepemimpinan, lingkungan_kerja, nilai_organisasi, stabilitas, kinerja)
select * from (values
  ('UMKM001','2026-03-02'::date,5,4,5,5,4,5), ('UMKM002','2026-03-02'::date,4,4,3,4,4,3),
  ('UMKM003','2026-03-03'::date,3,2,3,2,3,2), ('UMKM004','2026-03-03'::date,2,2,2,3,2,1),
  ('UMKM005','2026-03-04'::date,4,5,4,4,5,4), ('UMKM006','2026-03-04'::date,3,3,4,3,2,3),
  ('UMKM001','2026-06-02'::date,5,5,5,4,5,5), ('UMKM003','2026-06-03'::date,4,3,3,3,3,3),
  ('UMKM004','2026-06-03'::date,3,2,3,3,2,2), ('UMKM006','2026-06-04'::date,2,3,2,2,2,2)
) v(id_umkm,tanggal,a,b,c,d,e,f)
where not exists (select 1 from public.survei);

-- 7. KEAMANAN (RLS) ------------------------------------------
alter table public.sektor       enable row level security;
alter table public.umkm         enable row level security;
alter table public.survei       enable row level security;
alter table public.prediksi_log enable row level security;
alter table public.notifikasi   enable row level security;

drop policy if exists "baca sektor"   on public.sektor;
drop policy if exists "baca umkm"     on public.umkm;
drop policy if exists "baca survei"   on public.survei;
drop policy if exists "baca prediksi" on public.prediksi_log;
drop policy if exists "baca notif"    on public.notifikasi;
create policy "baca sektor"   on public.sektor       for select to authenticated using (true);
create policy "baca umkm"     on public.umkm         for select to authenticated using (true);
create policy "baca survei"   on public.survei       for select to authenticated using (true);
create policy "baca prediksi" on public.prediksi_log for select to authenticated using (true);
create policy "baca notif"    on public.notifikasi   for select to authenticated using (true);
-- Tanpa policy INSERT/UPDATE/DELETE: penulisan hanya lewat fungsi SECURITY DEFINER di atas.

revoke execute on function public.predict_umkm(jsonb), public.predict_saya() from public, anon;
grant  execute on function public.predict_umkm(jsonb), public.predict_saya() to authenticated;

-- 7b. VIEW UNTUK DASHBOARD (query Q5, Q7, Q8 dari modul KB-4) ---------
create or replace view public.v_ringkasan_sektor as          -- Q5: jumlah survei dan rata-rata skor per sektor
select k.nama_sektor, count(*)::int as jumlah_survei, round(avg(s.total_skor), 2) as rata_skor
from public.survei s
join public.umkm   u on u.id_umkm   = s.id_umkm
join public.sektor k on k.sektor_id = u.sektor_id
group by k.nama_sektor;

create or replace view public.v_sebaran_status as            -- Q7: sebaran status kesehatan
select public.status_kesehatan(total_skor) as status_kesehatan, count(*)::int as jumlah, min(total_skor) as skor_min
from public.survei
group by public.status_kesehatan(total_skor);

create or replace view public.v_rata_faktor as               -- Q8: rata-rata tiap faktor (grafik radar)
select round(avg(sumber_daya),2)      as sumber_daya,
       round(avg(kepemimpinan),2)     as kepemimpinan,
       round(avg(lingkungan_kerja),2) as lingkungan_kerja,
       round(avg(nilai_organisasi),2) as nilai_organisasi,
       round(avg(stabilitas),2)       as stabilitas,
       round(avg(kinerja),2)          as kinerja,
       count(*)::int                  as jumlah_survei
from public.survei;

revoke all on public.v_ringkasan_sektor, public.v_sebaran_status, public.v_rata_faktor from anon;
grant  select on public.v_ringkasan_sektor, public.v_sebaran_status, public.v_rata_faktor to authenticated;

-- Penjadwalan (pg_cron) ada di supabase/03_jadwal_cron.sql — jalankan setelah file ini selesai.
