-- LocalBites production workflow upgrade
-- Run this once in Supabase Dashboard > SQL Editor after the existing schema.
-- This migration adds atomic checkout, safe order transitions, delivery tracking,
-- and per-user in-app notifications. It is safe to run more than once.

begin;

alter table public.orders
  add column if not exists status_updated_at timestamptz not null default now(),
  add column if not exists confirmed_at timestamptz,
  add column if not exists preparing_at timestamptz,
  add column if not exists dispatched_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists estimated_delivery_at timestamptz,
  add column if not exists tracking_note text;

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null default 'general',
  related_order_id uuid references public.orders(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read)
  where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "users view own notifications" on public.notifications;
create policy "users view own notifications"
on public.notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications"
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users delete own notifications" on public.notifications;
create policy "users delete own notifications"
on public.notifications for delete to authenticated
using (user_id = auth.uid());

-- Orders must be created only by place_order so clients cannot bypass stock
-- checks or submit their own prices.
drop policy if exists "buyers create own orders" on public.orders;
drop policy if exists "buyers create order items for own orders" on public.order_items;

-- Sellers use update_order_status so transitions and stock restoration are
-- enforced by the database.
drop policy if exists "sellers update orders containing their products" on public.orders;

-- Non-recursive read helpers keep buyer/seller order visibility working with
-- Row Level Security while avoiding policy recursion.
create or replace function public.buyer_can_access_order_item(item_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders
    where id = item_order_id and buyer_id = auth.uid()
  );
$$;

create or replace function public.seller_can_access_order(order_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.order_items
    where order_id = order_uuid and seller_id = auth.uid()
  );
$$;

revoke all on function public.buyer_can_access_order_item(uuid) from public;
revoke all on function public.seller_can_access_order(uuid) from public;
grant execute on function public.buyer_can_access_order_item(uuid) to authenticated;
grant execute on function public.seller_can_access_order(uuid) to authenticated;

drop policy if exists "buyers view own order items" on public.order_items;
create policy "buyers view own order items"
on public.order_items for select to authenticated
using (public.buyer_can_access_order_item(order_id));

drop policy if exists "sellers view orders containing their products" on public.orders;
create policy "sellers view orders containing their products"
on public.orders for select to authenticated
using (public.seller_can_access_order(id));

-- Normalize legacy mixed-seller orders. New checkout already creates one order
-- per seller, but this keeps older records compatible with seller-owned status
-- transitions as well.
do $$
declare
  legacy_order record;
  seller_group record;
  target_order_id uuid;
  use_original boolean;
begin
  for legacy_order in
    select orders.*
    from public.orders as orders
    where (
      select count(distinct items.seller_id)
      from public.order_items as items
      where items.order_id = orders.id
    ) > 1
  loop
    use_original := true;

    for seller_group in
      select
        items.seller_id,
        sum(items.quantity * items.unit_price)::numeric(10,2) as seller_total
      from public.order_items as items
      where items.order_id = legacy_order.id
      group by items.seller_id
      order by items.seller_id::text
    loop
      if use_original then
        target_order_id := legacy_order.id;
        update public.orders
        set subtotal = seller_group.seller_total,
            total = seller_group.seller_total,
            updated_at = now()
        where id = target_order_id;
        use_original := false;
      else
        insert into public.orders (
          buyer_id, status, contact_name, phone, business_name,
          delivery_address, delivery_method, payment_method, subtotal, total,
          buyer_hidden, created_at, updated_at, status_updated_at,
          confirmed_at, preparing_at, dispatched_at, delivered_at,
          estimated_delivery_at, tracking_note
        ) values (
          legacy_order.buyer_id, legacy_order.status, legacy_order.contact_name,
          legacy_order.phone, legacy_order.business_name,
          legacy_order.delivery_address, legacy_order.delivery_method,
          legacy_order.payment_method, seller_group.seller_total,
          seller_group.seller_total, legacy_order.buyer_hidden,
          legacy_order.created_at, now(), legacy_order.status_updated_at,
          legacy_order.confirmed_at, legacy_order.preparing_at,
          legacy_order.dispatched_at, legacy_order.delivered_at,
          legacy_order.estimated_delivery_at, legacy_order.tracking_note
        ) returning id into target_order_id;
      end if;

      update public.order_items
      set order_id = target_order_id
      where order_id = legacy_order.id
        and seller_id = seller_group.seller_id;
    end loop;
  end loop;
