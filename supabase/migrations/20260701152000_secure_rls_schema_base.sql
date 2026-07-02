-- FatorZ Hub RLS companion for the incremental base schema.
-- Proposed only: do not apply without an approved production runbook.
-- Run after 20260701150000_base_schema_incremental.sql.

insert into storage.buckets (id, name, public)
values
  ('academy', 'academy', true),
  ('product-covers', 'product-covers', true)
on conflict (id) do update
set public = excluded.public;

create or replace function public.fatorz_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role = 'admin'
        or p.staff_role in (
          'ceo_fatorz',
          'diretor_operacional',
          'gestor_entregas',
          'criador_visual',
          'suporte_fatorz',
          'financeiro',
          'mentor_academy',
          'CEO / Admin',
          'Diretor Operacional',
          'Gestor de Entregas',
          'Criador Visual',
          'Suporte FatorZ',
          'Financeiro',
          'Mentor Academy'
        )
      )
  );
$$;

revoke all on function public.fatorz_is_staff() from public;
grant execute on function public.fatorz_is_staff() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fatorz_is_staff();
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.fatorz_has_course_access(course_id_input bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_purchases cp
    where cp.user_id = (select auth.uid())
      and cp.course_id = course_id_input
      and cp.status = 'approved'
  );
$$;

revoke all on function public.fatorz_has_course_access(bigint) from public;
grant execute on function public.fatorz_has_course_access(bigint) to authenticated;

