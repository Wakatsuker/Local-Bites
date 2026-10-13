-- Legacy helper retained for reference.
-- New checkout code uses place_order from production-requirements.sql.
-- Direct execution is intentionally denied because this function does not
-- prove that the deduction belongs to a valid order.
create or replace function public.decrement_product_stock(p_product_id uuid, p_quantity numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare updated_count integer;
begin
  if auth.uid() is null or p_quantity <= 0 then return false; end if;
  update public.products
  set available_quantity = available_quantity - p_quantity,
      updated_at = now()
  where id = p_product_id
    and is_active = true
    and available_quantity >= p_quantity;
  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.decrement_product_stock(uuid, numeric) from public;
revoke execute on function public.decrement_product_stock(uuid, numeric) from authenticated;
