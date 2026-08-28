-- =========================================================
-- 1. Create the central moderation system
-- =========================================================

create table public.moderation_requests (
  id uuid primary key default gen_random_uuid(),

  subject_type text not null,
  subject_id uuid not null,

  action text not null,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  proposed_data jsonb,

  admin_note text,

  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moderation_requests enable row level security;


-- =========================================================
-- 2. Separate Product lifecycle from moderation status
-- =========================================================

drop policy if exists "Public can read approved products"
on public.products;

alter table public.products
drop constraint if exists products_status_check;

update public.products
set status = 'draft';

alter table public.products
rename column status to lifecycle_status;

alter table public.products
alter column lifecycle_status set default 'draft';

alter table public.products
add constraint products_lifecycle_status_check
check (lifecycle_status in ('draft', 'published'));


-- =========================================================
-- 3. Public users can only see published products
-- =========================================================

create policy "Public can read published products"
on public.products
for select
to anon, authenticated
using (lifecycle_status = 'published');


-- =========================================================
-- 4. Update Product ↔ Shopping Category public policy
-- =========================================================

drop policy if exists
"Public can read approved product shopping categories"
on public.product_shopping_categories;

create policy "Public can read published product shopping categories"
on public.product_shopping_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_shopping_categories.product_id
      and products.lifecycle_status = 'published'
  )
  and exists (
    select 1
    from public.shopping_categories
    where shopping_categories.id =
      product_shopping_categories.shopping_category_id
      and shopping_categories.is_active = true
  )
);