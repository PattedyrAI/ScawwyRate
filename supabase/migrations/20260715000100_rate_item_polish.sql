-- Pre-deploy polish (consolidated review): clean error for over-long item names
-- (was a raw CHECK violation from items.name) and documented upsert semantics.
-- Body is identical to 20260714133457_items_ratings.sql except the length guard.

create or replace function public.rate_item(
  p_group_id    uuid,
  p_score       int,
  p_item_id     uuid default null,
  p_item_name   text default null,
  p_category_id uuid default null,
  p_comment     text default null,
  p_photo_url   text default null,
  p_visited_at  date default null
)
returns public.ratings
language plpgsql
volatile
security definer set search_path = ''
as $$
declare
  uid      uuid := (select auth.uid());
  v_item   public.items;
  v_rating public.ratings;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_group_member(p_group_id, uid) then
    raise exception 'not_a_member';
  end if;
  if p_score is null or p_score not between 1 and 10 then
    raise exception 'invalid_score';
  end if;

  if p_item_id is not null then
    select * into v_item
    from public.items
    where id = p_item_id and group_id = p_group_id;
    if not found then
      raise exception 'item_not_found';
    end if;
  else
    if p_item_name is null or btrim(p_item_name) = '' then
      raise exception 'item_name_required';
    end if;
    -- Clean error instead of surfacing the items.name CHECK violation.
    if char_length(btrim(p_item_name)) > 120 then
      raise exception 'item_name_too_long';
    end if;

    select * into v_item
    from public.items
    where group_id = p_group_id
      and normalized_name = public.normalize_name(p_item_name);

    if not found then
      -- Only the create path needs a category; re-rating an existing item
      -- by name must not require one.
      if p_category_id is null then
        raise exception 'category_required';
      end if;

      insert into public.items (group_id, name, category_id, created_by)
      values (p_group_id, btrim(p_item_name), p_category_id, uid)
      on conflict (group_id, normalized_name) do nothing
      returning * into v_item;

      -- Lost an insert race: fetch the row the other transaction created.
      if v_item.id is null then
        select * into v_item
        from public.items
        where group_id = p_group_id
          and normalized_name = public.normalize_name(p_item_name);
      end if;
    end if;
  end if;

  insert into public.ratings (item_id, group_id, user_id, score, comment, photo_url, visited_at)
  values (v_item.id, p_group_id, uid, p_score, p_comment, p_photo_url, p_visited_at)
  on conflict (user_id, item_id) do update
    set score      = excluded.score,
        comment    = excluded.comment,
        photo_url  = excluded.photo_url,
        visited_at = excluded.visited_at
  returning * into v_rating;

  return v_rating;
end;
$$;

comment on function public.rate_item(uuid, int, uuid, text, uuid, text, text, date) is
  'Find-or-create an item by normalized name (or use p_item_id) and upsert the caller''s rating. '
  'NOTE: the upsert is a FULL-COLUMN replace — omitting p_comment/p_photo_url/p_visited_at on a '
  're-rate clears any previously stored values. The app always sends explicit values; direct '
  'callers must do the same.';
