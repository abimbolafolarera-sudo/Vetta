-- Instant Brief Upgrade: paid by card (Paystack), researched and written automatically, shown in minutes.
alter table public.briefs add column if not exists upgrade_status text not null default 'none';
alter table public.briefs drop constraint if exists briefs_upgrade_status_check;
alter table public.briefs add constraint briefs_upgrade_status_check check (upgrade_status in ('none','requested','paid','running','ready','failed'));
alter table public.briefs add column if not exists upgrade_report jsonb;
alter table public.briefs add column if not exists upgrade_ref text;
alter table public.briefs add column if not exists upgrade_paid_at timestamptz;
alter table public.briefs add column if not exists upgrade_started_at timestamptz;
create unique index if not exists briefs_upgrade_ref_key on public.briefs (upgrade_ref) where upgrade_ref is not null;
alter table public.settings add column if not exists upgrade_amount numeric not null default 0;
alter table public.settings add column if not exists upgrade_currency text not null default 'NGN';

create or replace function public.public_settings() returns json language sql stable security definer set search_path = public as $$
  select json_build_object('drop_applied', drop_applied, 'drop_accepted', drop_accepted, 'upgrade_price', upgrade_price, 'upgrade_link', upgrade_link,
    'upgrade_amount', upgrade_amount, 'upgrade_currency', upgrade_currency) from public.settings where id = 1;
$$;

create or replace function public.get_brief(p_id uuid, p_token uuid) returns json language plpgsql stable security definer set search_path = public as $$
declare b public.briefs; m json;
begin
  select * into b from public.briefs where id = p_id and token = p_token; if b.id is null then raise exception 'This link has expired.'; end if;
  select coalesce(json_agg(public.creator_card(p)), '[]'::json) into m from public.profiles p where p.id = any(b.matched) and p.vetted and p.status = 'active';
  return json_build_object('id', b.id, 'token', b.token, 'company', b.company, 'contact_name', b.contact_name, 'email', b.email,
    'status', b.status, 'unsubscribed', b.unsubscribed, 'matches', m, 'upgrade_status', b.upgrade_status, 'upgrade_report', b.upgrade_report);
end $$;
grant execute on function public.get_brief(uuid, uuid) to anon, authenticated;

create or replace function public.request_brief_upgrade(p_id uuid, p_token uuid) returns void language plpgsql security definer set search_path = public as $$
declare b public.briefs;
begin
  update public.briefs set upgrade_requested = true, upgrade_status = case when upgrade_status = 'none' then 'requested' else upgrade_status end
    where id = p_id and token = p_token and not upgrade_requested returning * into b;
  if b.id is not null then
    perform public.send_alert('Brief Upgrade requested: ' || b.company, b.contact_name || ' (' || b.email || ') wants the Brief Upgrade. Check payment, then deliver the research and sharper brief. See Admin > Briefs.');
  end if;
end $$;
grant execute on function public.request_brief_upgrade(uuid, uuid) to anon, authenticated;

-- The server (Instant Brief Upgrade) may alert the team.
do $$ begin grant execute on function public.send_alert(text, text) to service_role; exception when others then null; end $$;
