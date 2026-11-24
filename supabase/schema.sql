-- Vetta database: accounts, profiles, videos, Drops, brands, Tasks, messages, moderation.
-- This runs automatically on the first deploy (scripts/migrate.mjs). You can also paste it into
-- Supabase > SQL Editor > New query and Run it once on a fresh project.

create extension if not exists pgcrypto;
create extension if not exists pg_net;  -- lets the database send email alerts

-- ===================================================================== tables

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null default 'creator' check (role in ('creator','brand','admin')),
  handle text not null unique check (handle ~ '^[a-z0-9._]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 220),
  location text not null default '' check (char_length(location) <= 160),
  city text check (char_length(city) <= 60),
  region text check (char_length(region) <= 60),
  country text check (char_length(country) <= 60),
  work_mode text check (work_mode in ('remote','onsite','hybrid')),
  tier text check (tier in ('nano','micro','mid','macro','mega')),
  open_to_travel boolean not null default false,
  links jsonb not null default '[]',
  niches text[] not null default '{}',
  formats text[] not null default '{}',
  metrics jsonb not null default '[]',
  vetted boolean not null default false,
  vetted_drop text,
  status text not null default 'active' check (status in ('active','suspended','banned')),
  plan text not null default 'free' check (plan in ('free','pro')),
  company text, website text, job_title text,
  -- rates in USD, set by the creator
  rate_from integer check (rate_from >= 0), rate_to integer check (rate_to >= 0),
  -- scorecard, set only by Vetta from delivered work
  jobs_done integer not null default 0,
  on_time_pct smallint check (on_time_pct between 0 and 100),
  brand_rating numeric(2,1) check (brand_rating between 0 and 5),
  hook_rate smallint check (hook_rate between 0 and 100),
  repeat_brands integer not null default 0
);
create index on public.profiles using gin (niches);

-- Emails live apart from profiles so they're never exposed publicly.
create table public.account_emails (user_id uuid primary key references auth.users(id) on delete cascade, email text not null);

create table public.settings (
  id int primary key default 1 check (id = 1),
  notify_email text not null default '',
  resend_key text not null default '',
  from_email text not null default '',      -- e.g. Vetta <hello@yourdomain.com>, a domain verified in Resend
  site_url text not null default '',        -- your live link, used in follow-up emails
  drop_applied integer not null default 0,  -- published on the About page
  drop_accepted integer not null default 0
);
insert into public.settings (id) values (1);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  stream_uid text unique,
  playback_url text, thumbnail_url text, duration numeric,
  caption text not null default '' check (char_length(caption) <= 300),
  niches text[] not null default '{}',
  kind text not null default 'post' check (kind in ('entry','post')),
  status text not null default 'processing' check (status in ('processing','ready','hidden','removed')),
  like_count integer not null default 0
);
create index on public.videos (status, kind, created_at desc);
create index on public.videos (owner_id);

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  drop text not null,
  country text not null check (char_length(country) <= 80),
  city text check (char_length(city) <= 80),
  region text check (char_length(region) <= 80),
  work_mode text check (work_mode in ('remote','onsite','hybrid')),
  tier text check (tier in ('nano','micro','mid','macro','mega')),
  handles text not null check (char_length(handles) <= 300),
  level text not null,
  niches text[] not null default '{}',
  formats text[] not null default '{}',
  brands_worked text check (char_length(brands_worked) <= 500),
  best_result text check (char_length(best_result) <= 300),
  showcase_video_id uuid references public.videos(id) on delete set null,
  showcase_url text check (char_length(showcase_url) <= 500),
  showcase_note text check (char_length(showcase_note) <= 1000),
  work_links jsonb not null default '[]',
  consent_feature boolean not null default false check (consent_feature),
  consent_terms boolean not null default false check (consent_terms),
  status text not null default 'new' check (status in ('new','shortlisted','selected','declined')),
  score_craft smallint check (score_craft between 1 and 5),
  score_creativity smallint check (score_creativity between 1 and 5),
  score_proof smallint check (score_proof between 1 and 5),
  notes text,
  unique (user_id, drop),
  check (showcase_video_id is not null or showcase_url is not null)
);

