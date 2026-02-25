-- Everrate Initial Schema
-- Run against Supabase Postgres

-- Enable extensions
create extension if not exists "pg_trgm";
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  rereview_reminders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categories (energy_drinks now, extensible later)
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  icon_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Brands
create table public.brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now()
);

-- Products
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.categories on delete restrict,
  brand_id uuid references public.brands on delete set null,
  name text not null,
  description text,
  image_url text,
  barcode text,
  avg_rating numeric(3,1) not null default 0,
  rating_count int not null default 0,
  added_by uuid references public.profiles on delete set null,
  is_verified boolean not null default false,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ratings (one per user per product)
create table public.ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles on delete cascade,
  product_id uuid not null references public.products on delete cascade,
  score smallint not null check (score >= 1 and score <= 10),
  review_text text,
  photo_url text,
  would_buy_again boolean,
  review_count int not null default 1,
  comment_count int not null default 0,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- Rating history (previous scores on re-review)
create table public.rating_history (
  id uuid primary key default uuid_generate_v4(),
  rating_id uuid not null references public.ratings on delete cascade,
  previous_score smallint not null,
  previous_review_text text,
  previous_photo_url text,
  previous_would_buy_again boolean,
  changed_at timestamptz not null default now()
);

-- Tags
create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories on delete set null,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Rating tags (many-to-many)
create table public.rating_tags (
  rating_id uuid not null references public.ratings on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  primary key (rating_id, tag_id)
);

-- Follows
create table public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  following_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- Comments
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  rating_id uuid not null references public.ratings on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Likes
create table public.likes (
  user_id uuid not null references public.profiles on delete cascade,
  rating_id uuid not null references public.ratings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, rating_id)
);

