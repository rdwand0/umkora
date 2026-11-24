-- Redam — skema Supabase untuk asesmen DAR-5. Jalankan di SQL Editor. Aman dijalankan ulang.
-- DAR-5: 5 butir, skala 1-5, total 5-25, ambang skrining >= 12 (Forbes et al., 2014).
create table if not exists public.dar5_assessments (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  age_range   text check (age_range in ('<18','18-24','25-34','35-44','45-54','55+')),
  answers     jsonb not null,
  total       smallint not null check (total between 5 and 25),
  safety_flag boolean not null default false
);
create index if not exists idx_dar5_user on public.dar5_assessments (user_id, created_at);

alter table public.dar5_assessments enable row level security;
drop policy if exists "baca milik sendiri"  on public.dar5_assessments;
drop policy if exists "hapus milik sendiri" on public.dar5_assessments;
create policy "baca milik sendiri"  on public.dar5_assessments for select to authenticated using (user_id = auth.uid());
create policy "hapus milik sendiri" on public.dar5_assessments for delete to authenticated using (user_id = auth.uid());
-- Tanpa policy INSERT/UPDATE: penulisan hanya lewat fungsi di bawah (skor dihitung di server).

create or replace function public.submit_dar5(p_age_range text, p_answers jsonb, p_safety boolean)
returns void language plpgsql security definer set search_path = public as $$
declare i int; s int := 0;
begin
  if auth.uid() is null then raise exception 'Silakan masuk terlebih dahulu'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'Format tidak valid'; end if;
  for i in 1..5 loop
    if (p_answers->>('q'||i)) !~ '^[1-5]$' then raise exception 'Jawaban q% tidak valid', i; end if;
    s := s + (p_answers->>('q'||i))::int;
  end loop;
  insert into public.dar5_assessments (user_id, age_range, answers, total, safety_flag)
  values (auth.uid(), nullif(p_age_range, ''), jsonb_build_object('q1',p_answers->'q1','q2',p_answers->'q2','q3',p_answers->'q3','q4',p_answers->'q4','q5',p_answers->'q5'), s, coalesce(p_safety, false));
end $$;

revoke all on function public.submit_dar5(text, jsonb, boolean) from public, anon;
grant execute on function public.submit_dar5(text, jsonb, boolean) to authenticated;
