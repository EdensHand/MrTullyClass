-- MrTullyClass optional accounts and submissions, for a NEW Supabase project.
-- Run once through Supabase SQL Editor. Do NOT run this in Ms. Whitby's project.
-- Replace the teacher GitHub provider ID in the separate setup step in SETUP-ACCOUNTS.md.
begin;

create schema if not exists mrtully_private;
revoke all on schema mrtully_private from public, anon, authenticated;

create table mrtully_private.teachers (
  github_provider_id text primary key check(github_provider_id ~ '^[0-9]{1,20}$')
);
create table mrtully_private.classes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 80),
  course_id text not null check(course_id in ('CSF','CS3','AP CSA')),
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  created_at timestamptz not null default now()
);
create table mrtully_private.members (
  class_id uuid not null references mrtully_private.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check(length(btrim(display_name)) between 1 and 80),
  status text not null default 'pending' check(status in ('pending','approved','removed')),
  joined_at timestamptz not null default now(),
  primary key(class_id,user_id)
);
create index on mrtully_private.members(user_id);
alter table mrtully_private.teachers enable row level security;
alter table mrtully_private.classes enable row level security;
alter table mrtully_private.members enable row level security;
revoke all on all tables in schema mrtully_private from public,anon,authenticated;

-- GitHub IDs are read from verified Supabase auth.identities, never from editable metadata.
create function mrtully_private.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(
   select 1 from mrtully_private.teachers t
   join auth.identities i on i.provider='github' and i.provider_id=t.github_provider_id
   where i.user_id=(select auth.uid())
 );
$$;
create function mrtully_private.can_submit(p_class uuid, p_course text) returns boolean
language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null and exists (
   select 1 from mrtully_private.members m
   join mrtully_private.classes c on c.id=m.class_id
   where m.class_id=p_class and m.user_id=(select auth.uid())
     and m.status='approved' and c.course_id=p_course
 );
$$;
revoke all on function mrtully_private.is_teacher(),mrtully_private.can_submit(uuid,text) from public,anon,authenticated;

-- Account drafts are private. Only the revision-checked RPC can edit drafts.
create table public.mrtully_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check(lesson_id ~ '^[a-z0-9-]{1,200}$'),
  course_id text not null check(course_id in ('CSF','CS3','AP CSA')),
  filename text not null check(length(filename) between 1 and 128),
  source_code text not null check(length(source_code)<=100000),
  revision integer not null default 1 check(revision>=1),
  updated_at timestamptz not null default now(),
  primary key(user_id,lesson_id)
);
alter table public.mrtully_drafts enable row level security;
revoke all on public.mrtully_drafts from public,anon,authenticated;
grant select on public.mrtully_drafts to authenticated;
create policy own_draft_read on public.mrtully_drafts for select to authenticated
  using (user_id=(select auth.uid()));

create function public.mrtully_save_draft(
  p_lesson text, p_course text, p_filename text, p_source text, p_expected integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid; rev integer;
begin
  uid:=auth.uid();
  if uid is null then raise exception 'Sign-in required' using errcode='42501';end if;
  if p_lesson is null or p_lesson !~ '^[a-z0-9-]{1,200}$'
     or p_course not in ('CSF','CS3','AP CSA')
     or p_filename is null or length(p_filename) not between 1 and 128
     or p_source is null or length(p_source)>100000
     or p_expected is null or p_expected<0 then
    raise exception 'Invalid draft data' using errcode='22023';
  end if;
  if p_expected=0 then
    insert into public.mrtully_drafts(user_id,lesson_id,course_id,filename,source_code)
    values(uid,p_lesson,p_course,p_filename,p_source)
    on conflict do nothing returning revision into rev;
  else
    update public.mrtully_drafts set source_code=p_source,filename=p_filename,
      course_id=p_course,revision=revision+1,updated_at=now()
    where user_id=uid and lesson_id=p_lesson and revision=p_expected
    returning revision into rev;
  end if;
  if rev is null then raise exception 'Draft revision conflict; another device has a newer version' using errcode='P0001';end if;
  return jsonb_build_object('revision',rev);
end $$;
revoke all on function public.mrtully_save_draft(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.mrtully_save_draft(text,text,text,text,integer) to authenticated;

create table public.mrtully_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check(lesson_id ~ '^[a-z0-9-]{1,200}$'),
  course_id text not null check(course_id in ('CSF','CS3','AP CSA')),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(user_id,lesson_id)
);
alter table public.mrtully_progress enable row level security;
revoke all on public.mrtully_progress from public,anon,authenticated;
grant select,insert(user_id,lesson_id,course_id,completed),update(course_id,completed) on public.mrtully_progress to authenticated;
create policy own_progress_read on public.mrtully_progress for select to authenticated
  using(user_id=(select auth.uid()));
create policy own_progress_insert on public.mrtully_progress for insert to authenticated
  with check(user_id=(select auth.uid()));
create policy own_progress_update on public.mrtully_progress for update to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Submissions are immutable, user-owned, and only accepted from approved class members.
create table public.mrtully_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references mrtully_private.classes(id) on delete cascade,
  lesson_id text not null check(lesson_id ~ '^[a-z0-9-]{1,200}$'),
  course_id text not null check(course_id in ('CSF','CS3','AP CSA')),
  filename text not null check(length(filename) between 1 and 128),
  source_code text not null check(length(source_code)<=100000),
  submitted_at timestamptz not null default now()
);
create index on public.mrtully_submissions(user_id,submitted_at desc);
create index on public.mrtully_submissions(class_id,submitted_at desc);
alter table public.mrtully_submissions enable row level security;
revoke all on public.mrtully_submissions from public,anon,authenticated;
grant select on public.mrtully_submissions to authenticated;
grant insert(user_id,class_id,lesson_id,course_id,filename,source_code)
  on public.mrtully_submissions to authenticated;
