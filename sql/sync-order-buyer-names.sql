-- Run this once in the Supabase SQL Editor.
-- It replaces old sample checkout names with each buyer's current profile name.

update public.orders as orders
set contact_name = profiles.full_name,
    updated_at = now()
from public.profiles as profiles
where profiles.id = orders.buyer_id
  and nullif(trim(profiles.full_name), '') is not null
  and orders.contact_name is distinct from profiles.full_name;