create table public.shortlists (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  brand_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  creator_ids uuid[] not null default '{}'
);

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  brand_id uuid references public.profiles(id) on delete set null,
  creator_id uuid references public.profiles(id) on delete set null,
  company text not null check (char_length(company) <= 160),
  contact_name text not null check (char_length(contact_name) <= 120),
  email text not null check (char_length(email) <= 200),
  niches text[] not null default '{}',
  budget text not null, timeline text not null,
  brief text not null check (char_length(brief) between 20 and 5000),
  -- draft = matched but not booked yet (gets follow-ups); new = sent to Vetta
  status text not null default 'new' check (status in ('draft','new','in_talks','won','closed')),
  token uuid not null default gen_random_uuid(),
  city text check (char_length(city) <= 60),
  work_mode text check (work_mode in ('remote','onsite','hybrid')),
  whatsapp text check (char_length(whatsapp) <= 30),
  whatsapp_optin boolean not null default false,
  matched uuid[] not null default '{}',
  picked uuid[] not null default '{}',
  followup_stage smallint not null default 0,
  unsubscribed boolean not null default false,
  confirmed_at timestamptz
);
create index on public.briefs (status, created_at);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  brand text not null, title text not null,
  type text not null default 'ugc' check (type in ('ugc','clip','post','review','mention','stitch','repost','event')),
  description text not null default '',
  -- flat = fee per post; per_1k_views = pay per 1,000 verified views; hybrid = base fee plus a views bonus
  pay_model text not null default 'flat' check (pay_model in ('per_1k_views','flat','hybrid')),
  rate numeric(10,2) not null check (rate >= 0),
  base_fee numeric(10,2) not null default 0 check (base_fee >= 0),
  budget numeric(12,2) not null default 0,
  slots integer, min_views integer not null default 0,
  platforms text[] not null default '{}',
  rules text not null default '', source_url text,
  status text not null default 'pending' check (status in ('pending','live','ended','rejected')),
  niches text[] not null default '{}',
  deliverables text check (char_length(deliverables) <= 300),
  deadline date,
  location_mode text not null default 'remote' check (location_mode in ('remote','onsite','hybrid')),
  location_city text,
  vetted_only boolean not null default false,
  assets jsonb not null default '[]'
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null, kind text not null default 'guide' check (kind in ('guide','template','video','live','checklist')),
  summary text not null default '', body text not null default '', url text,
  tags text[] not null default '{}', published boolean not null default true
);

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_url text not null check (char_length(post_url) <= 500),
  claimed_views integer, verified_views integer,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  unique (task_id, post_url)
);

-- Every account has one conversation with the Vetta team. Brands and creators never message each other.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  last_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000)
);
create index on public.messages (conversation_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile','video','message')),
  target_id uuid not null,
  reason text not null check (char_length(reason) <= 300),
  status text not null default 'open' check (status in ('open','resolved'))
);

-- ===================================================================== helpers

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;
create or replace function public.is_active() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;
create or replace function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function public.is_public_creator(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p and role = 'creator' and vetted and status = 'active');
$$;
grant execute on function public.is_admin(), public.is_active(), public.my_role(), public.is_public_creator(uuid) to anon, authenticated;