create or replace function public.fatorz_owns_site_product_order(order_id_input bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_product_orders spo
    where spo.id = order_id_input
      and (
        spo.user_id = (select auth.uid())
        or lower(coalesce(spo.user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

revoke all on function public.fatorz_owns_site_product_order(bigint) from public;
grant execute on function public.fatorz_owns_site_product_order(bigint) to authenticated;

create or replace function public.fatorz_protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protected_fields text[] := array[
    'role',
    'staff_role',
    'customer_tag',
    'total_spent',
    'academy_expires_at'
  ];
  staff_roles text[] := array[
    'ceo_fatorz',
    'diretor_operacional',
    'gestor_entregas',
    'criador_visual',
    'suporte_fatorz',
    'financeiro',
    'mentor_academy',
    'CEO / Admin',
    'Diretor Operacional',
    'Gestor de Entregas',
    'Criador Visual',
    'Suporte FatorZ',
    'Financeiro',
    'Mentor Academy'
  ];
  actor_id uuid := auth.uid();
  actor_is_staff boolean := false;
  field_name text;
  old_profile jsonb;
  new_profile jsonb;
begin
  if actor_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = actor_id
      and (
        p.role = 'admin'
        or p.staff_role = any(staff_roles)
      )
  )
  into actor_is_staff;

  if actor_is_staff then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.role, 'user') <> 'user' then
      raise exception 'profiles.role cannot be self-assigned.' using errcode = '42501';
    end if;

    if coalesce(new.staff_role, 'none') <> 'none' then
      raise exception 'profiles.staff_role cannot be self-assigned.' using errcode = '42501';
    end if;

    if coalesce(new.customer_tag, 'free') <> 'free' then
      raise exception 'profiles.customer_tag cannot be self-assigned.' using errcode = '42501';
    end if;

    if coalesce(new.total_spent, 0) <> 0 then
      raise exception 'profiles.total_spent cannot be self-assigned.' using errcode = '42501';
    end if;

    if new.academy_expires_at is not null then
      raise exception 'profiles.academy_expires_at cannot be self-assigned.' using errcode = '42501';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    old_profile := to_jsonb(old);
    new_profile := to_jsonb(new);

    foreach field_name in array protected_fields loop
      if (old_profile -> field_name) is distinct from (new_profile -> field_name) then
        raise exception
          'Protected profiles field cannot be changed by a normal user: %',
          field_name
          using errcode = '42501';
      end if;
    end loop;

    return new;
  end if;

  return new;
end;
$$;

revoke all on function public.fatorz_protect_profile_sensitive_fields() from public;

drop trigger if exists fatorz_protect_profile_sensitive_fields on public.profiles;
create trigger fatorz_protect_profile_sensitive_fields
before insert or update on public.profiles
for each row
execute function public.fatorz_protect_profile_sensitive_fields();

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_staff" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_staff" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles_select_staff" on public.profiles
  for select to authenticated
  using (public.fatorz_is_staff());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "profiles_update_staff" on public.profiles
  for update to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.site_products enable row level security;
drop policy if exists "site_products_select_active_public" on public.site_products;
drop policy if exists "site_products_select_staff" on public.site_products;
drop policy if exists "site_products_manage_staff" on public.site_products;
create policy "site_products_select_active_public" on public.site_products
  for select to anon, authenticated
  using (is_active is true);
create policy "site_products_select_staff" on public.site_products
  for select to authenticated
  using (public.fatorz_is_staff());
create policy "site_products_manage_staff" on public.site_products
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.site_product_orders enable row level security;
drop policy if exists "site_product_orders_select_own" on public.site_product_orders;
drop policy if exists "site_product_orders_select_staff" on public.site_product_orders;
drop policy if exists "site_product_orders_manage_staff" on public.site_product_orders;
create policy "site_product_orders_select_own" on public.site_product_orders
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "site_product_orders_select_staff" on public.site_product_orders
  for select to authenticated
  using (public.fatorz_is_staff());
create policy "site_product_orders_manage_staff" on public.site_product_orders
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.course_purchases enable row level security;
drop policy if exists "course_purchases_select_own" on public.course_purchases;
drop policy if exists "course_purchases_select_staff" on public.course_purchases;
drop policy if exists "course_purchases_manage_staff" on public.course_purchases;
create policy "course_purchases_select_own" on public.course_purchases
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "course_purchases_select_staff" on public.course_purchases
  for select to authenticated
  using (public.fatorz_is_staff());
create policy "course_purchases_manage_staff" on public.course_purchases
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.courses enable row level security;
drop policy if exists "courses_select_active_public" on public.courses;
drop policy if exists "courses_select_staff" on public.courses;
drop policy if exists "courses_manage_staff" on public.courses;
create policy "courses_select_active_public" on public.courses
  for select to anon, authenticated
  using (is_active is true);
create policy "courses_select_staff" on public.courses
  for select to authenticated
  using (public.fatorz_is_staff());
create policy "courses_manage_staff" on public.courses
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.lessons enable row level security;
drop policy if exists "lessons_select_owned_or_staff" on public.lessons;
drop policy if exists "lessons_manage_staff" on public.lessons;
create policy "lessons_select_owned_or_staff" on public.lessons
  for select to authenticated
  using (public.fatorz_is_staff() or public.fatorz_has_course_access(course_id));
create policy "lessons_manage_staff" on public.lessons
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.lesson_progress enable row level security;
drop policy if exists "lesson_progress_select_own_or_staff" on public.lesson_progress;
drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
drop policy if exists "lesson_progress_delete_own" on public.lesson_progress;
drop policy if exists "lesson_progress_manage_staff" on public.lesson_progress;
create policy "lesson_progress_select_own_or_staff" on public.lesson_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or public.fatorz_is_staff());
create policy "lesson_progress_insert_own" on public.lesson_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "lesson_progress_update_own" on public.lesson_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "lesson_progress_delete_own" on public.lesson_progress
  for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "lesson_progress_manage_staff" on public.lesson_progress
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.service_briefings enable row level security;
drop policy if exists "service_briefings_select_own_or_staff" on public.service_briefings;
drop policy if exists "service_briefings_insert_own" on public.service_briefings;
drop policy if exists "service_briefings_update_own" on public.service_briefings;
drop policy if exists "service_briefings_manage_staff" on public.service_briefings;
create policy "service_briefings_select_own_or_staff" on public.service_briefings
  for select to authenticated
  using (
    public.fatorz_is_staff()
    or user_id = (select auth.uid())
    or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.fatorz_owns_site_product_order(order_id)
  );
create policy "service_briefings_insert_own" on public.service_briefings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.fatorz_owns_site_product_order(order_id)
  );
create policy "service_briefings_update_own" on public.service_briefings
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.fatorz_owns_site_product_order(order_id)
  )
  with check (
    user_id = (select auth.uid())
    or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.fatorz_owns_site_product_order(order_id)
  );
