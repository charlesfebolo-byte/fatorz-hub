-- Protect public.profiles against privilege escalation from normal users.
-- This migration does not enable RLS or change existing policies.
-- It only blocks non-admin authenticated users from changing permission,
-- role, billing/status, and internal access fields on profiles.

create or replace function public.protect_profiles_privilege_escalation()
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
    'is_admin',
    'admin',
    'is_staff',
    'staff',
    'permissions',
    'permission',
    'claims',
    'access_level',
    'account_type',
    'account_status',
    'status',
    'approved',
    'blocked',
    'banned',
    'suspended',
    'academy_expires_at',
    'access_until',
    'expires_at',
    'subscription_expires_at',
    'subscription_status',
    'billing_status',
    'plan',
    'tier',
    'stripe_customer_id',
    'appmax_customer_id',
    'internal_notes'
  ];
  safe_insert_values jsonb := jsonb_build_object(
    'role', jsonb_build_array('user'),
    'staff_role', jsonb_build_array('none'),
    'customer_tag', jsonb_build_array('free'),
    'total_spent', jsonb_build_array('0', '0.0'),
    'is_admin', jsonb_build_array('false'),
    'admin', jsonb_build_array('false'),
    'is_staff', jsonb_build_array('false'),
    'staff', jsonb_build_array('false')
  );
  field_name text;
  old_profile jsonb;
  new_profile jsonb;
  actor_id uuid := auth.uid();
  actor_is_admin boolean := false;
  admin_staff_roles text[] := array[
    'ceo_fatorz',
    'diretor_operacional',
    'financeiro',
    'CEO FatorZ',
    'Diretor Operacional',
    'Financeiro'
  ];
  new_value text;
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

  new_profile := to_jsonb(new);

  if tg_op = 'UPDATE' then
    old_profile := to_jsonb(old);

    foreach field_name in array protected_fields loop
      if (old_profile ? field_name or new_profile ? field_name)
        and (old_profile -> field_name) is distinct from (new_profile -> field_name)
      then
        raise exception
          'Protected profiles field cannot be changed by a normal user: %',
          field_name
          using errcode = '42501';
      end if;
    end loop;

    return new;
  end if;

  if tg_op = 'INSERT' and auth.role() = 'authenticated' then
    foreach field_name in array protected_fields loop
      if new_profile ? field_name then
        new_value := nullif(new_profile ->> field_name, '');

        if new_value is not null
          and not (
            safe_insert_values ? field_name
            and (safe_insert_values -> field_name) ? new_value
          )
        then
          raise exception
            'Protected profiles field cannot be set by a normal user: %',
            field_name
            using errcode = '42501';
        end if;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profiles_privilege_escalation on public.profiles;

create trigger protect_profiles_privilege_escalation
before insert or update on public.profiles
for each row
execute function public.protect_profiles_privilege_escalation();

comment on function public.protect_profiles_privilege_escalation()
is 'Blocks normal authenticated users from setting or changing sensitive permission/status fields in profiles.';
