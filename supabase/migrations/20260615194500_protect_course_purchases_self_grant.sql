-- Protect public.course_purchases against self-granted course access.
-- This migration does not enable RLS or change existing policies.
-- It blocks normal authenticated users from inserting course purchases or
-- changing access/payment fields that release Academy content.

create or replace function public.protect_course_purchases_self_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protected_fields text[] := array[
    'status',
    'approved_at',
    'access_type',
    'course_id',
    'user_id',
    'user_email',
    'amount_cents',
    'payment_provider',
    'payment_method',
    'appmax_order_id',
    'appmax_payment_id',
    'payment_id',
    'raw_payment_response',
    'notes'
  ];
  admin_staff_roles text[] := array[
    'ceo_fatorz',
    'diretor_operacional',
    'financeiro',
    'CEO FatorZ',
    'Diretor Operacional',
    'Financeiro'
  ];
  field_name text;
  old_purchase jsonb;
  new_purchase jsonb;
  actor_id uuid := auth.uid();
  actor_is_admin boolean := false;
begin
  if auth.role() is null or auth.role() = 'service_role' then
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
    into actor_is_admin;
  end if;

  if actor_is_admin then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception
      'Course purchases cannot be created by a normal user.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    old_purchase := to_jsonb(old);
    new_purchase := to_jsonb(new);

    foreach field_name in array protected_fields loop
      if (old_purchase ? field_name or new_purchase ? field_name)
        and (old_purchase -> field_name) is distinct from (new_purchase -> field_name)
      then
        raise exception
          'Protected course_purchases field cannot be changed by a normal user: %',
          field_name
          using errcode = '42501';
      end if;
    end loop;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_course_purchases_self_grant on public.course_purchases;

create trigger protect_course_purchases_self_grant
before insert or update on public.course_purchases
for each row
execute function public.protect_course_purchases_self_grant();

comment on function public.protect_course_purchases_self_grant()
is 'Blocks normal authenticated users from inserting course purchases or changing Academy access/payment fields.';
