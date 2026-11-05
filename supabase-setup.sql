-- =====================================================================
--  Style Of Life  -  Supabase setup  (login managed in the Table Editor)
--  Run ONCE:  Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
--  Safe to run again. It never deletes your products.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- 1. SHOP TABLES ----------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  type        text not null default 'photo' check (type in ('photo','video')),
  name        text not null,
  sku         text,
  price       text,        -- e.g. 'From $3,900'
  old_price   text,        -- optional crossed-out price
  description text,        -- short line under the name
  details     text,        -- longer details, ONE BULLET PER LINE
  metal       text,
  stone       text,
  image_url   text,
  video_id    text,        -- YouTube video ID
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.hero_videos (
  id          uuid primary key default gen_random_uuid(),
  video_id    text not null,
  label       text not null default 'Diamond Jewelry',
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create or replace function public.sol_touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
  for each row execute function public.sol_touch_updated_at();

-- ---------- 2. ADMIN LOGINS (you manage these in the Table Editor) ----------
create table if not exists public.admin_users (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,
  password    text not null,   -- type a normal password here; it is turned into a secure hash the moment you save
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create table if not exists public.admin_sessions (
  token       text primary key,
  admin_id    uuid not null references public.admin_users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create table if not exists public.admin_login_attempts (
  id          bigserial primary key,
  username    text not null,
  created_at  timestamptz not null default now()
);
create table if not exists public.upload_tickets (
  code        text primary key,
  expires_at  timestamptz not null
);

create or replace function public.sol_hash_password() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  new.username := lower(trim(new.username));
  if new.username = '' then raise exception 'Username cannot be empty'; end if;
  if tg_op = 'INSERT' or new.password is distinct from old.password then
    if new.password is null or new.password = '' then raise exception 'Password cannot be empty'; end if;
    if new.password !~ '^\$2[aby]\$[0-9]{2}\$' then          -- not already a hash
      if length(new.password) < 8 then raise exception 'Password must be at least 8 characters'; end if;
      new.password := crypt(new.password, gen_salt('bf', 10));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_admin_hash on public.admin_users;
create trigger trg_admin_hash before insert or update on public.admin_users
  for each row execute function public.sol_hash_password();

-- ---------- 3. SECURITY ----------
alter table public.products             enable row level security;
alter table public.hero_videos          enable row level security;
alter table public.site_settings        enable row level security;
alter table public.admin_users          enable row level security;
alter table public.admin_sessions       enable row level security;
alter table public.admin_login_attempts enable row level security;
alter table public.upload_tickets       enable row level security;

-- clean slate for policies (older versions of this script)
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in ('products','hero_videos','site_settings') loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Visitors can only READ visible items. Nobody can write directly - writes only happen
-- through the admin_* functions below, which require a valid admin session.
create policy "public read active products" on public.products      for select to anon, authenticated using (is_active = true);
create policy "public read active hero"     on public.hero_videos   for select to anon, authenticated using (is_active = true);
create policy "public read settings"        on public.site_settings for select to anon, authenticated using (true);

revoke all on public.admin_users, public.admin_sessions, public.admin_login_attempts, public.upload_tickets from anon, authenticated;
revoke insert, update, delete, truncate on public.products, public.hero_videos, public.site_settings from anon, authenticated;

-- ---------- 4. LOGIN + ADMIN FUNCTIONS ----------
create or replace function public.sol_admin_id(p_token text) returns uuid
language sql security definer stable set search_path = public as $$
  select s.admin_id from public.admin_sessions s join public.admin_users u on u.id = s.admin_id
  where s.token = p_token and s.expires_at > now() and u.is_active limit 1
$$;

create or replace function public.sol_require_admin(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  v := public.sol_admin_id(p_token);
  if v is null then raise exception 'Session expired. Please log in again.' using errcode = '28000'; end if;
  return v;
end $$;

create or replace function public.sol_ticket_ok(p_code text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.upload_tickets where code = p_code and expires_at > now())
$$;

revoke execute on function public.sol_admin_id(text), public.sol_require_admin(text) from public, anon, authenticated;

-- Log in. Returns {token, username, expires_at} or {error}. 5 wrong tries lock that username for 15 minutes.
create or replace function public.admin_login(p_username text, p_password text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare a public.admin_users%rowtype; fails int; tok text; exp timestamptz;
begin
  p_username := lower(trim(coalesce(p_username, '')));
  delete from public.admin_login_attempts where created_at < now() - interval '1 day';
  delete from public.admin_sessions where expires_at < now();
  select count(*) into fails from public.admin_login_attempts
    where username = p_username and created_at > now() - interval '15 minutes';
  if fails >= 5 then return json_build_object('error', 'Too many wrong attempts. Please wait 15 minutes and try again.'); end if;
  select * into a from public.admin_users where username = p_username and is_active;
  if a.id is null or a.password <> crypt(coalesce(p_password, ''), a.password) then
    insert into public.admin_login_attempts(username) values (p_username);
    return json_build_object('error', 'Wrong username or password.');
  end if;
  delete from public.admin_login_attempts where username = p_username;
  exp := now() + interval '12 hours';
  tok := encode(gen_random_bytes(32), 'hex');
  insert into public.admin_sessions(token, admin_id, expires_at) values (tok, a.id, exp);
  return json_build_object('token', tok, 'username', a.username, 'expires_at', exp);
end $$;

create or replace function public.admin_check(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare v uuid; n text;
begin
  v := public.sol_require_admin(p_token);
  select username into n from public.admin_users where id = v;
  return json_build_object('username', n);
end $$;

create or replace function public.admin_logout(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin delete from public.admin_sessions where token = p_token; return json_build_object('ok', true); end $$;

-- one-time ticket that lets the admin upload ONE photo within 3 minutes
create or replace function public.admin_new_upload(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare c text;
begin
  perform public.sol_require_admin(p_token);
  delete from public.upload_tickets where expires_at < now();
  c := encode(gen_random_bytes(12), 'hex');
  insert into public.upload_tickets(code, expires_at) values (c, now() + interval '3 minutes');
  return json_build_object('code', c);
end $$;

create or replace function public.admin_list_products(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.sol_require_admin(p_token);
  return (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order, p.created_at), '[]'::jsonb) from public.products p);
end $$;

create or replace function public.admin_save_product(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.products; pid uuid;
begin
  perform public.sol_require_admin(p_token);
  pid := nullif(p->>'id', '')::uuid;
  if pid is null then
    insert into public.products(category, type, name, sku, price, old_price, description, details, metal, stone, image_url, video_id, sort_order, is_active)
    values (p->>'category', coalesce(nullif(p->>'type',''), 'photo'), p->>'name', nullif(p->>'sku',''), nullif(p->>'price',''),
            nullif(p->>'old_price',''), nullif(p->>'description',''), nullif(p->>'details',''), nullif(p->>'metal',''),
            nullif(p->>'stone',''), nullif(p->>'image_url',''), nullif(p->>'video_id',''),
            coalesce((p->>'sort_order')::int, 0), coalesce((p->>'is_active')::boolean, true))
    returning * into r;
  else
    update public.products set
      category    = case when p ? 'category'    then p->>'category' else category end,
      type        = case when p ? 'type'        then p->>'type' else type end,
      name        = case when p ? 'name'        then p->>'name' else name end,
      sku         = case when p ? 'sku'         then nullif(p->>'sku','') else sku end,
      price       = case when p ? 'price'       then nullif(p->>'price','') else price end,
      old_price   = case when p ? 'old_price'   then nullif(p->>'old_price','') else old_price end,
      description = case when p ? 'description' then nullif(p->>'description','') else description end,
      details     = case when p ? 'details'     then nullif(p->>'details','') else details end,
      metal       = case when p ? 'metal'       then nullif(p->>'metal','') else metal end,
      stone       = case when p ? 'stone'       then nullif(p->>'stone','') else stone end,
      image_url   = case when p ? 'image_url'   then nullif(p->>'image_url','') else image_url end,
      video_id    = case when p ? 'video_id'    then nullif(p->>'video_id','') else video_id end,
      sort_order  = case when p ? 'sort_order'  then (p->>'sort_order')::int else sort_order end,
      is_active   = case when p ? 'is_active'   then (p->>'is_active')::boolean else is_active end
    where id = pid returning * into r;
    if r.id is null then raise exception 'Product not found'; end if;
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.admin_delete_product(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.products;
begin
  perform public.sol_require_admin(p_token);
  delete from public.products where id = p_id returning * into r;
  return jsonb_build_object('deleted', r.id is not null);
end $$;

create or replace function public.admin_list_hero(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.sol_require_admin(p_token);
  return (select coalesce(jsonb_agg(to_jsonb(h) order by h.sort_order, h.created_at), '[]'::jsonb) from public.hero_videos h);
end $$;

create or replace function public.admin_save_hero(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.hero_videos; hid uuid;
begin
  perform public.sol_require_admin(p_token);
  hid := nullif(p->>'id', '')::uuid;
  if hid is null then
    insert into public.hero_videos(video_id, label, sort_order, is_active)
    values (p->>'video_id', coalesce(nullif(p->>'label',''), 'Diamond Jewelry'), coalesce((p->>'sort_order')::int, 0), coalesce((p->>'is_active')::boolean, true))
    returning * into r;
  else
    update public.hero_videos set
      video_id   = case when p ? 'video_id'   then p->>'video_id' else video_id end,
      label      = case when p ? 'label'      then coalesce(nullif(p->>'label',''), 'Diamond Jewelry') else label end,
      sort_order = case when p ? 'sort_order' then (p->>'sort_order')::int else sort_order end,
      is_active  = case when p ? 'is_active'  then (p->>'is_active')::boolean else is_active end
    where id = hid returning * into r;
    if r.id is null then raise exception 'Video not found'; end if;
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.admin_delete_hero(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.sol_require_admin(p_token);
  delete from public.hero_videos where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_save_setting(p_token text, p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.sol_require_admin(p_token);
  insert into public.site_settings(key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

grant execute on function
  public.admin_login(text, text), public.admin_check(text), public.admin_logout(text), public.admin_new_upload(text),
  public.admin_list_products(text), public.admin_save_product(text, jsonb), public.admin_delete_product(text, uuid),
  public.admin_list_hero(text), public.admin_save_hero(text, jsonb), public.admin_delete_hero(text, uuid),
  public.admin_save_setting(text, text, jsonb), public.sol_ticket_ok(text)
to anon, authenticated;

-- ---------- 5. PHOTO STORAGE ----------
-- Photos are public to view. Uploading needs a one-time ticket that only a logged-in admin can get,
-- so visitors cannot upload, overwrite or delete anything.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "public read product images"   on storage.objects;
drop policy if exists "admin upload product images"  on storage.objects;
drop policy if exists "admin update product images"  on storage.objects;
drop policy if exists "admin delete product images"  on storage.objects;
drop policy if exists "ticket upload product images" on storage.objects;
create policy "ticket upload product images" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'product-images' and public.sol_ticket_ok(split_part(name, '/', 1)));

-- ---------- 6. STARTING DATA (your current 30 products, header videos and banner) ----------
insert into public.products (category, type, name, price, description, image_url, video_id, sort_order)
select * from (values
  ('necklaces', 'photo', 'Diamond Tennis Necklace', 'From $5,800', 'A seamless line of brilliant diamonds that rests effortlessly at the collarbone. Made to order and sized to you.', 'images/necklace.jpg', null, 10),
  ('necklaces', 'photo', 'Rose Gold Infinity Pendant', 'From $2,400', 'A graceful infinity twist in warm rose gold, set with a sparkling pear-cut stone. Delicate enough for everyday wear.', 'images/necklace_infinity_rose.jpg', null, 20),
  ('necklaces', 'photo', 'Pear Diamond Solitaire Pendant', 'From $3,200', 'A single pear-cut stone on a fine chain — simple, timeless, and made to catch the light with every movement.', 'images/necklace_pear_solitaire.jpg', null, 30),
  ('bracelets', 'photo', 'Tennis Bracelet Stack', 'From $4,800', 'Designed to layer and made for everyday wear. Stack two or three lengths for a quietly show-stopping wrist.', 'images/bracelet.jpg', null, 10),
  ('bracelets', 'photo', 'Classic Tennis Bracelet', 'From $4,800', 'The icon, refined. A continuous row of oval-cut diamonds with a low, comfortable profile.', 'images/bracelet_leafy.jpg', null, 20),
  ('bracelets', 'photo', 'Bezel Diamond Bracelet', 'From $4,800', 'Diamonds set in warm gold bezels for a smooth, modern take on the tennis classic.', 'images/bracelet_bezel.jpg', null, 30),
  ('rings', 'photo', 'Crisscross Diamond Ring', 'From $3,900', 'A sculpted crossover band pavé-set with diamonds. Bold on its own, striking when stacked.', 'images/ring_criss.jpg', null, 10),
  ('rings', 'photo', 'Oval Diamond Ring Set', 'From $3,900', 'An oval center stone with a pavé-set band — a modern heirloom for the moment that matters.', 'images/ring_oval.jpg', null, 20),
  ('rings', 'photo', 'Blue Halo Statement Ring', 'From $3,900', 'A radiant-cut blue center stone framed by a sparkling diamond halo. Made to be noticed.', 'images/ring_blue_radiant.jpg', null, 30),
  ('rings', 'photo', 'Marquise Blue Ring', 'From $3,900', 'A marquise-cut blue stone on a sculptural crossover band with warm gold prongs. One of a kind.', 'images/ring_blue_marquise.jpg', null, 40),
  ('earrings', 'video', 'Diamond Earrings', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, '6ihAd4lLFuQ', 10),
  ('signature-pieces', 'video', 'Diamond Piece No. 01', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'cuOp4unF_NM', 10),
  ('signature-pieces', 'video', 'Diamond Piece No. 02', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'xT1oAyhGNtQ', 20),
  ('signature-pieces', 'video', 'Diamond Piece No. 03', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'GcMOnLb7YBA', 30),
  ('signature-pieces', 'video', 'Diamond Piece No. 04', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'H7SAXOlnGYs', 40),
  ('signature-pieces', 'video', 'Diamond Piece No. 05', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'NsLnI3I2tGE', 50),
  ('signature-pieces', 'video', 'Diamond Piece No. 06', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'AgBQJFqwqqY', 60),
  ('signature-pieces', 'video', 'Diamond Piece No. 07', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'F0MXTpIg_6o', 70),
  ('signature-pieces', 'video', 'Diamond Piece No. 08', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, '0JEYT64Ga4E', 80),
  ('signature-pieces', 'video', 'Diamond Piece No. 09', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'psivfpToMaU', 90),
  ('signature-pieces', 'video', 'Diamond Piece No. 10', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'yPnS44wFabE', 100),
  ('signature-pieces', 'video', 'Diamond Piece No. 11', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'LMSX1xLE4bE', 110),
  ('signature-pieces', 'video', 'Diamond Piece No. 12', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'T_ELpkj3JDg', 120),
  ('signature-pieces', 'video', 'Diamond Piece No. 13', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'DUezHFedYbQ', 130),
  ('signature-pieces', 'video', 'Diamond Piece No. 14', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'tFEwhSZGvbw', 140),
  ('signature-pieces', 'video', 'Diamond Piece No. 15', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'i8nUBs-I76Y', 150),
  ('signature-pieces', 'video', 'Diamond Piece No. 16', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'rFDBLUuAOBo', 160),
  ('signature-pieces', 'video', 'Diamond Piece No. 17', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'ovwf4eOWWI0', 170),
  ('signature-pieces', 'video', 'Diamond Piece No. 18', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'mxdD0VXuZQo', 180),
  ('signature-pieces', 'video', 'Diamond Piece No. 19', null, 'Watch it catch the light. Message us for sizing, stone options and pricing.', null, 'krrVMDE1IMg', 190)
) as v(category, type, name, price, description, image_url, video_id, sort_order)
where not exists (select 1 from public.products);

insert into public.hero_videos (video_id, label, sort_order)
select * from (values
  ('cuOp4unF_NM', 'Diamond Jewelry', 10),
  ('xT1oAyhGNtQ', 'Diamond Jewelry', 20),
  ('GcMOnLb7YBA', 'Diamond Jewelry', 30),
  ('H7SAXOlnGYs', 'Diamond Jewelry', 40)
) as v(video_id, label, sort_order)
where not exists (select 1 from public.hero_videos);

insert into public.site_settings (key, value) values
  ('promo', '{"promoEnabled": true, "promoText": "UP TO 45% OFF", "promoSubText1": "LIMITED TIME OFFER", "promoSubText2": "MESSAGE US ON WHATSAPP TO CLAIM", "badgeEnabled": true, "badgeText": "UP TO 45%", "badgeSubText": "OFF"}'::jsonb)
on conflict (key) do nothing;

-- ---------- 7. YOUR ADMIN LOGIN ----------
-- Go to  Table Editor -> admin_users -> Insert -> Insert row  and fill in:
--     username = the login ID you want        password = a strong password (8+ characters)
-- That's it. The password is hashed automatically when you save.

-- ---------- 8. REVIEWS ----------
-- Visitors see only approved reviews. Anyone can submit a review from the website, but it stays hidden
-- until you approve it (Table Editor -> reviews -> tick is_approved, or use the Reviews tab in admin.html).
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  rating      int  not null default 5 check (rating between 1 and 5),
  title       text,
  body        text not null,
  source      text not null default 'Website' check (source in ('Etsy','WhatsApp','Instagram','Facebook','Website')),
  proof_url   text,
  is_approved boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.reviews enable row level security;
drop policy if exists "public read approved reviews" on public.reviews;
create policy "public read approved reviews" on public.reviews for select to anon, authenticated using (is_approved = true);
revoke insert, update, delete, truncate on public.reviews from anon, authenticated;

-- public submit (goes to the approval queue; max 10 new pending reviews per hour site-wide to stop spam)
create or replace function public.submit_review(p_name text, p_location text, p_rating int, p_body text) returns json
language plpgsql security definer set search_path = public as $$
begin
  p_name := btrim(coalesce(p_name, '')); p_body := btrim(coalesce(p_body, '')); p_location := nullif(btrim(coalesce(p_location, '')), '');
  if length(p_name) < 2 or length(p_name) > 60 then return json_build_object('error', 'Please enter your name.'); end if;
  if length(p_body) < 10 or length(p_body) > 1000 then return json_build_object('error', 'Please write between 10 and 1000 characters.'); end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then return json_build_object('error', 'Please choose a star rating.'); end if;
  if p_location is not null and length(p_location) > 60 then p_location := left(p_location, 60); end if;
  if (select count(*) from public.reviews where is_approved = false and created_at > now() - interval '1 hour') >= 10 then
    return json_build_object('error', 'Too many reviews right now. Please try again later.');
  end if;
  insert into public.reviews(name, location, rating, body, source, is_approved) values (p_name, p_location, p_rating, p_body, 'Website', false);
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_list_reviews(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.sol_require_admin(p_token);
  return (select coalesce(jsonb_agg(to_jsonb(r) order by r.is_approved, r.sort_order, r.created_at desc), '[]'::jsonb) from public.reviews r);
end $$;

create or replace function public.admin_save_review(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.reviews; rid uuid;
begin
  perform public.sol_require_admin(p_token);
  rid := nullif(p->>'id', '')::uuid;
  if rid is null then
    insert into public.reviews(name, location, rating, title, body, source, proof_url, is_approved, sort_order)
    values (p->>'name', nullif(p->>'location',''), coalesce((p->>'rating')::int, 5), nullif(p->>'title',''), p->>'body',
            coalesce(nullif(p->>'source',''), 'Etsy'), nullif(p->>'proof_url',''), coalesce((p->>'is_approved')::boolean, true), coalesce((p->>'sort_order')::int, 0))
    returning * into r;
  else
    update public.reviews set
      name        = case when p ? 'name'        then p->>'name' else name end,
      location    = case when p ? 'location'    then nullif(p->>'location','') else location end,
      rating      = case when p ? 'rating'      then (p->>'rating')::int else rating end,
      title       = case when p ? 'title'       then nullif(p->>'title','') else title end,
      body        = case when p ? 'body'        then p->>'body' else body end,
      source      = case when p ? 'source'      then p->>'source' else source end,
      proof_url   = case when p ? 'proof_url'   then nullif(p->>'proof_url','') else proof_url end,
      is_approved = case when p ? 'is_approved' then (p->>'is_approved')::boolean else is_approved end,
      sort_order  = case when p ? 'sort_order'  then (p->>'sort_order')::int else sort_order end
    where id = rid returning * into r;
    if r.id is null then raise exception 'Review not found'; end if;
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.admin_delete_review(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.sol_require_admin(p_token);
  delete from public.reviews where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.submit_review(text, text, int, text), public.admin_list_reviews(text),
  public.admin_save_review(text, jsonb), public.admin_delete_review(text, uuid) to anon, authenticated;

-- Only REAL feedback goes here. This is the genuine Etsy review you gave me. Add more from the admin Reviews tab.
insert into public.reviews (name, location, rating, title, body, source, proof_url, is_approved, sort_order)
select 'Verified Etsy buyer', null, 5, 'Custom pendant',
 'I had a specific idea for a personalized pendant, and the outcome was better than I had anticipated. They were patient, professional, and meticulous. The pendant came out beautifully and precisely as I had envisioned. An amazing experience from beginning to end!',
 'Etsy', 'https://styleoflifein.etsy.com', true, 10
where not exists (select 1 from public.reviews);
