-- Phase 4: Discord webhook posting via pg_net (async; replaces the spec's Edge Function).

create extension if not exists pg_net;

-- Webhook URLs are bearer credentials: owner-scoped table, NOT member-readable
-- (groups rows are). Replaces groups.discord_webhook_url.
create table public.group_webhooks (
  group_id   uuid primary key references public.groups (id) on delete cascade,
  url        text not null check (url like 'https://discord.com/api/webhooks/%' or url like 'http://host.docker.internal:%'),
  updated_at timestamptz not null default now()
);

alter table public.group_webhooks enable row level security;

grant select, insert, update, delete on public.group_webhooks to authenticated;
grant select, insert, update, delete on public.group_webhooks to service_role;

create policy "group_webhooks_owner_all"
  on public.group_webhooks for all to authenticated
  using (public.is_group_owner(group_id, (select auth.uid())))
  with check (public.is_group_owner(group_id, (select auth.uid())));

-- Migrate existing values, then drop the member-readable column.
insert into public.group_webhooks (group_id, url)
select id, discord_webhook_url from public.groups
where discord_webhook_url is not null
  and (discord_webhook_url like 'https://discord.com/api/webhooks/%'
       or discord_webhook_url like 'http://host.docker.internal:%')
on conflict (group_id) do nothing;

alter table public.groups drop column discord_webhook_url;

-- keep updated_at fresh (reuses the Phase 0 helper)
create trigger group_webhooks_set_updated_at
  before update on public.group_webhooks
  for each row execute function public.handle_updated_at();

-- Build + queue the Discord embed. SECURITY DEFINER so it can read the webhook
-- row and joins regardless of the acting user's RLS. Fail-open: a broken
-- webhook must never block the rating write.
create or replace function public.post_rating_to_discord()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  hook_url  text;
  item_name text;
  grp_name  text;
  rater     text;
  rater_avatar text;
  band_color int;
  verb      text;
  payload   jsonb;
begin
  select w.url, g.name into hook_url, grp_name
  from public.group_webhooks w
  join public.groups g on g.id = w.group_id
  where w.group_id = new.group_id;

  if hook_url is null then
    return new; -- no webhook configured: no-op
  end if;

  select i.name into item_name from public.items i where i.id = new.item_id;
  select p.username, p.avatar_url into rater, rater_avatar from public.profiles p where p.id = new.user_id;

  -- Legacy ScawwyRate color bands.
  band_color := case
    when new.score >= 8 then 5763719   -- green  0x57F287
    when new.score >= 6 then 16705372  -- yellow 0xFEE75C
    when new.score >= 4 then 15105570  -- orange 0xE67E22
    else 15548997                      -- red    0xED4245
  end;

  verb := case when tg_op = 'UPDATE' then 'updated their rating of' else 'rated' end;

  payload := jsonb_build_object(
    'embeds', jsonb_build_array(jsonb_build_object(
      'title', coalesce(item_name, 'Unknown item') || ' — ' || new.score || '/10',
      'description', coalesce(new.comment, ''),
      'color', band_color,
      'author', jsonb_build_object(
        'name', '@' || coalesce(rater, 'unknown') || ' ' || verb || ' ' || coalesce(item_name, 'an item'),
        'icon_url', coalesce(rater_avatar, '')
      ),
      'footer', jsonb_build_object('text', coalesce(grp_name, 'ScawwyRate'))
    ))
  );

  begin
    perform net.http_post(
      url := hook_url,
      body := payload,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    raise warning 'post_rating_to_discord: queueing failed for rating %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;
revoke execute on function public.post_rating_to_discord() from public, anon, authenticated;

create trigger ratings_post_to_discord_insert
  after insert on public.ratings
  for each row execute function public.post_rating_to_discord();

-- Only real score changes re-post (silent edits to comment/photo don't spam the channel).
create trigger ratings_post_to_discord_update
  after update on public.ratings
  for each row
  when (old.score is distinct from new.score)
  execute function public.post_rating_to_discord();
