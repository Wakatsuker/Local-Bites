-- Run after supabase-schema.sql to allow real checkout and seller order updates.
drop policy if exists "buyers create order items for own orders" on public.order_items;
create policy "buyers create order items for own orders" on public.order_items
for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));

drop policy if exists "sellers update orders containing their products" on public.orders;
create policy "sellers update orders containing their products" on public.orders
for update to authenticated using (exists (select 1 from public.order_items oi where oi.order_id = id and oi.seller_id = auth.uid())) with check (exists (select 1 from public.order_items oi where oi.order_id = id and oi.seller_id = auth.uid()));

drop policy if exists "sellers view orders containing their products" on public.orders;
create policy "sellers view orders containing their products" on public.orders
for select to authenticated using (exists (select 1 from public.order_items oi where oi.order_id = id and oi.seller_id = auth.uid()));
