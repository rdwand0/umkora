-- ============================================================
--  UMKORA — Skema Supabase (PostgreSQL)
--  Jalankan di: Supabase Dashboard → SQL Editor → New query → Run
--  Aman dijalankan ulang (idempotent) untuk tabel/fungsi/view.
-- ============================================================

-- 1. TABEL ---------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  umkm_name  text not null,
  email      text not null,
  role       text not null check (role in ('owner','employee')),
  lokasi     text,
  sektor     text,
  omzet      bigint,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
-- Satu UMKM hanya boleh punya satu Owner
create unique index if not exists uq_profiles_owner_umkm
  on public.profiles (lower(trim(umkm_name))) where role = 'owner';

create table if not exists public.submissions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null unique references public.profiles(id) on delete cascade, -- unique = isi sekali
  role            text not null check (role in ('owner','employee')),
  status          text not null default 'submitted',
  validation_pass boolean not null default false,
  score_ins numeric(5,4), score_ov  numeric(5,4), score_ldi numeric(5,4),
  score_weq numeric(5,4), score_ops numeric(5,4), score_ect numeric(5,4),
  score_composite numeric(5,4),
  score_on_5      numeric(4,2),
  health_category text,
  submitted_at    timestamptz not null default now()
);

create table if not exists public.answers (
  id            bigint generated always as identity primary key,
  submission_id bigint not null references public.submissions(id) on delete cascade,
  factor_key    text   not null,
  question_id   text   not null,
  answer_value  smallint not null check (answer_value between 1 and 5),
  unique (submission_id, question_id)
);

-- 2. DATA REFERENSI (6 faktor & 35 pertanyaan) ---------------
create table if not exists public.factor_def (
  key text primary key, role text not null, weight numeric not null, scale_max int not null
);
insert into public.factor_def values
  ('INS','owner',0.20,3), ('OPS','owner',0.15,5), ('ECT','owner',0.15,5),
  ('OV','employee',0.18,5), ('LDI','employee',0.17,5), ('WEQ','employee',0.15,5)
on conflict (key) do nothing;

create table if not exists public.question_def (
  question_id text primary key, factor_key text not null references public.factor_def(key)
);
insert into public.question_def
  select 'ins_oh'||g,'INS' from generate_series(1,6)   g union all
  select 'ldi_oh'||g,'LDI' from generate_series(7,12)  g union all
  select 'weq_oh'||g,'WEQ' from generate_series(13,17) g union all
  select 'ov_oh'||g, 'OV'  from generate_series(18,25) g union all
  select 'ops_oh'||g,'OPS' from generate_series(26,31) g union all
  select 'ect_oh'||g,'ECT' from generate_series(32,35) g
on conflict (question_id) do nothing;

-- 3. FUNGSI SKOR ---------------------------------------------
create or replace function public.calc_composite(i numeric, o numeric, e numeric, ov numeric, l numeric, w numeric)
returns numeric language sql immutable as $$
  select round(sum(s*wt)/sum(wt), 4)
  from (values (i,0.20),(o,0.15),(e,0.15),(ov,0.18),(l,0.17),(w,0.15)) t(s,wt)
  where s is not null
$$;

create or replace function public.health_category(c numeric)
returns text language sql immutable as $$
  select case when c >= 0.80 then 'SANGAT BAIK' when c >= 0.60 then 'BAIK'
              when c >= 0.40 then 'CUKUP' else 'PERLU PERHATIAN' end
$$;

-- 4. PROFIL OTOMATIS SAAT REGISTRASI -------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, umkm_name, email, role, lokasi, sektor, omzet)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'umkm_name'), ''), split_part(new.email,'@',1)),
    new.email,
    case when new.raw_user_meta_data->>'role' = 'employee' then 'employee' else 'owner' end,
    nullif(new.raw_user_meta_data->>'lokasi',''),
    nullif(new.raw_user_meta_data->>'sektor',''),
    nullif(new.raw_user_meta_data->>'omzet','')::bigint
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cek duplikat Owner sebelum daftar (boleh dipanggil tanpa login)
create or replace function public.owner_exists(p_umkm_name text)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where role = 'owner' and lower(trim(umkm_name)) = lower(trim(p_umkm_name)))
$$;

