-- Security hardening: enable RLS for exposed Hub tables and protect Academy access.
-- Created manually because the local Supabase CLI binary crashes on this machine.

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
      and spo.user_id = (select auth.uid())
  );
$$;

revoke all on function public.fatorz_owns_site_product_order(bigint) from public;
grant execute on function public.fatorz_owns_site_product_order(bigint) to authenticated;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'alter table public.profiles enable row level security';
    execute 'drop policy if exists "profiles_select_own" on public.profiles';
    execute 'drop policy if exists "profiles_select_staff" on public.profiles';
    execute 'drop policy if exists "profiles_insert_own" on public.profiles';
    execute 'drop policy if exists "profiles_update_own" on public.profiles';
    execute 'drop policy if exists "profiles_update_staff" on public.profiles';
    execute 'create policy "profiles_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()))';
    execute 'create policy "profiles_select_staff" on public.profiles for select to authenticated using (public.fatorz_is_staff())';
    execute 'create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = (select auth.uid()))';
    execute 'create policy "profiles_update_own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()))';
    execute 'create policy "profiles_update_staff" on public.profiles for update to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.site_products') is not null then
    execute 'alter table public.site_products enable row level security';
    execute 'drop policy if exists "site_products_select_active_public" on public.site_products';
    execute 'drop policy if exists "site_products_select_staff" on public.site_products';
    execute 'drop policy if exists "site_products_manage_staff" on public.site_products';
    execute 'create policy "site_products_select_active_public" on public.site_products for select to anon, authenticated using (is_active is true)';
    execute 'create policy "site_products_select_staff" on public.site_products for select to authenticated using (public.fatorz_is_staff())';
    execute 'create policy "site_products_manage_staff" on public.site_products for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.site_product_orders') is not null then
    execute 'alter table public.site_product_orders enable row level security';
    execute 'drop policy if exists "site_product_orders_select_own" on public.site_product_orders';
    execute 'drop policy if exists "site_product_orders_select_staff" on public.site_product_orders';
    execute 'drop policy if exists "site_product_orders_manage_staff" on public.site_product_orders';
    execute 'create policy "site_product_orders_select_own" on public.site_product_orders for select to authenticated using (user_id = (select auth.uid()))';
    execute 'create policy "site_product_orders_select_staff" on public.site_product_orders for select to authenticated using (public.fatorz_is_staff())';
    execute 'create policy "site_product_orders_manage_staff" on public.site_product_orders for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.course_purchases') is not null then
    execute 'alter table public.course_purchases enable row level security';
    execute 'drop policy if exists "course_purchases_select_own" on public.course_purchases';
    execute 'drop policy if exists "course_purchases_select_staff" on public.course_purchases';
    execute 'drop policy if exists "course_purchases_manage_staff" on public.course_purchases';
    execute 'create policy "course_purchases_select_own" on public.course_purchases for select to authenticated using (user_id = (select auth.uid()))';
    execute 'create policy "course_purchases_select_staff" on public.course_purchases for select to authenticated using (public.fatorz_is_staff())';
    execute 'create policy "course_purchases_manage_staff" on public.course_purchases for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.courses') is not null then
    execute 'alter table public.courses enable row level security';
    execute 'drop policy if exists "courses_select_active_public" on public.courses';
    execute 'drop policy if exists "courses_select_staff" on public.courses';
    execute 'drop policy if exists "courses_manage_staff" on public.courses';
    execute 'create policy "courses_select_active_public" on public.courses for select to anon, authenticated using (is_active is true)';
    execute 'create policy "courses_select_staff" on public.courses for select to authenticated using (public.fatorz_is_staff())';
    execute 'create policy "courses_manage_staff" on public.courses for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.lessons') is not null then
    execute 'alter table public.lessons enable row level security';
    execute 'drop policy if exists "lessons_select_owned_or_staff" on public.lessons';
    execute 'drop policy if exists "lessons_manage_staff" on public.lessons';
    execute 'create policy "lessons_select_owned_or_staff" on public.lessons for select to authenticated using (public.fatorz_is_staff() or public.fatorz_has_course_access(course_id::bigint))';
    execute 'create policy "lessons_manage_staff" on public.lessons for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.lesson_progress') is not null then
    execute 'alter table public.lesson_progress enable row level security';
    execute 'drop policy if exists "lesson_progress_select_own_or_staff" on public.lesson_progress';
    execute 'drop policy if exists "lesson_progress_insert_own" on public.lesson_progress';
    execute 'drop policy if exists "lesson_progress_update_own" on public.lesson_progress';
    execute 'drop policy if exists "lesson_progress_manage_staff" on public.lesson_progress';
    execute 'create policy "lesson_progress_select_own_or_staff" on public.lesson_progress for select to authenticated using (user_id = (select auth.uid()) or public.fatorz_is_staff())';
    execute 'create policy "lesson_progress_insert_own" on public.lesson_progress for insert to authenticated with check (user_id = (select auth.uid()))';
    execute 'create policy "lesson_progress_update_own" on public.lesson_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))';
    execute 'create policy "lesson_progress_manage_staff" on public.lesson_progress for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.service_briefings') is not null then
    execute 'alter table public.service_briefings enable row level security';
    execute 'drop policy if exists "service_briefings_select_own_or_staff" on public.service_briefings';
    execute 'drop policy if exists "service_briefings_insert_own" on public.service_briefings';
    execute 'drop policy if exists "service_briefings_update_own" on public.service_briefings';
    execute 'drop policy if exists "service_briefings_manage_staff" on public.service_briefings';
    execute 'create policy "service_briefings_select_own_or_staff" on public.service_briefings for select to authenticated using (public.fatorz_is_staff() or user_id = (select auth.uid()) or public.fatorz_owns_site_product_order(order_id::bigint))';
    execute 'create policy "service_briefings_insert_own" on public.service_briefings for insert to authenticated with check (user_id = (select auth.uid()) or public.fatorz_owns_site_product_order(order_id::bigint))';
    execute 'create policy "service_briefings_update_own" on public.service_briefings for update to authenticated using (user_id = (select auth.uid()) or public.fatorz_owns_site_product_order(order_id::bigint)) with check (user_id = (select auth.uid()) or public.fatorz_owns_site_product_order(order_id::bigint))';
    execute 'create policy "service_briefings_manage_staff" on public.service_briefings for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