end $$;

create or replace function public.place_order(
  p_phone text,
  p_business_name text,
  p_delivery_address text,
  p_delivery_method text,
  p_payment_method text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  buyer_name text;
  requested_item record;
  seller_record record;
  created_order_id uuid;
  created_orders jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to place an order.';
  end if;

  select nullif(trim(full_name), '')
  into buyer_name
  from public.profiles
  where id = current_user_id;

  if buyer_name is null then
    raise exception 'Complete your buyer profile before checking out.';
  end if;

  if nullif(trim(p_phone), '') is null
     or nullif(trim(p_business_name), '') is null
     or nullif(trim(p_delivery_address), '') is null then
    raise exception 'Phone number, business name, and delivery address are required.';
  end if;

  if coalesce(p_delivery_method, '') not in ('route_dispatch', 'farm_pickup') then
    raise exception 'Invalid delivery method.';
  end if;

  if coalesce(p_payment_method, '') not in ('cash_on_delivery', 'gcash') then
    raise exception 'Invalid payment method.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Order items must be provided as an array.';
  end if;

  if jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'An order must contain between 1 and 50 products.';
  end if;

  -- Lock every requested product in UUID order. Concurrent checkouts then wait
  -- for the current transaction and re-check the remaining stock.
  for requested_item in
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'quantity')::numeric) as quantity
    from jsonb_array_elements(p_items) as entries(item)
    group by (item->>'product_id')::uuid
    order by (item->>'product_id')::uuid
  loop
    if requested_item.product_id is null
       or requested_item.quantity is null
       or requested_item.quantity <= 0
       or requested_item.quantity <> trunc(requested_item.quantity) then
      raise exception 'Product quantities must be positive whole numbers.';
    end if;

    perform 1
    from public.products
    where id = requested_item.product_id
      and is_active = true
    for update;

    if not found then
      raise exception 'A selected product is no longer available.';
    end if;

    if (
      select available_quantity
      from public.products
      where id = requested_item.product_id
    ) < requested_item.quantity then
      raise exception 'A selected product no longer has enough stock.';
    end if;
  end loop;

  -- One order is created per seller. This prevents one seller from changing
  -- another seller's fulfillment status in a mixed-farm cart.
  for seller_record in
    with requested as (
      select
        (item->>'product_id')::uuid as product_id,
        sum((item->>'quantity')::numeric) as quantity
      from jsonb_array_elements(p_items) as entries(item)
      group by (item->>'product_id')::uuid
    )
    select
      farms.seller_id,
      sum(products.price * requested.quantity)::numeric(10,2) as order_total
    from requested
    join public.products on products.id = requested.product_id
    join public.farms on farms.id = products.farm_id
    group by farms.seller_id
  loop
    insert into public.orders (
      buyer_id,
      status,
      contact_name,
      phone,
      business_name,
      delivery_address,
      delivery_method,
      payment_method,
      subtotal,
      total,
      status_updated_at
    ) values (
      current_user_id,
      'pending',
      buyer_name,
      trim(p_phone),
      trim(p_business_name),
      trim(p_delivery_address),
      p_delivery_method,
      p_payment_method,
      seller_record.order_total,
      seller_record.order_total,
      now()
    )
    returning id into created_order_id;

    with requested as (
      select
        (item->>'product_id')::uuid as product_id,
        sum((item->>'quantity')::numeric) as quantity
      from jsonb_array_elements(p_items) as entries(item)
      group by (item->>'product_id')::uuid
    )
    insert into public.order_items (
      order_id,
      product_id,
      seller_id,
      product_name,
      unit,
      quantity,
      unit_price
    )
    select
      created_order_id,
      products.id,
      seller_record.seller_id,
      products.name,
      products.unit,
      requested.quantity,
      products.price
    from requested
    join public.products on products.id = requested.product_id
    join public.farms on farms.id = products.farm_id
    where farms.seller_id = seller_record.seller_id;

    with requested as (
      select
        (item->>'product_id')::uuid as product_id,
        sum((item->>'quantity')::numeric) as quantity
      from jsonb_array_elements(p_items) as entries(item)
      group by (item->>'product_id')::uuid
    )
    update public.products as products
    set available_quantity = products.available_quantity - requested.quantity,
        updated_at = now()
    from requested, public.farms as farms
    where products.id = requested.product_id
      and farms.id = products.farm_id
      and farms.seller_id = seller_record.seller_id;

    insert into public.notifications (
      user_id, title, message, notification_type, related_order_id
    ) values (
      seller_record.seller_id,
      'New order received',
      buyer_name || ' placed a new order that needs confirmation.',
      'new_order',
      created_order_id
    );

    insert into public.notifications (
      user_id, title, message, notification_type, related_order_id
    ) values (
      current_user_id,
      'Order placed',
      'Your order is pending seller confirmation.',
      'order_placed',
      created_order_id
    );

    created_orders := created_orders || jsonb_build_array(
      jsonb_build_object(
        'order_id', created_order_id,
        'seller_id', seller_record.seller_id,
        'total', seller_record.order_total
      )
    );
  end loop;

  return created_orders;
