-- Persistent, per-user order-history clearing.
-- Run this once in the Supabase SQL Editor.

alter table public.orders
add column if not exists buyer_hidden boolean not null default false;

alter table public.order_items
add column if not exists seller_hidden boolean not null default false;

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