create policy "service_briefings_manage_staff" on public.service_briefings
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.projects enable row level security;
drop policy if exists "projects_select_owner_or_staff" on public.projects;
drop policy if exists "projects_manage_staff" on public.projects;
create policy "projects_select_owner_or_staff" on public.projects
  for select to authenticated
  using (
    public.fatorz_is_staff()
    or user_id = (select auth.uid())
    or lower(coalesce(client_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "projects_manage_staff" on public.projects
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.academy_links enable row level security;
drop policy if exists "academy_links_select_authenticated_active" on public.academy_links;
drop policy if exists "academy_links_select_staff" on public.academy_links;
drop policy if exists "academy_links_manage_staff" on public.academy_links;
create policy "academy_links_select_authenticated_active" on public.academy_links
  for select to authenticated
  using (is_active is true);
create policy "academy_links_select_staff" on public.academy_links
  for select to authenticated
  using (public.fatorz_is_staff());
create policy "academy_links_manage_staff" on public.academy_links
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.ai_usage enable row level security;
drop policy if exists "ai_usage_select_own_or_staff" on public.ai_usage;
create policy "ai_usage_select_own_or_staff" on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()) or public.fatorz_is_staff());

alter table public.orders enable row level security;
drop policy if exists "orders_select_owner_or_staff" on public.orders;
drop policy if exists "orders_manage_staff" on public.orders;
create policy "orders_select_owner_or_staff" on public.orders
  for select to authenticated
  using (
    public.fatorz_is_staff()
    or user_id = (select auth.uid())
    or lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "orders_manage_staff" on public.orders
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.payments enable row level security;
drop policy if exists "payments_staff_only" on public.payments;
create policy "payments_staff_only" on public.payments
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.clients enable row level security;
drop policy if exists "clients_staff_only" on public.clients;
create policy "clients_staff_only" on public.clients
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.mural_posts enable row level security;
drop policy if exists "mural_posts_select_published" on public.mural_posts;
drop policy if exists "mural_posts_select_staff" on public.mural_posts;
drop policy if exists "mural_posts_manage_staff" on public.mural_posts;
create policy "mural_posts_select_published" on public.mural_posts
  for select to authenticated
  using (status = 'published');
create policy "mural_posts_select_staff" on public.mural_posts
  for select to authenticated
  using (public.fatorz_is_staff());
create policy "mural_posts_manage_staff" on public.mural_posts
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

alter table public.mural_reactions enable row level security;
drop policy if exists "mural_reactions_select_authenticated" on public.mural_reactions;
drop policy if exists "mural_reactions_insert_own" on public.mural_reactions;
drop policy if exists "mural_reactions_update_own" on public.mural_reactions;
drop policy if exists "mural_reactions_delete_own" on public.mural_reactions;
drop policy if exists "mural_reactions_manage_staff" on public.mural_reactions;
create policy "mural_reactions_select_authenticated" on public.mural_reactions
  for select to authenticated
  using (true);
create policy "mural_reactions_insert_own" on public.mural_reactions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "mural_reactions_update_own" on public.mural_reactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "mural_reactions_delete_own" on public.mural_reactions
  for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "mural_reactions_manage_staff" on public.mural_reactions
  for all to authenticated
  using (public.fatorz_is_staff())
  with check (public.fatorz_is_staff());

drop policy if exists "storage_public_read_fatorz_assets" on storage.objects;
drop policy if exists "storage_staff_insert_fatorz_assets" on storage.objects;
drop policy if exists "storage_staff_update_fatorz_assets" on storage.objects;
drop policy if exists "storage_staff_delete_fatorz_assets" on storage.objects;
create policy "storage_public_read_fatorz_assets" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('academy', 'product-covers'));
create policy "storage_staff_insert_fatorz_assets" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('academy', 'product-covers') and public.fatorz_is_staff());
create policy "storage_staff_update_fatorz_assets" on storage.objects
  for update to authenticated
  using (bucket_id in ('academy', 'product-covers') and public.fatorz_is_staff())
  with check (bucket_id in ('academy', 'product-covers') and public.fatorz_is_staff());
create policy "storage_staff_delete_fatorz_assets" on storage.objects
  for delete to authenticated
  using (bucket_id in ('academy', 'product-covers') and public.fatorz_is_staff());

do $$
begin
  if to_regclass('public.mp_links') is not null then
    execute 'alter table public.mp_links enable row level security';
  end if;
end $$;

-- Decision: public.mp_links is legacy/no current FatorZ Hub dependency and rows=0 in the confirmed FatorZ project.
-- RLS is enabled above without public policies, so public API access is blocked unless a future migration adds explicit policies.