end;
$$;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_tracking_note text default null,
  p_estimated_delivery_at timestamptz default null
)
returns public.order_status
language plpgsql
security definer
set search_path = public
as $$
declare
  current_seller_id uuid := auth.uid();
  buyer_id uuid;
  previous_status public.order_status;
begin
  if current_seller_id is null then
    raise exception 'You must be signed in to update an order.';
  end if;

  select orders.buyer_id, orders.status
  into buyer_id, previous_status
  from public.orders as orders
  where orders.id = p_order_id
    and exists (
      select 1
      from public.order_items as items
      where items.order_id = orders.id
        and items.seller_id = current_seller_id
    )
    and not exists (
      select 1
      from public.order_items as other_items
      where other_items.order_id = orders.id
        and other_items.seller_id <> current_seller_id
    )
  for update;

  if not found then
    raise exception 'Order not found or not owned by this seller.';
  end if;

  if p_status = previous_status then
    return previous_status;
  end if;

  if not (
    (previous_status = 'pending' and p_status in ('dispatched', 'cancelled'))
    or (previous_status = 'confirmed' and p_status in ('preparing', 'dispatched', 'cancelled'))
    or (previous_status = 'preparing' and p_status in ('dispatched', 'cancelled'))
    or (previous_status = 'dispatched' and p_status = 'delivered')
  ) then
    raise exception 'Invalid order status change from % to %.', previous_status, p_status;
  end if;

  if p_status = 'cancelled' then
    update public.products as products
    set available_quantity = products.available_quantity + items.quantity,
        updated_at = now()
    from public.order_items as items
    where items.order_id = p_order_id
      and items.product_id = products.id;
  end if;

  update public.orders
  set status = p_status,
      status_updated_at = now(),
      updated_at = now(),
      confirmed_at = case
        when p_status in ('confirmed', 'dispatched') and confirmed_at is null then now()
        else confirmed_at
      end,
      preparing_at = case when p_status = 'preparing' then now() else preparing_at end,
      dispatched_at = case when p_status = 'dispatched' then now() else dispatched_at end,
      delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
      estimated_delivery_at = case
        when p_status = 'dispatched' then coalesce(p_estimated_delivery_at, now() + interval '2 hours')
        else estimated_delivery_at
      end,
      tracking_note = coalesce(nullif(trim(p_tracking_note), ''), tracking_note)
  where id = p_order_id;

  insert into public.notifications (
    user_id, title, message, notification_type, related_order_id
  ) values (
    buyer_id,
    'Order ' || initcap(p_status::text),
    case p_status
      when 'confirmed' then 'The seller confirmed your order.'
      when 'preparing' then 'The seller is preparing your order.'
      when 'dispatched' then 'Your order is on the way.'
      when 'delivered' then 'Your order was marked as delivered.'
      when 'cancelled' then 'The seller could not fulfill your order. Reserved stock was restored.'
      else 'Your order status was updated.'
    end,
    'order_status',
    p_order_id
  );

  return p_status;
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, jsonb) from public;
revoke all on function public.update_order_status(uuid, public.order_status, text, timestamptz) from public;

do $$
begin
  if to_regprocedure('public.decrement_product_stock(uuid,numeric)') is not null then
    execute 'revoke execute on function public.decrement_product_stock(uuid, numeric) from authenticated';
  end if;
end $$;

grant execute on function public.place_order(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text, timestamptz) to authenticated;

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
        and orders.status in ('delivered', 'cancelled')
    );

  get diagnostics cleared_count = row_count;
  return cleared_count;
end;
$$;

revoke all on function public.clear_seller_order_history() from public;
grant execute on function public.clear_seller_order_history() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

commit;
