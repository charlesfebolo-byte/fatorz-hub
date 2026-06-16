-- Add a public-link access token hash for secure post-purchase order summaries.
-- The raw token is never stored; only its SHA-256 hash is persisted.

alter table public.site_product_orders
  add column if not exists order_access_token_hash text,
  add column if not exists order_access_token_created_at timestamptz;

comment on column public.site_product_orders.order_access_token_hash
is 'SHA-256 hash of the post-purchase access token used with orderId to view the safe order summary.';

comment on column public.site_product_orders.order_access_token_created_at
is 'Timestamp when the current post-purchase access token hash was generated.';
