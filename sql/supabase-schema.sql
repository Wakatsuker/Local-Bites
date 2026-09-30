-- LocalBites Supabase schema
-- Run this file in Supabase Dashboard > SQL Editor.

create extension if not exists "uuid-ossp";

create type public.user_role as enum ('buyer', 'seller', 'admin');
create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farms (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  farm_name text not null,
  description text,
  location text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'Vegetables',
  price numeric(10,2) not null check (price >= 0),
  unit text not null default 'kg',
  available_quantity numeric(10,2) not null default 0 check (available_quantity >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.carts (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(10,2) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(cart_id, product_id)
);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id),
  status public.order_status not null default 'pending',
  contact_name text not null,
  phone text not null,
  business_name text not null,
  delivery_address text not null,
  delivery_method text not null default 'route_dispatch',
  payment_method text not null default 'cash_on_delivery',
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  total numeric(10,2) not null default 0 check (total >= 0),
  buyer_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid not null references public.profiles(id),
  product_name text not null,
  unit text not null default 'kg',
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  seller_hidden boolean not null default false,
  line_total numeric(10,2) generated always as (quantity * unit_price) stored
);

create index products_farm_id_idx on public.products(farm_id);
create index products_category_idx on public.products(category);
create index orders_buyer_id_idx on public.orders(buyer_id);
create index order_items_seller_id_idx on public.order_items(seller_id);

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public can view active products" on public.products for select using (is_active = true);
create policy "sellers manage their products" on public.products for all using (
  exists (select 1 from public.farms f where f.id = farm_id and f.seller_id = auth.uid())
) with check (
  exists (select 1 from public.farms f where f.id = farm_id and f.seller_id = auth.uid())
);
create policy "public can view farms" on public.farms for select using (true);
create policy "sellers manage their farms" on public.farms for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "users manage own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "public can view product images" on public.product_images for select using (true);
create policy "sellers manage product images" on public.product_images for all using (
  exists (select 1 from public.products p join public.farms f on f.id = p.farm_id where p.id = product_id and f.seller_id = auth.uid())
);
create policy "buyers manage own carts" on public.carts for all using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());
create policy "buyers manage own cart items" on public.cart_items for all using (
  exists (select 1 from public.carts c where c.id = cart_id and c.buyer_id = auth.uid())
);
create policy "buyers view own orders" on public.orders for select using (buyer_id = auth.uid());
create policy "buyers create own orders" on public.orders for insert with check (buyer_id = auth.uid());
create policy "buyers view own order items" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
);
create policy "sellers view their order items" on public.order_items for select using (seller_id = auth.uid());

-- Per-user order-history clearing. These functions hide history without
-- deleting shared order records needed by the buyer, seller, or deliveries.
create or replace function public.clear_buyer_order_history()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cleared_count integer;
begin
  update public.orders
  set buyer_hidden = true,
      updated_at = now()
  where buyer_id = auth.uid()
    and buyer_hidden = false;

  get diagnostics cleared_count = row_count;
  return cleared_count;
end;
$$;

create or replace function public.clear_seller_order_history()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cleared_count integer;
begin
  update public.order_items as items
  set seller_hidden = true
  where items.seller_id = auth.uid()
    and items.seller_hidden = false
    and exists (
      select 1
      from public.orders as orders
      where orders.id = items.order_id
        and orders.status <> 'pending'
    );

  get diagnostics cleared_count = row_count;
  return cleared_count;
end;
$$;

revoke all on function public.clear_buyer_order_history() from public;
revoke all on function public.clear_seller_order_history() from public;
grant execute on function public.clear_buyer_order_history() to authenticated;
grant execute on function public.clear_seller_order_history() to authenticated;

-- Create the image bucket from Storage > New bucket, or uncomment this line:
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);
-- Storage policies should be added after authentication is enabled.

-- Example seller setup after creating a user in Authentication:
-- insert into public.profiles (id, full_name, role) values ('USER-UUID-HERE', 'Juan Santos', 'seller');
-- insert into public.farms (seller_id, farm_name, location) values ('USER-UUID-HERE', 'Juan''s Sungrown Farm', 'Digos Valley');
