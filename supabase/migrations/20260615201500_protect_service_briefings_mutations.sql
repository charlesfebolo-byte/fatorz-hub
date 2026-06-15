-- Protect public.service_briefings against direct mutation by normal users.
-- This migration does not enable RLS and does not change read access.
-- It allows customers to create/update only their own briefing answers while
-- keeping internal/order fields controlled by the database or authorized staff.

create or replace function public.protect_service_briefings_mutations()
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
  customer_editable_fields text[] := array[
    'brand_name',
    'instagram',
    'whatsapp',
    'website',
    'city',
    'main_objective',
    'offer_description',
    'target_audience',
    'colors',
    'avoid_colors',
    'visual_style',
    'references_like',
    'references_dislike',
    'logo_link',
    'material_links',
    'copy_notes',
    'extra_notes',
    'updated_at'
  ];
  field_name text;
  actor_id uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  actor_can_mutate boolean := false;
  related_order public.site_product_orders%rowtype;
  old_briefing jsonb;
  new_briefing jsonb;
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

  if tg_op = 'DELETE' then
    raise exception
      'service_briefings cannot be deleted by a normal user.'
      using errcode = '42501';
  end if;

  if actor_id is null and actor_email = '' then
    raise exception
      'service_briefings can only be changed by an authenticated customer.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.order_id is distinct from old.order_id then
    raise exception
      'service_briefings.order_id cannot be changed by a normal user.'
      using errcode = '42501';
  end if;

  select *
  into related_order
  from public.site_product_orders orders
  where orders.id = case
    when tg_op = 'UPDATE' then old.order_id
    else new.order_id
  end
  limit 1;

  if not found then
    raise exception
      'service_briefings.order_id must reference an existing site_product_orders row.'
      using errcode = '23503';
  end if;

  if not (
    (actor_id is not null and related_order.user_id = actor_id)
    or (
      actor_email <> ''
      and lower(coalesce(related_order.user_email, '')) = actor_email
    )
  ) then
    raise exception
      'service_briefings can only be changed by the customer who owns the order.'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.project_id := related_order.project_id;
    new.user_id := coalesce(related_order.user_id, actor_id);
    new.user_email := coalesce(nullif(related_order.user_email, ''), actor_email);
    new.customer_name := related_order.customer_name;
    new.product_name := related_order.product_name;
    new.product_category := related_order.product_category;
    new.product_type := related_order.product_type;
    new.status := 'submitted';
    new.created_at := now();
    new.updated_at := now();

    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.order_id := old.order_id;
    new.project_id := old.project_id;
    new.user_id := old.user_id;
    new.user_email := old.user_email;
    new.customer_name := old.customer_name;
    new.product_name := old.product_name;
    new.product_category := old.product_category;
    new.product_type := old.product_type;
    new.status := old.status;
    new.created_at := old.created_at;

    old_briefing := to_jsonb(old);
    new_briefing := to_jsonb(new);

    for field_name in
      select jsonb_object_keys(new_briefing)
    loop
      if (old_briefing -> field_name) is distinct from (new_briefing -> field_name)
        and not (field_name = any(customer_editable_fields))
      then
        raise exception
          'service_briefings field cannot be changed by a normal user: %',
          field_name
          using errcode = '42501';
      end if;
    end loop;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_service_briefings_mutations on public.service_briefings;

create trigger protect_service_briefings_mutations
before insert or update or delete on public.service_briefings
for each row
execute function public.protect_service_briefings_mutations();

comment on function public.protect_service_briefings_mutations()
is 'Protects service_briefings mutations: customers can edit only their own briefing answers, while service_role and authorized staff can manage all fields.';
