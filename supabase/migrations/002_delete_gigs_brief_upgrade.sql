-- Admin can delete gigs; Brief Upgrade (paid research add-on); first match email goes out within minutes.
alter table public.settings add column if not exists upgrade_price text not null default '';
alter table public.settings add column if not exists upgrade_link text not null default '';
alter table public.briefs add column if not exists upgrade_requested boolean not null default false;
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete using (public.is_admin());

create or replace function public.public_settings() returns json language sql stable security definer set search_path = public as $$
  select json_build_object('drop_applied', drop_applied, 'drop_accepted', drop_accepted, 'upgrade_price', upgrade_price, 'upgrade_link', upgrade_link) from public.settings where id = 1;
$$;

-- Brief Upgrade: the brand asks Vetta for market research and a sharper brief (paid add-on).
create or replace function public.request_brief_upgrade(p_id uuid, p_token uuid) returns void language plpgsql security definer set search_path = public as $$
declare b public.briefs;
begin
  update public.briefs set upgrade_requested = true where id = p_id and token = p_token and not upgrade_requested returning * into b;
  if b.id is not null then
    perform public.send_alert('Brief Upgrade requested: ' || b.company, b.contact_name || ' (' || b.email || ') wants the Brief Upgrade for their brief. Check payment, then deliver the research and sharper brief. See Admin > Briefs.');
  end if;
end $$;
grant execute on function public.request_brief_upgrade(uuid, uuid) to anon, authenticated;

create or replace function public.send_brief_followups() returns integer language plpgsql security definer set search_path = public as $$
declare s public.settings; b public.briefs; n int := 0; link text; names text; first text; subj text; body text;
begin
  select * into s from public.settings where id = 1;
  if s.resend_key = '' or s.from_email = '' or s.site_url = '' then return 0; end if;
  for b in select * from public.briefs where status = 'draft' and not unsubscribed and followup_stage < 3
      and created_at > now() - interval '10 days'
      and ((followup_stage = 0 and created_at < now() - interval '1 minute')
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