-- 5. SUBMIT PENILAIAN (validasi + skor dihitung di server) ----
create or replace function public.submit_assessment(p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me public.profiles; sc jsonb; r public.submissions;
  total_q int; valid_q int; own_sid bigint; owner_sid bigint; comp numeric;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Tidak terautentikasi. Silakan login.'; end if;
  if exists (select 1 from public.submissions where user_id = me.id) then
    raise exception 'Anda hanya dapat mengisi kuesioner sekali.';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Format jawaban tidak valid.';
  end if;

  -- Semua pertanyaan untuk peran ini wajib dijawab dengan nilai dalam rentang skala
  select count(*),
         count(*) filter (where case when (p_answers->>q.question_id) ~ '^[0-9]+$'
                                then (p_answers->>q.question_id)::int between 1 and f.scale_max
                                else false end)
    into total_q, valid_q
  from public.question_def q join public.factor_def f on f.key = q.factor_key
  where f.role = me.role;
  if valid_q <> total_q then
    raise exception 'Semua pertanyaan wajib dijawab dengan nilai yang valid (% dari % terjawab).', valid_q, total_q;
  end if;

  -- Skor ternormalisasi (0–1) per faktor
  select jsonb_object_agg(factor_key, ns) into sc from (
    select q.factor_key,
           round(avg((p_answers->>q.question_id)::int)::numeric / max(f.scale_max), 4) as ns
    from public.question_def q join public.factor_def f on f.key = q.factor_key
    where f.role = me.role group by q.factor_key) t;

  if me.role = 'owner' then
    comp := public.calc_composite((sc->>'INS')::numeric, (sc->>'OPS')::numeric, (sc->>'ECT')::numeric, null, null, null);
    insert into public.submissions
      (user_id, role, status, validation_pass, score_ins, score_ops, score_ect, score_composite, score_on_5, health_category)
    values (me.id, 'owner', 'submitted', true, (sc->>'INS')::numeric, (sc->>'OPS')::numeric, (sc->>'ECT')::numeric,
            comp, round(comp*5,2), public.health_category(comp))
    returning id into own_sid;
    owner_sid := own_sid;
  else
    select s.id into owner_sid from public.submissions s join public.profiles p on p.id = s.user_id
    where p.role = 'owner' and lower(trim(p.umkm_name)) = lower(trim(me.umkm_name)) limit 1;
    if owner_sid is null then
      raise exception 'Owner dari UMKM "%" belum mengisi kuesioner. Pegawai baru dapat mengisi setelah Owner.', me.umkm_name;
    end if;

    insert into public.submissions (user_id, role, status, validation_pass, score_ov, score_ldi, score_weq)
    values (me.id, 'employee', 'submitted', false, (sc->>'OV')::numeric, (sc->>'LDI')::numeric, (sc->>'WEQ')::numeric)
    returning id into own_sid;

    -- Perbarui baris Owner dengan rata-rata seluruh pegawai UMKM yang sama
    update public.submissions o set
      score_ov = a.ov, score_ldi = a.ldi, score_weq = a.weq, status = 'validated',
      score_composite = public.calc_composite(o.score_ins, o.score_ops, o.score_ect, a.ov, a.ldi, a.weq)
    from (select round(avg(e.score_ov),4) ov, round(avg(e.score_ldi),4) ldi, round(avg(e.score_weq),4) weq
          from public.submissions e join public.profiles p on p.id = e.user_id
          where e.role = 'employee' and lower(trim(p.umkm_name)) = lower(trim(me.umkm_name))) a
    where o.id = owner_sid;

    update public.submissions
       set score_on_5 = round(score_composite*5,2), health_category = public.health_category(score_composite)
     where id = owner_sid;
  end if;

  insert into public.answers (submission_id, factor_key, question_id, answer_value)
  select own_sid, q.factor_key, q.question_id, (p_answers->>q.question_id)::smallint
  from public.question_def q join public.factor_def f on f.key = q.factor_key where f.role = me.role;

  select * into r from public.submissions where id = owner_sid;

  return jsonb_build_object(
    'submission_id', own_sid,
    'scores', jsonb_strip_nulls(jsonb_build_object(
      'INS', case when r.score_ins is not null then jsonb_build_object('normScore', r.score_ins, 'scoreOn5', round(r.score_ins*5,2)) end,
      'OPS', case when r.score_ops is not null then jsonb_build_object('normScore', r.score_ops, 'scoreOn5', round(r.score_ops*5,2)) end,
      'ECT', case when r.score_ect is not null then jsonb_build_object('normScore', r.score_ect, 'scoreOn5', round(r.score_ect*5,2)) end,
      'OV',  case when r.score_ov  is not null then jsonb_build_object('normScore', r.score_ov,  'scoreOn5', round(r.score_ov*5,2))  end,
      'LDI', case when r.score_ldi is not null then jsonb_build_object('normScore', r.score_ldi, 'scoreOn5', round(r.score_ldi*5,2)) end,
      'WEQ', case when r.score_weq is not null then jsonb_build_object('normScore', r.score_weq, 'scoreOn5', round(r.score_weq*5,2)) end)),
    'composite', jsonb_build_object('composite', r.score_composite, 'scoreOn5', r.score_on_5, 'category', r.health_category)
  );
end $$;

-- 6. VIEW DAFTAR UMKM (dibaca semua user yang login) ----------
create or replace view public.v_umkm_list as
select s.id as submission_id, p.umkm_name, p.lokasi, p.sektor, p.omzet, s.role,
       s.score_composite, s.score_on_5, s.health_category, s.submitted_at,
       round(s.score_ins*5,2) as score_ins_5, round(s.score_ov*5,2)  as score_ov_5,
       round(s.score_ldi*5,2) as score_ldi_5, round(s.score_weq*5,2) as score_weq_5,
       round(s.score_ops*5,2) as score_ops_5, round(s.score_ect*5,2) as score_ect_5
from public.submissions s join public.profiles p on p.id = s.user_id
where s.validation_pass = true;

-- 7. KEAMANAN (Row Level Security) ---------------------------
alter table public.profiles    enable row level security;
alter table public.submissions enable row level security;
alter table public.answers     enable row level security;
alter table public.factor_def  enable row level security;
alter table public.question_def enable row level security;

drop policy if exists "profil sendiri"      on public.profiles;
drop policy if exists "submission sendiri"  on public.submissions;
drop policy if exists "jawaban sendiri"     on public.answers;
drop policy if exists "baca referensi"      on public.factor_def;
drop policy if exists "baca referensi"      on public.question_def;

create policy "profil sendiri"     on public.profiles    for select to authenticated using (id = auth.uid());
create policy "submission sendiri" on public.submissions for select to authenticated using (user_id = auth.uid());
create policy "jawaban sendiri"    on public.answers     for select to authenticated
  using (exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()));
create policy "baca referensi"     on public.factor_def   for select to authenticated using (true);
create policy "baca referensi"     on public.question_def for select to authenticated using (true);
-- Tidak ada policy INSERT/UPDATE/DELETE: penulisan hanya lewat submit_assessment() & trigger.

revoke all on public.v_umkm_list from anon;
grant  select on public.v_umkm_list to authenticated;
revoke execute on function public.submit_assessment(jsonb) from public, anon;
grant  execute on function public.submit_assessment(jsonb) to authenticated;
grant  execute on function public.owner_exists(text) to anon, authenticated;
