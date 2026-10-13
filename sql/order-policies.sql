-- Legacy policy cleanup.
-- Checkout and seller status changes now use the secure functions in
-- production-requirements.sql. Do not restore direct insert/update policies.
drop policy if exists "buyers create order items for own orders" on public.order_items;
drop policy if exists "sellers update orders containing their products" on public.orders;