create policy own_submission_read on public.mrtully_submissions for select to authenticated
  using(user_id=(select auth.uid()));
create policy approved_submission_insert on public.mrtully_submissions for insert to authenticated
  with check(user_id=(select auth.uid()) and mrtully_private.can_submit(class_id,course_id));

-- Private classroom RPCs; no direct student access to tables.
create function public.mrtully_my_classes() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('teacher',mrtully_private.is_teacher(),
   'classes',coalesce((
     select jsonb_agg(t.val order by t.name) from (
       select c.name,c.id,jsonb_build_object('id',c.id,'name',c.name,
         'course_id',c.course_id,'join_code',c.join_code,'role','teacher','status',null) as val
       from mrtully_private.classes c
       where c.created_by=(select auth.uid()) and mrtully_private.is_teacher()
       union all
       select c.name,c.id,jsonb_build_object('id',c.id,'name',c.name,
         'course_id',c.course_id,'role','student','status',m.status) as val
       from mrtully_private.members m join mrtully_private.classes c on c.id=m.class_id
       where m.user_id=(select auth.uid())
     ) t
   ),'[]'::jsonb));
$$;
create function public.mrtully_create_class(p_name text,p_course text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result mrtully_private.classes;
begin
 if not mrtully_private.is_teacher() then raise exception 'Teacher access denied' using errcode='42501';end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 80 or p_course not in ('CSF','CS3','AP CSA')
   then raise exception 'Invalid class name or course' using errcode='22023';end if;
 insert into mrtully_private.classes(created_by,name,course_id)
 values(auth.uid(),btrim(p_name),p_course) returning * into result;
 return jsonb_build_object('id',result.id,'name',result.name,'course_id',result.course_id,'join_code',result.join_code);
end $$;
create function public.mrtully_join_class(p_code text,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c mrtully_private.classes; m mrtully_private.members;
begin
 if auth.uid() is null then raise exception 'Sign-in required' using errcode='42501';end if;
 if p_code is null or length(btrim(p_code)) not between 1 and 20
   or p_name is null or length(btrim(p_name)) not between 1 and 80 then
   raise exception 'Invalid join code or display name' using errcode='22023';end if;
 select * into c from mrtully_private.classes where join_code=upper(btrim(p_code));
 if not found then raise exception 'Class code not found' using errcode='22023';end if;
 insert into mrtully_private.members(class_id,user_id,display_name)
 values(c.id,auth.uid(),btrim(p_name))
 on conflict(class_id,user_id) do update set display_name=excluded.display_name
 returning * into m;
 return jsonb_build_object('class_id',m.class_id,'status',m.status);
end $$;
create function public.mrtully_teacher_roster(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not mrtully_private.is_teacher() or not exists(
   select 1 from mrtully_private.classes where id=p_class and created_by=auth.uid()
 ) then raise exception 'Teacher class access denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,
   'display_name',m.display_name,'status',m.status,'joined_at',m.joined_at)
   order by m.display_name),'[]'::jsonb)
 into result from mrtully_private.members m where m.class_id=p_class;
 return result;
end $$;
create function public.mrtully_set_member_status(p_class uuid,p_student uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not mrtully_private.is_teacher() or not exists(
   select 1 from mrtully_private.classes where id=p_class and created_by=auth.uid()
 ) then raise exception 'Teacher class access denied' using errcode='42501';end if;
 if p_status not in ('approved','removed') then raise exception 'Invalid status';end if;
 update mrtully_private.members set status=p_status where class_id=p_class and user_id=p_student;
 if not found then raise exception 'Student not found';end if;
end $$;
create function public.mrtully_teacher_submissions(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not mrtully_private.is_teacher() or not exists(
   select 1 from mrtully_private.classes where id=p_class and created_by=auth.uid()
 ) then raise exception 'Teacher class access denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(row_to_json(x) order by x.submitted_at desc),'[]'::jsonb)
 into result from (
   select s.id,s.user_id,s.lesson_id,s.course_id,s.filename,s.source_code,
     s.submitted_at,m.display_name
   from public.mrtully_submissions s join mrtully_private.members m
     on m.class_id=s.class_id and m.user_id=s.user_id and m.status='approved'
   where s.class_id=p_class order by s.submitted_at desc limit 100
 ) x;
 return result;
end $$;
revoke all on function public.mrtully_my_classes(),public.mrtully_create_class(text,text),
 public.mrtully_join_class(text,text),public.mrtully_teacher_roster(uuid),
 public.mrtully_set_member_status(uuid,uuid,text),public.mrtully_teacher_submissions(uuid)
 from public,anon,authenticated;
grant execute on function public.mrtully_my_classes(),public.mrtully_create_class(text,text),
 public.mrtully_join_class(text,text),public.mrtully_teacher_roster(uuid),
 public.mrtully_set_member_status(uuid,uuid,text),public.mrtully_teacher_submissions(uuid)
 to authenticated;

-- Verified GitHub identity of the current signed-in user.
-- Used server-side before any GitHub repository write.
create function public.mrtully_my_github_provider_id() returns text
language sql stable security definer set search_path='' as $
  select i.provider_id
  from auth.identities i
  where i.user_id=(select auth.uid()) and i.provider='github'
  order by i.updated_at desc limit 1
$;
revoke all on function public.mrtully_my_github_provider_id() from public,anon,authenticated;
grant execute on function public.mrtully_my_github_provider_id() to authenticated;

commit;