-- Notifications
create type public.notification_type as enum (
  'new_follower',
  'new_comment',
  'new_rating',
  'rating_liked',
  'rereview_prompt'
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles on delete cascade,
  type public.notification_type not null,
  actor_id uuid references public.profiles on delete set null,
  rating_id uuid references public.ratings on delete cascade,
  comment_id uuid references public.comments on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Fuzzy search indexes (pg_trgm)
create index idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index idx_brands_name_trgm on public.brands using gin (name gin_trgm_ops);
create index idx_profiles_username_trgm on public.profiles using gin (username gin_trgm_ops);

-- Foreign key indexes for common queries
create index idx_products_category on public.products (category_id);
create index idx_products_brand on public.products (brand_id);
create index idx_ratings_user on public.ratings (user_id);
create index idx_ratings_product on public.ratings (product_id);
create index idx_ratings_created on public.ratings (created_at desc);
create index idx_rating_history_rating on public.rating_history (rating_id);
create index idx_comments_rating on public.comments (rating_id);
create index idx_likes_rating on public.likes (rating_id);
create index idx_notifications_user on public.notifications (user_id, is_read, created_at desc);
create index idx_follows_following on public.follows (following_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

create trigger set_ratings_updated_at
  before update on public.ratings
  for each row execute function public.handle_updated_at();

-- Auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'preferred_username', 'user_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Snapshot rating before update (for re-review history)
create or replace function public.snapshot_rating_before_update()
returns trigger as $$
begin
  if old.score is distinct from new.score
     or old.review_text is distinct from new.review_text
     or old.would_buy_again is distinct from new.would_buy_again then
    insert into public.rating_history (rating_id, previous_score, previous_review_text, previous_photo_url, previous_would_buy_again)
    values (old.id, old.score, old.review_text, old.photo_url, old.would_buy_again);
    new.review_count = old.review_count + 1;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger snapshot_rating_on_update
  before update on public.ratings
  for each row execute function public.snapshot_rating_before_update();

-- Update product avg_rating and rating_count
create or replace function public.update_product_rating_stats()
returns trigger as $$
declare
  target_product_id uuid;
begin
  if tg_op = 'DELETE' then
    target_product_id := old.product_id;
  else
    target_product_id := new.product_id;
  end if;

  update public.products
  set
    avg_rating = coalesce((
      select round(avg(score)::numeric, 1)
      from public.ratings
      where product_id = target_product_id
    ), 0),
    rating_count = (
      select count(*)
      from public.ratings
      where product_id = target_product_id
    )
  where id = target_product_id;

  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger update_product_stats_on_rating_insert
  after insert on public.ratings
  for each row execute function public.update_product_rating_stats();

create trigger update_product_stats_on_rating_update
  after update of score on public.ratings
  for each row execute function public.update_product_rating_stats();

create trigger update_product_stats_on_rating_delete
  after delete on public.ratings
  for each row execute function public.update_product_rating_stats();

-- Update ratings.comment_count
create or replace function public.update_rating_comment_count()
returns trigger as $$
declare
  target_rating_id uuid;
begin
  if tg_op = 'DELETE' then
    target_rating_id := old.rating_id;
  else
    target_rating_id := new.rating_id;
  end if;

  update public.ratings
  set comment_count = (
    select count(*) from public.comments where rating_id = target_rating_id
  )
  where id = target_rating_id;

  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger update_comment_count_on_insert
  after insert on public.comments
  for each row execute function public.update_rating_comment_count();

create trigger update_comment_count_on_delete
  after delete on public.comments
  for each row execute function public.update_rating_comment_count();

-- Update ratings.like_count
create or replace function public.update_rating_like_count()
returns trigger as $$
declare
  target_rating_id uuid;
begin
  if tg_op = 'DELETE' then
    target_rating_id := old.rating_id;
  else
    target_rating_id := new.rating_id;
  end if;

  update public.ratings
  set like_count = (
    select count(*) from public.likes where rating_id = target_rating_id
  )
  where id = target_rating_id;

  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger update_like_count_on_insert
  after insert on public.likes
  for each row execute function public.update_rating_like_count();

create trigger update_like_count_on_delete
  after delete on public.likes
  for each row execute function public.update_rating_like_count();

-- Activity feed function (cursor-paginated)
create or replace function public.get_activity_feed(
  p_user_id uuid,
  p_limit int default 20,
  p_cursor timestamptz default null
)
returns table (
  rating_id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  product_id uuid,
  product_name text,
  product_image_url text,
  brand_name text,
  score smallint,
  review_text text,
  photo_url text,
  would_buy_again boolean,
  review_count int,
  comment_count int,
  like_count int,
  rating_created_at timestamptz,
  rating_updated_at timestamptz
) as $$
begin
  return query
  select
    r.id as rating_id,
    r.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    r.product_id,
    pr.name as product_name,
    pr.image_url as product_image_url,
    b.name as brand_name,
    r.score,
    r.review_text,
    r.photo_url,
    r.would_buy_again,
    r.review_count,
    r.comment_count,
    r.like_count,
    r.created_at as rating_created_at,
    r.updated_at as rating_updated_at
  from public.ratings r
  inner join public.follows f on f.following_id = r.user_id and f.follower_id = p_user_id
  inner join public.profiles p on p.id = r.user_id
  inner join public.products pr on pr.id = r.product_id
  left join public.brands b on b.id = pr.brand_id
  where (p_cursor is null or r.updated_at < p_cursor)
  order by r.updated_at desc
  limit p_limit;
end;
$$ language plpgsql stable;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.ratings enable row level security;
alter table public.rating_history enable row level security;
alter table public.tags enable row level security;
alter table public.rating_tags enable row level security;
alter table public.follows enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.notifications enable row level security;

-- Profiles: public read, owner update
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Categories: public read
create policy "Categories are publicly readable"
  on public.categories for select using (true);

-- Brands: public read, authenticated insert
create policy "Brands are publicly readable"
  on public.brands for select using (true);

create policy "Authenticated users can add brands"
  on public.brands for insert with check (auth.role() = 'authenticated');

-- Products: public read, authenticated insert, owner update
create policy "Products are publicly readable"
  on public.products for select using (true);

create policy "Authenticated users can add products"
  on public.products for insert with check (auth.role() = 'authenticated');

create policy "Product adder can update"
  on public.products for update using (auth.uid() = added_by);

-- Ratings: public read, owner CUD
create policy "Ratings are publicly readable"
  on public.ratings for select using (true);

create policy "Users can create ratings"
  on public.ratings for insert with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on public.ratings for update using (auth.uid() = user_id);

create policy "Users can delete own ratings"
  on public.ratings for delete using (auth.uid() = user_id);

-- Rating history: public read (visible on rating detail)
create policy "Rating history is publicly readable"
  on public.rating_history for select using (true);

-- Tags: public read
create policy "Tags are publicly readable"
  on public.tags for select using (true);

-- Rating tags: public read, rating owner CUD
create policy "Rating tags are publicly readable"
  on public.rating_tags for select using (true);

create policy "Rating owner can manage tags"
  on public.rating_tags for insert with check (
    auth.uid() = (select user_id from public.ratings where id = rating_id)
  );

create policy "Rating owner can delete tags"
  on public.rating_tags for delete using (
    auth.uid() = (select user_id from public.ratings where id = rating_id)
  );

-- Follows: public read, owner CUD
create policy "Follows are publicly readable"
  on public.follows for select using (true);

create policy "Users can follow"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- Comments: public read, owner CUD
create policy "Comments are publicly readable"
  on public.comments for select using (true);

create policy "Users can create comments"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- Likes: public read, owner CUD
create policy "Likes are publicly readable"
  on public.likes for select using (true);

create policy "Users can like"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.likes for delete using (auth.uid() = user_id);

-- Notifications: owner read/update only
create policy "Users can read own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can mark own notifications as read"
  on public.notifications for update using (auth.uid() = user_id);

-- System can insert notifications (via service role / triggers)
create policy "System can create notifications"
  on public.notifications for insert with check (true);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public) values ('rating-photos', 'rating-photos', true);
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Storage policies
create policy "Anyone can view rating photos"
  on storage.objects for select using (bucket_id = 'rating-photos');

create policy "Authenticated users can upload rating photos"
  on storage.objects for insert with check (
    bucket_id = 'rating-photos' and auth.role() = 'authenticated'
  );

create policy "Users can delete own rating photos"
  on storage.objects for delete using (
    bucket_id = 'rating-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can view product images"
  on storage.objects for select using (bucket_id = 'product-images');

create policy "Authenticated users can upload product images"
  on storage.objects for insert with check (
    bucket_id = 'product-images' and auth.role() = 'authenticated'
  );

create policy "Anyone can view avatars"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.role() = 'authenticated'
  );

create policy "Users can delete own avatar"
  on storage.objects for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
