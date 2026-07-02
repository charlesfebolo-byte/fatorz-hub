-- FatorZ Hub base schema gap fill.
-- Proposed only: do not apply without an approved production runbook.
-- This migration intentionally does not create RLS policies or storage policies.
-- See docs/SCHEMA_GAP_ANALYSIS.md and docs/SUPABASE_SCHEMA_RUNBOOK.md.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz,
  add column if not exists email text,
  add column if not exists nome text,
  add column if not exists whatsapp text,
  add column if not exists instagram text,
  add column if not exists role text not null default 'user',
  add column if not exists customer_tag text not null default 'free',
  add column if not exists staff_role text not null default 'none',
  add column if not exists total_spent numeric not null default 0,
  add column if not exists academy_expires_at timestamptz;

create table if not exists public.courses (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.courses
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists title text,
  add column if not exists subtitle text,
  add column if not exists description text,
  add column if not exists cover_url text,
  add column if not exists badge text,
  add column if not exists order_index integer,
  add column if not exists is_active boolean not null default true,
  add column if not exists price_cents integer,
  add column if not exists payment_url text,
  add column if not exists is_paid boolean not null default true;

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.lessons
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists course_id bigint references public.courses(id) on delete set null,
  add column if not exists module_title text,
  add column if not exists lesson_title text,
  add column if not exists description text,
  add column if not exists video_url text,
  add column if not exists order_index integer;

create table if not exists public.site_products (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.site_products
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz,
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists subtitle text,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists product_type text,
  add column if not exists price_cents integer not null default 0,
  add column if not exists old_price_cents integer,
  add column if not exists is_active boolean not null default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists order_index integer,
  add column if not exists image_url text,
  add column if not exists badge text,
  add column if not exists checkout_provider text,
  add column if not exists external_payment_url text,
  add column if not exists accepts_pix boolean not null default true,
  add column if not exists accepts_boleto boolean not null default true,
  add column if not exists accepts_card boolean not null default true,
  add column if not exists appmax_sku text,
  add column if not exists appmax_product_name text,
  add column if not exists course_id bigint references public.courses(id) on delete set null,
  add column if not exists notes text;

create unique index if not exists site_products_slug_key on public.site_products(slug);

create table if not exists public.projects (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists title text,
  add column if not exists client_name text,
  add column if not exists client_email text,
  add column if not exists service_type text,
  add column if not exists status text,
  add column if not exists deadline date,
  add column if not exists amount numeric,
  add column if not exists delivery_link text,
  add column if not exists notes text,
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists customer_email text,
  add column if not exists customer_name text,
  add column if not exists customer_whatsapp text,
  add column if not exists product_id text,
  add column if not exists product_name text,
  add column if not exists product_category text,
  add column if not exists product_price text,
  add column if not exists payment_link text,
  add column if not exists status text,
  add column if not exists payment_id text,
  add column if not exists project_id bigint references public.projects(id) on delete set null,
  add column if not exists notes text;

create table if not exists public.site_product_orders (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.site_product_orders
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_document text,
  add column if not exists product_id bigint references public.site_products(id) on delete set null,
  add column if not exists product_slug text,
  add column if not exists product_name text,
  add column if not exists product_category text,
  add column if not exists product_type text,
  add column if not exists amount_cents integer,
  add column if not exists status text,
  add column if not exists payment_provider text,
  add column if not exists payment_method text,
  add column if not exists appmax_customer_id text,
  add column if not exists appmax_order_id text,
  add column if not exists appmax_payment_id text,
  add column if not exists payment_id text,
  add column if not exists pix_qr_code text,
  add column if not exists pix_copy_paste text,
  add column if not exists boleto_url text,
  add column if not exists boleto_barcode text,
  add column if not exists boleto_digitable_line text,
  add column if not exists boleto_expiration_date date,
  add column if not exists raw_payment_response jsonb,
  add column if not exists project_id bigint references public.projects(id) on delete set null,
  add column if not exists notes text,
  add column if not exists order_access_token_hash text,
  add column if not exists order_access_token_created_at timestamptz;

create index if not exists site_product_orders_user_id_idx on public.site_product_orders(user_id);
create index if not exists site_product_orders_user_email_idx on public.site_product_orders(lower(user_email));
create index if not exists site_product_orders_appmax_order_id_idx on public.site_product_orders(appmax_order_id);
create index if not exists site_product_orders_appmax_payment_id_idx on public.site_product_orders(appmax_payment_id);
create index if not exists site_product_orders_payment_id_idx on public.site_product_orders(payment_id);

create table if not exists public.course_purchases (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.course_purchases
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists course_id bigint references public.courses(id) on delete set null,
  add column if not exists course_title text,
  add column if not exists payment_id text,
  add column if not exists payment_url text,
  add column if not exists status text,
  add column if not exists access_type text,
  add column if not exists approved_at timestamptz,
  add column if not exists notes text,
  add column if not exists payment_provider text,
  add column if not exists payment_method text,
  add column if not exists amount_cents integer,
  add column if not exists appmax_customer_id text,
  add column if not exists appmax_order_id text,
  add column if not exists appmax_payment_id text,
  add column if not exists pix_qr_code text,
  add column if not exists pix_copy_paste text,
  add column if not exists raw_payment_response jsonb;

create index if not exists course_purchases_user_id_idx on public.course_purchases(user_id);
create index if not exists course_purchases_user_email_idx on public.course_purchases(lower(user_email));
create index if not exists course_purchases_course_id_idx on public.course_purchases(course_id);
create index if not exists course_purchases_appmax_order_id_idx on public.course_purchases(appmax_order_id);
create index if not exists course_purchases_appmax_payment_id_idx on public.course_purchases(appmax_payment_id);
create index if not exists course_purchases_payment_id_idx on public.course_purchases(payment_id);

create table if not exists public.lesson_progress (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.lesson_progress
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists lesson_id uuid references public.lessons(id) on delete cascade,
  add column if not exists completed boolean not null default false,
  add column if not exists watched_at timestamptz;

create unique index if not exists lesson_progress_user_lesson_key
  on public.lesson_progress(user_id, lesson_id);

create table if not exists public.academy_links (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.academy_links
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists url text,
  add column if not exists category text,
  add column if not exists order_index integer,
  add column if not exists is_active boolean not null default true;

create table if not exists public.service_briefings (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.service_briefings
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz,
  add column if not exists order_id bigint references public.site_product_orders(id) on delete cascade,
  add column if not exists project_id bigint references public.projects(id) on delete set null,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists customer_name text,
  add column if not exists product_name text,
  add column if not exists product_category text,
  add column if not exists product_type text,
  add column if not exists brand_name text,
  add column if not exists instagram text,
  add column if not exists whatsapp text,
  add column if not exists website text,
  add column if not exists city text,
  add column if not exists main_objective text,
  add column if not exists offer_description text,
  add column if not exists target_audience text,
  add column if not exists colors text,
  add column if not exists avoid_colors text,
  add column if not exists visual_style text,
  add column if not exists references_like text,
  add column if not exists references_dislike text,
  add column if not exists logo_link text,
  add column if not exists material_links text,
  add column if not exists copy_notes text,
  add column if not exists extra_notes text,
  add column if not exists status text;

create unique index if not exists service_briefings_order_id_key on public.service_briefings(order_id);

create table if not exists public.payments (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.payments
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists client_name text,
  add column if not exists product_name text,
  add column if not exists amount numeric,
  add column if not exists status text,
  add column if not exists payment_method text,
  add column if not exists notes text;

create table if not exists public.clients (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.clients
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists name text,
  add column if not exists service text,
  add column if not exists status text,
  add column if not exists instagram text,
  add column if not exists whatsapp text,
  add column if not exists email text,
  add column if not exists notes text,
  add column if not exists monthly_value numeric,
  add column if not exists plan text,
  add column if not exists started_at date;

create table if not exists public.mural_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.mural_posts
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists title text,
  add column if not exists content text,
  add column if not exists category text,
  add column if not exists status text not null default 'published',
  add column if not exists pinned boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.mural_reactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.mural_reactions
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists post_id uuid references public.mural_posts(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists emoji text;

create unique index if not exists mural_reactions_post_user_key
  on public.mural_reactions(post_id, user_id);

create table if not exists public.ai_usage (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

alter table public.ai_usage
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists usage_date date,
  add column if not exists count integer not null default 0,
  add column if not exists updated_at timestamptz;

create unique index if not exists ai_usage_user_date_key on public.ai_usage(user_id, usage_date);
