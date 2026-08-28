create table public.product_shopping_categories (
  product_id uuid not null
    references public.products(id)
    on delete cascade,

  shopping_category_id uuid not null
    references public.shopping_categories(id),

  created_at timestamptz not null default now(),

  primary key (product_id, shopping_category_id)
);

alter table public.product_shopping_categories enable row level security;