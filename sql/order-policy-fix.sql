-- Fixes: infinite recursion detected in policy for relation "orders"
-- Run this after order-policies.sql.

drop policy if exists "buyers view own order items" on public.order_items;

create or replace function public.buyer_can_access_order_item(item_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = item_order_id and o.buyer_id = auth.uid()
  );
$$;

revoke all on function public.buyer_can_access_order_item(uuid) from public;
grant execute on function public.buyer_can_access_order_item(uuid) to authenticated;

create policy "buyers view own order items"
on public.order_items
for select to authenticated
using (public.buyer_can_access_order_item(order_id));

drop policy if exists "sellers update orders containing their products" on public.orders;
drop policy if exists "sellers view orders containing their products" on public.orders;

create or replace function public.seller_can_access_order(order_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items oi
    where oi.order_id = order_uuid
      and oi.seller_id = auth.uid()
  );
$$;

revoke all on function public.seller_can_access_order(uuid) from public;
grant execute on function public.seller_can_access_order(uuid) to authenticated;

create policy "sellers view orders containing their products"
on public.orders
for select
to authenticated
using (public.seller_can_access_order(id));

create policy "sellers update orders containing their products"
on public.orders
for update
to authenticated
using (public.seller_can_access_order(id))
with check (public.seller_can_access_order(id));