declare
  has_user_id boolean;
  has_client_email boolean;
begin
  if to_regclass('public.projects') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'projects' and column_name = 'user_id'
    ) into has_user_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'projects' and column_name = 'client_email'
    ) into has_client_email;

    execute 'alter table public.projects enable row level security';
    execute 'drop policy if exists "projects_select_owner_or_staff" on public.projects';
    execute 'drop policy if exists "projects_manage_staff" on public.projects';

    if has_user_id then
      execute 'create policy "projects_select_owner_or_staff" on public.projects for select to authenticated using (public.fatorz_is_staff() or user_id = (select auth.uid()))';
    elsif has_client_email then
      execute 'create policy "projects_select_owner_or_staff" on public.projects for select to authenticated using (public.fatorz_is_staff() or lower(coalesce(client_email, '''')) = lower(coalesce(auth.jwt()->>''email'', '''')))';
    else
      execute 'create policy "projects_select_owner_or_staff" on public.projects for select to authenticated using (public.fatorz_is_staff())';
    end if;

    execute 'create policy "projects_manage_staff" on public.projects for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.academy_links') is not null then
    execute 'alter table public.academy_links enable row level security';
    execute 'drop policy if exists "academy_links_select_authenticated_active" on public.academy_links';
    execute 'drop policy if exists "academy_links_select_staff" on public.academy_links';
    execute 'drop policy if exists "academy_links_manage_staff" on public.academy_links';
    execute 'create policy "academy_links_select_authenticated_active" on public.academy_links for select to authenticated using (is_active is true)';
    execute 'create policy "academy_links_select_staff" on public.academy_links for select to authenticated using (public.fatorz_is_staff())';
    execute 'create policy "academy_links_manage_staff" on public.academy_links for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.ai_usage') is not null then
    execute 'alter table public.ai_usage enable row level security';
    execute 'drop policy if exists "ai_usage_select_own_or_staff" on public.ai_usage';
    execute 'create policy "ai_usage_select_own_or_staff" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()) or public.fatorz_is_staff())';
  end if;
end $$;

do $$
declare
  has_user_id boolean;
  has_customer_email boolean;
begin
  if to_regclass('public.orders') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'orders' and column_name = 'user_id'
    ) into has_user_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'orders' and column_name = 'customer_email'
    ) into has_customer_email;

    execute 'alter table public.orders enable row level security';
    execute 'drop policy if exists "orders_select_owner_or_staff" on public.orders';
    execute 'drop policy if exists "orders_manage_staff" on public.orders';

    if has_user_id then
      execute 'create policy "orders_select_owner_or_staff" on public.orders for select to authenticated using (public.fatorz_is_staff() or user_id = (select auth.uid()))';
    elsif has_customer_email then
      execute 'create policy "orders_select_owner_or_staff" on public.orders for select to authenticated using (public.fatorz_is_staff() or lower(coalesce(customer_email, '''')) = lower(coalesce(auth.jwt()->>''email'', '''')))';
    else
      execute 'create policy "orders_select_owner_or_staff" on public.orders for select to authenticated using (public.fatorz_is_staff())';
    end if;

    execute 'create policy "orders_manage_staff" on public.orders for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.payments') is not null then
    execute 'alter table public.payments enable row level security';
    execute 'drop policy if exists "payments_staff_only" on public.payments';
    execute 'create policy "payments_staff_only" on public.payments for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;

  if to_regclass('public.clients') is not null then
    execute 'alter table public.clients enable row level security';
    execute 'drop policy if exists "clients_staff_only" on public.clients';
    execute 'create policy "clients_staff_only" on public.clients for all to authenticated using (public.fatorz_is_staff()) with check (public.fatorz_is_staff())';
  end if;
end $$;