-- New sign-up -> profile. Role can only be creator or brand; admins are made by hand (see the end of this file).
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base text; h text; n int := 0; r text; nm text;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'creator'); if r not in ('creator','brand') then r := 'creator'; end if;
  nm := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)), 60);
  base := left(regexp_replace(lower(nm), '[^a-z0-9]+', '.', 'g'), 18); base := trim(both '.' from base);
  if char_length(base) < 3 then base := 'creator'; end if;
  -- The very first account on a new site becomes the admin.
  if not exists (select 1 from public.profiles where role = 'admin') then r := 'admin'; end if;
  h := base;
  while exists (select 1 from public.profiles where handle = h) loop n := n + 1; h := base || n::text; end loop;
  insert into public.profiles (id, role, handle, display_name, company)
    values (new.id, r, h, nm, nullif(new.raw_user_meta_data->>'company', ''));
  if r = 'admin' then update public.profiles set vetted = true where id = new.id; end if;
  insert into public.account_emails (user_id, email) values (new.id, lower(new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Users can edit their profile, but never their role, badge, status or plan.
create or replace function public.protect_profile() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.role := old.role; new.vetted := old.vetted; new.vetted_drop := old.vetted_drop; new.status := old.status; new.plan := old.plan;
    new.jobs_done := old.jobs_done; new.on_time_pct := old.on_time_pct; new.brand_rating := old.brand_rating;
    new.hook_rate := old.hook_rate; new.repeat_brands := old.repeat_brands;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile();

-- Owners can edit a caption or hide their own video; nothing else.
create or replace function public.protect_video() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.status not in ('ready','hidden') or old.status not in ('ready','hidden') then new.status := old.status; end if;
    new.owner_id := old.owner_id; new.kind := old.kind; new.stream_uid := old.stream_uid; new.playback_url := old.playback_url;
    new.thumbnail_url := old.thumbnail_url; new.like_count := old.like_count;
  end if;
  return new;
end $$;
create trigger videos_protect before update on public.videos for each row execute function public.protect_video();

create or replace function public.count_likes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.videos set like_count = (select count(*) from public.likes where video_id = coalesce(new.video_id, old.video_id))
    where id = coalesce(new.video_id, old.video_id);
  return null;
end $$;
create trigger likes_count after insert or delete on public.likes for each row execute function public.count_likes();

create or replace function public.touch_conversation() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.conversations set last_at = now() where id = new.conversation_id; return new; end $$;
create trigger messages_touch after insert on public.messages for each row execute function public.touch_conversation();

-- The signed-in user's thread with the Vetta team (created on first use).
create or replace function public.my_thread() returns public.conversations language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  if not public.is_active() then raise exception 'Log in with an active account.'; end if;
  insert into public.conversations (user_id) values (auth.uid()) on conflict (user_id) do update set last_at = public.conversations.last_at returning * into c;
  return c;
end $$;
grant execute on function public.my_thread() to authenticated;

create or replace function public.public_settings() returns json language sql stable security definer set search_path = public as $$
  select json_build_object('drop_applied', drop_applied, 'drop_accepted', drop_accepted) from public.settings where id = 1;
$$;
grant execute on function public.public_settings() to anon, authenticated;

-- Creators register a video they uploaded to the "videos" storage bucket.
create or replace function public.create_video(p_url text, p_caption text, p_niches text[], p_kind text) returns public.videos language plpgsql security definer set search_path = public as $$
declare v public.videos; recent int;
begin
  if not public.is_active() or public.my_role() not in ('creator','admin') then raise exception 'Only creator accounts can upload videos.'; end if;
  if position('/storage/v1/object/public/videos/' || auth.uid()::text || '/' in p_url) = 0 then raise exception 'That upload is not yours.'; end if;
  select count(*) into recent from public.videos where owner_id = auth.uid() and created_at > now() - interval '1 hour';
  if recent >= 10 then raise exception 'You''ve uploaded a lot in the last hour. Try again later.'; end if;
  insert into public.videos (owner_id, playback_url, caption, niches, kind, status)
    values (auth.uid(), p_url, left(coalesce(p_caption, ''), 300), coalesce(p_niches[1:3], '{}'), case when p_kind = 'entry' then 'entry' else 'post' end, 'ready')
    returning * into v;
  return v;
end $$;
grant execute on function public.create_video(text, text, text[], text) to authenticated;

create or replace function public.remove_video(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.videos set status = 'removed' where id = p_id and (owner_id = auth.uid() or public.is_admin());
end $$;
grant execute on function public.remove_video(uuid) to authenticated;

-- Admin: suspend, ban or restore an account. A ban also blocks login and hides their videos.
create or replace function public.admin_set_status(p_user uuid, p_status text) returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_status not in ('active','suspended','banned') then raise exception 'Bad status.'; end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then raise exception 'You can''t change an admin''s status.'; end if;
  update public.profiles set status = p_status where id = p_user;
  if p_status = 'banned' then update public.videos set status = 'hidden' where owner_id = p_user and status = 'ready'; end if;
  begin
    update auth.users set banned_until = case when p_status = 'banned' then now() + interval '100 years' else null end where id = p_user;
  exception when others then raise warning 'Login block not applied: %', sqlerrm;
  end;
end $$;
grant execute on function public.admin_set_status(uuid, text) to authenticated;

-- Admin: list users with their emails.
create or replace function public.admin_users(p_q text default '', p_role text default null) returns setof json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query select (to_jsonb(p) || jsonb_build_object('email', e.email))::json
    from public.profiles p left join public.account_emails e on e.user_id = p.id
    where (p_role is null or p.role = p_role)
      and (coalesce(p_q, '') = '' or p.display_name ilike '%' || p_q || '%' or p.handle ilike '%' || p_q || '%' or e.email ilike '%' || p_q || '%')
    order by p.created_at desc limit 500;
end $$;
grant execute on function public.admin_users(text, text) to authenticated;

-- Admin: vet a creator from their Drop entry. Profile goes public; entry video joins the feed.
create or replace function public.admin_vet(p_entry uuid) returns void language plpgsql security definer set search_path = public as $$
declare e public.entries;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select * into e from public.entries where id = p_entry; if e.id is null then raise exception 'Entry not found.'; end if;
  update public.profiles set vetted = true, vetted_drop = e.drop,
    niches = case when niches = '{}' then e.niches else niches end,
    formats = case when formats = '{}' then e.formats else formats end,
    city = coalesce(city, nullif(e.city, '')), region = coalesce(region, nullif(e.region, '')), country = coalesce(country, e.country),
    work_mode = coalesce(work_mode, e.work_mode), tier = coalesce(tier, e.tier),
    location = case when location = '' then concat_ws(', ', nullif(e.city, ''), nullif(e.region, ''), e.country) else location end
    where id = e.user_id;
  update public.videos set kind = 'post' where id = e.showcase_video_id and status in ('ready','processing');
  update public.entries set status = 'selected' where id = e.id;
end $$;
grant execute on function public.admin_vet(uuid) to authenticated;

-- ===================================================================== email alerts
create or replace function public.send_alert(subject text, body text) returns void language plpgsql security definer set search_path = public as $$
declare s public.settings;
begin
  select * into s from public.settings where id = 1;
  if s.notify_email = '' or s.resend_key = '' then return; end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || s.resend_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object('from', 'Vetta <onboarding@resend.dev>', 'to', jsonb_build_array(s.notify_email), 'subject', subject, 'text', body));
exception when others then raise warning 'Vetta alert not sent: %', sqlerrm;
end $$;
revoke execute on function public.send_alert(text, text) from public, anon, authenticated;

create or replace function public.alert_on_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if tg_table_name = 'entries' then
    select display_name || ' (@' || handle || ')' into who from public.profiles where id = new.user_id;
    perform public.send_alert('New ' || new.drop || ' entry: ' || who, who || ' from ' || new.country || ' entered ' || new.drop || '.' || chr(10) || 'Niches: ' || array_to_string(new.niches, ', ') || chr(10) || 'Review it in Admin > Entries.');
  elsif tg_table_name = 'briefs' then
    if new.status = 'new' then
      perform public.send_alert('New brief: ' || new.company, new.contact_name || ' (' || new.email || ') from ' || new.company || chr(10) || new.budget || ', ' || new.timeline
        || case when new.whatsapp_optin and coalesce(new.whatsapp, '') <> '' then chr(10) || 'WhatsApp: ' || new.whatsapp else '' end || chr(10) || chr(10) || new.brief);
    end if;
  elsif tg_table_name = 'tasks' then
    if new.status = 'pending' then
      perform public.send_alert('Campaign to review: ' || new.title, new.brand || ' posted a ' || new.type || ' campaign with a $' || new.budget || ' budget. Approve it in Admin > Campaigns.');
    end if;
  elsif tg_table_name = 'messages' and not exists (select 1 from public.profiles where id = new.sender_id and role = 'admin') then
    select display_name || ' (@' || handle || ')' into who from public.profiles where id = new.sender_id;
    perform public.send_alert('New message from ' || who, left(new.body, 1000) || chr(10) || chr(10) || 'Reply in Admin > Messages.');
  elsif tg_table_name = 'reports' then
    perform public.send_alert('New report: ' || new.reason, 'A ' || new.target_type || ' was reported. Review it in Admin > Reports.');
  end if;
  return new;
end $$;
create trigger entries_alert after insert on public.entries for each row execute function public.alert_on_insert();
create trigger briefs_alert after insert on public.briefs for each row execute function public.alert_on_insert();
create trigger briefs_confirm_alert after update of status on public.briefs for each row
  when (old.status = 'draft' and new.status = 'new') execute function public.alert_on_insert();
create trigger tasks_alert after insert on public.tasks for each row execute function public.alert_on_insert();
create trigger reports_alert after insert on public.reports for each row execute function public.alert_on_insert();
create trigger messages_alert after insert on public.messages for each row execute function public.alert_on_insert();

-- ===================================================================== instant matching
-- Public card for a matched creator: no private fields.
create or replace function public.creator_card(p public.profiles) returns json language sql stable as $$
  select json_build_object('id', p.id, 'handle', p.handle, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
    'niches', p.niches, 'formats', p.formats, 'city', p.city, 'country', p.country, 'work_mode', p.work_mode, 'tier', p.tier,
    'rate_from', p.rate_from, 'rate_to', p.rate_to, 'jobs_done', p.jobs_done, 'on_time_pct', p.on_time_pct,
    'brand_rating', p.brand_rating, 'hook_rate', p.hook_rate, 'vetted', p.vetted);
$$;

create or replace function public.budget_cap(p_budget text) returns integer language sql immutable as $$
  select case p_budget when 'Under $500' then 500 when '$500 to $2,000' then 2000 when '$2,000 to $10,000' then 10000 else null end;
$$;

-- Best vetted creators for a brief: niche fit first, then place, budget and track record.
create or replace function public.match_creators(p_niches text[], p_city text, p_mode text, p_budget text, p_creator uuid default null, p_limit int default 5)
returns setof json language sql stable security definer set search_path = public as $$
  select public.creator_card(p) from public.profiles p
  where p.role = 'creator' and p.vetted and p.status = 'active'
    and (p.id = p_creator or coalesce(cardinality(p_niches), 0) = 0 or p.niches && p_niches)
  order by (p.id = p_creator) desc nulls last,
    (cardinality(array(select unnest(p.niches) intersect select unnest(coalesce(p_niches, '{}')))) * 3
     + case when coalesce(p_city, '') <> '' and lower(p.city) = lower(p_city) then 2 else 0 end
     + case when p_mode = 'remote' or p.work_mode in ('onsite','hybrid') or p.open_to_travel then 1 else 0 end
     + case when public.budget_cap(p_budget) is null or p.rate_from is null or p.rate_from <= public.budget_cap(p_budget) then 2 else -2 end
     + coalesce(p.brand_rating, 0) / 2 + least(p.jobs_done, 10) / 5.0) desc,
    p.created_at
  limit greatest(1, least(p_limit, 8));
$$;
grant execute on function public.match_creators(text[], text, text, text, uuid, int) to anon, authenticated;

-- Step 1 of a brief: save it as a draft and return matched creators straight away. No account needed.
create or replace function public.start_brief(p jsonb) returns json language plpgsql security definer set search_path = public as $$
declare b public.briefs; m json; ids uuid[]; recent int;
begin
  if coalesce(p->>'email', '') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Add a work email we can reply to.'; end if;
  if coalesce(trim(p->>'company'), '') = '' or coalesce(trim(p->>'contact_name'), '') = '' then raise exception 'Add your name and company.'; end if;
  select count(*) into recent from public.briefs where email = lower(trim(p->>'email')) and created_at > now() - interval '1 hour';
  if recent >= 5 then raise exception 'You''ve sent a lot of briefs in the last hour. Try again later.'; end if;
  select coalesce(json_agg(x), '[]'::json) into m from public.match_creators(
    array(select jsonb_array_elements_text(coalesce(p->'niches', '[]'))), p->>'city', p->>'work_mode', p->>'budget', nullif(p->>'creator_id', '')::uuid) x;
  select coalesce(array_agg((e->>'id')::uuid), '{}') into ids from json_array_elements(m) e;
  insert into public.briefs (brand_id, creator_id, company, contact_name, email, niches, budget, timeline, brief, status, city, work_mode, whatsapp, whatsapp_optin, matched)
  values (auth.uid(), nullif(p->>'creator_id', '')::uuid, left(trim(p->>'company'), 160), left(trim(p->>'contact_name'), 120), lower(trim(p->>'email')),
    array(select jsonb_array_elements_text(coalesce(p->'niches', '[]'))), p->>'budget', coalesce(nullif(p->>'timeline', ''), 'Flexible'), coalesce(p->>'brief', ''), 'draft',
    nullif(trim(p->>'city'), ''), nullif(p->>'work_mode', ''), nullif(trim(p->>'whatsapp'), ''), coalesce((p->>'whatsapp_optin')::boolean, false), ids)
  returning * into b;
  return json_build_object('id', b.id, 'token', b.token, 'matches', m);
end $$;
grant execute on function public.start_brief(jsonb) to anon, authenticated;

-- Reopen a draft from the link in a follow-up email.
create or replace function public.get_brief(p_id uuid, p_token uuid) returns json language plpgsql stable security definer set search_path = public as $$
declare b public.briefs; m json;
begin
  select * into b from public.briefs where id = p_id and token = p_token; if b.id is null then raise exception 'This link has expired.'; end if;
  select coalesce(json_agg(public.creator_card(p)), '[]'::json) into m from public.profiles p where p.id = any(b.matched) and p.vetted and p.status = 'active';
  return json_build_object('id', b.id, 'token', b.token, 'company', b.company, 'contact_name', b.contact_name, 'email', b.email,
    'status', b.status, 'unsubscribed', b.unsubscribed, 'matches', m);
end $$;
grant execute on function public.get_brief(uuid, uuid) to anon, authenticated;

-- Step 2: the brand books through Vetta. The brief goes to the team and follow-ups stop.
create or replace function public.confirm_brief(p_id uuid, p_token uuid, p_picked uuid[]) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.briefs set status = 'new', picked = coalesce(p_picked, '{}'), confirmed_at = now(),
    brand_id = coalesce(brand_id, case when public.my_role() = 'brand' then auth.uid() end)
  where id = p_id and token = p_token and status = 'draft';
end $$;
grant execute on function public.confirm_brief(uuid, uuid, uuid[]) to anon, authenticated;

create or replace function public.stop_brief_emails(p_id uuid, p_token uuid) returns void language plpgsql security definer set search_path = public as $$
begin update public.briefs set unsubscribed = true where id = p_id and token = p_token; end $$;
grant execute on function public.stop_brief_emails(uuid, uuid) to anon, authenticated;

-- ===================================================================== follow-ups for brands who match but don't book
-- 15 minutes, 24 hours and 72 hours after a draft brief. Stops when they book or tap "stop these emails".
create or replace function public.send_brief_followups() returns integer language plpgsql security definer set search_path = public as $$
declare s public.settings; b public.briefs; n int := 0; link text; names text; first text; subj text; body text;
begin
  select * into s from public.settings where id = 1;
  if s.resend_key = '' or s.from_email = '' or s.site_url = '' then return 0; end if;
  for b in select * from public.briefs where status = 'draft' and not unsubscribed and followup_stage < 3
      and created_at > now() - interval '10 days'
      and ((followup_stage = 0 and created_at < now() - interval '15 minutes')
        or (followup_stage = 1 and created_at < now() - interval '24 hours')
        or (followup_stage = 2 and created_at < now() - interval '72 hours'))
      order by created_at limit 50 loop
    link := rtrim(s.site_url, '/') || '/brief/' || b.id || '.' || b.token;
    first := split_part(b.contact_name, ' ', 1);
    select string_agg(display_name, ', ') into names from public.profiles where id = any(b.matched);
    if b.followup_stage = 0 then
      subj := 'Your Vetta matches for ' || b.company;
      body := 'Hi ' || first || ',' || chr(10) || chr(10)
        || 'Your brief matched with ' || coalesce(names, 'vetted creators') || '.' || chr(10)
        || 'Their work, rates and track record are here: ' || link || chr(10) || chr(10)
        || 'When you''re ready, tap "Book through Vetta". We tailor the brief to each creator, agree timelines and handle approvals, so you only see the final work.' || chr(10) || chr(10)
        || 'Samuel' || chr(10) || 'Founder, Vetta';
    elsif b.followup_stage = 1 then
      subj := 'How your ' || b.company || ' creators were chosen';
      body := 'Hi ' || first || ',' || chr(10) || chr(10)
        || 'Every creator on Vetta got in on creativity and reliability, not follower count. Most people who apply don''t make it.' || chr(10)
        || 'If a video misses the brief, we reshoot it or replace the creator.' || chr(10) || chr(10)
        || 'Your matches are still here: ' || link || chr(10) || chr(10)
        || 'Questions? Just reply to this email.' || chr(10) || chr(10) || 'Samuel, Vetta';
    else
      subj := 'Last note about your ' || b.company || ' brief';
      body := 'Hi ' || first || ',' || chr(10) || chr(10)
        || 'I''ll stop emailing about this brief after today. Good creators book up, so if the timing works, lock them in here: ' || link || chr(10) || chr(10)
        || 'Or reply with what you need and I''ll put a shortlist together myself.' || chr(10) || chr(10) || 'Samuel, Vetta';
    end if;
    body := body || chr(10) || chr(10) || 'Don''t want these emails? Open the link above and tap "Stop these emails".';
    begin
      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object('Authorization', 'Bearer ' || s.resend_key, 'Content-Type', 'application/json'),
        body := jsonb_build_object('from', s.from_email, 'to', jsonb_build_array(b.email), 'subject', subj, 'text', body)
          || case when s.notify_email <> '' then jsonb_build_object('reply_to', s.notify_email) else '{}'::jsonb end);
    exception when others then raise warning 'Follow-up not sent: %', sqlerrm;
    end;
    update public.briefs set followup_stage = followup_stage + 1 where id = b.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.send_brief_followups() from public, anon, authenticated;

-- Run the follow-ups every 5 minutes (pg_cron is built into Supabase).
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('vetta-followups', '*/5 * * * *', 'select public.send_brief_followups()');
exception when others then raise warning 'Follow-up schedule not set: %', sqlerrm;
end $$;

-- ===================================================================== row level security
alter table public.profiles enable row level security;
alter table public.account_emails enable row level security;
alter table public.settings enable row level security;
alter table public.videos enable row level security;
alter table public.likes enable row level security;
alter table public.entries enable row level security;
alter table public.shortlists enable row level security;
alter table public.briefs enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.resources enable row level security;

-- Profiles: vetted creators and brands are public; everyone sees themselves; admins see all.
create policy profiles_read on public.profiles for select using (
  (status = 'active' and ((role = 'creator' and vetted) or role = 'brand'))
  or id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update using (id = auth.uid() and status = 'active') with check (id = auth.uid());
create policy profiles_admin on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy emails_self on public.account_emails for select using (user_id = auth.uid() or public.is_admin());
create policy settings_admin on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- Videos: public when ready and the owner is a vetted creator. Uploads only happen through the vetta-api function.
create policy videos_read on public.videos for select using (
  (status = 'ready' and kind = 'post' and public.is_public_creator(owner_id)) or owner_id = auth.uid() or public.is_admin());
create policy videos_update_own on public.videos for update using (owner_id = auth.uid() and public.is_active()) with check (owner_id = auth.uid());
create policy videos_admin on public.videos for all using (public.is_admin()) with check (public.is_admin());

create policy likes_own on public.likes for select using (user_id = auth.uid());
create policy likes_insert on public.likes for insert with check (user_id = auth.uid() and public.is_active());
create policy likes_delete on public.likes for delete using (user_id = auth.uid());

create policy entries_insert on public.entries for insert with check (
  user_id = auth.uid() and public.is_active() and public.my_role() = 'creator' and status = 'new'
  and score_craft is null and score_creativity is null and score_proof is null and notes is null
  and (showcase_video_id is null or exists (select 1 from public.videos v where v.id = showcase_video_id and v.owner_id = auth.uid())));
create policy entries_read on public.entries for select using (user_id = auth.uid() or public.is_admin());
create policy entries_admin on public.entries for update using (public.is_admin()) with check (public.is_admin());

create policy shortlists_own on public.shortlists for all using (brand_id = auth.uid() and public.is_active())
  with check (brand_id = auth.uid() and public.my_role() = 'brand' and public.is_active());

create policy briefs_insert on public.briefs for insert to anon, authenticated with check (status = 'new' and followup_stage = 0 and (brand_id is null or brand_id = auth.uid()));
create policy briefs_read on public.briefs for select using ((brand_id is not null and brand_id = auth.uid() and status <> 'draft') or public.is_admin());
create policy briefs_admin on public.briefs for update using (public.is_admin()) with check (public.is_admin());

create policy tasks_read on public.tasks for select using (status = 'live' or created_by = auth.uid() or public.is_admin());
create policy tasks_propose on public.tasks for insert with check (
  (created_by = auth.uid() and status = 'pending' and public.my_role() = 'brand' and public.is_active()) or public.is_admin());
create policy tasks_admin on public.tasks for update using (public.is_admin()) with check (public.is_admin());

create policy subs_insert on public.task_submissions for insert with check (
  user_id = auth.uid() and public.my_role() = 'creator' and public.is_active() and status = 'pending' and verified_views is null
  and exists (select 1 from public.tasks t where t.id = task_id and t.status = 'live' and (not t.vetted_only or public.is_public_creator(auth.uid()))));
create policy subs_read on public.task_submissions for select using (
  user_id = auth.uid() or public.is_admin() or exists (select 1 from public.tasks t where t.id = task_id and t.created_by = auth.uid()));
create policy subs_admin on public.task_submissions for update using (public.is_admin()) with check (public.is_admin());

create policy convs_read on public.conversations for select using (user_id = auth.uid() or public.is_admin());
create policy msgs_read on public.messages for select using (
  public.is_admin() or exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy msgs_insert on public.messages for insert with check (
  sender_id = auth.uid() and public.is_active()
  and (public.is_admin() or exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())));

-- Learn: only vetted creators (and admins) can read it.
create policy resources_read on public.resources for select using (published and (public.is_admin() or public.is_public_creator(auth.uid())));
create policy resources_admin on public.resources for all using (public.is_admin()) with check (public.is_admin());

create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid() and public.is_active());
create policy reports_admin on public.reports for all using (public.is_admin()) with check (public.is_admin());

-- ===================================================================== storage: profile photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy avatars_own_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_update on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_admin on storage.objects for all to authenticated using (bucket_id = 'avatars' and public.is_admin()) with check (bucket_id = 'avatars' and public.is_admin());

-- Creator videos (used unless you switch on Cloudflare Stream). 50 MB per file on Supabase's free plan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4','video/quicktime','video/webm']) on conflict (id) do nothing;
create policy videos_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text and public.my_role() in ('creator','admin') and public.is_active());
create policy videos_own_delete on storage.objects for delete to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy videos_admin on storage.objects for all to authenticated using (bucket_id = 'videos' and public.is_admin()) with check (bucket_id = 'videos' and public.is_admin());

-- Campaign files brands upload (product shots, logos, reference videos), up to 50 MB each.
insert into storage.buckets (id, name, public, file_size_limit)
values ('campaign-assets', 'campaign-assets', true, 52428800) on conflict (id) do nothing;
create policy assets_brand_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'campaign-assets' and (storage.foldername(name))[1] = auth.uid()::text and public.my_role() in ('brand','admin') and public.is_active());
create policy assets_admin on storage.objects for all to authenticated using (bucket_id = 'campaign-assets' and public.is_admin()) with check (bucket_id = 'campaign-assets' and public.is_admin());

-- ===================================================================== admin
-- The first account created on the live site becomes the admin automatically (see handle_new_user).
-- To make someone else an admin later, run this with their email:
--    update public.profiles set role = 'admin', vetted = true where id = (select user_id from public.account_emails where email = 'THEIR-EMAIL');

-- Records which update files in supabase/migrations have run (used by scripts/migrate.mjs).
create table if not exists public._vetta_migrations (name text primary key, ran_at timestamptz not null default now());
alter table public._vetta_migrations enable row level security;
