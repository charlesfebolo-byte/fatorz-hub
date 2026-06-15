-- Protect public.site_product_orders against direct mutation by normal users.
-- This migration does not enable RLS and does not change read access.
-- It only blocks INSERT, UPDATE, and DELETE from non-authorized authenticated users.

create or replace function public.protect_site_product_orders_mutations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_staff_roles text[] := array[
    'CEO FatorZ',
    'Diretor Operacional',
    'Gestor de Entregas',
    'Suporte FatorZ',
    'Financeiro',
    'ceo_fatorz',
    'diretor_operacional',
    'gestor_entregas',
    'suporte_fatorz',
    'financeiro'
  ];
  actor_id uuid := auth.uid();
  actor_can_mutate boolean := false;
begin
  if auth.role() is null or auth.role() = 'service_role' then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  if actor_id is not null then
    select exists (
      select 1
      from public.profiles actor
      where actor.id = actor_id
        and (
          actor.role = 'admin'
          or actor.staff_role = any(admin_staff_roles)
        )
    )
    into actor_can_mutate;
  end if;

  if actor_can_mutate then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  raise exception
    'site_product_orders cannot be inserted, updated, or deleted by a normal user.'
    using errcode = '42501';
end;
$$;

drop trigger if exists protect_site_product_orders_mutations on public.site_product_orders;

create trigger protect_site_product_orders_mutations
before insert or update or delete on public.site_product_orders
for each row
execute function public.protect_site_product_orders_mutations();

comment on function public.protect_site_product_orders_mutations()
is 'Blocks normal users from inserting, updating, or deleting site_product_orders while allowing service_role and authorized staff.';
