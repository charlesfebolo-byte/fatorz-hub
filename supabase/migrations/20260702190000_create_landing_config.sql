-- FatorZ landing editor config
create table if not exists public.landing_config (
  id text primary key default 'default',
  hero_eyebrow text,
  hero_title text,
  hero_highlight text,
  hero_subtitle text,
  primary_cta_label text,
  secondary_cta_label text,
  diagnostic_title text,
  diagnostic_subtitle text,
  diagnostic_cta_label text,
  proof_stats jsonb default '[]'::jsonb,
  problem_cards jsonb default '[]'::jsonb,
  pillars jsonb default '[]'::jsonb,
  process_steps jsonb default '[]'::jsonb,
  result_case jsonb default '{}'::jsonb,
  seo_title text,
  seo_description text,
  contact_whatsapp text,
  contact_instagram text,
  contact_facebook text,
  updated_at timestamptz default now()
);

insert into public.landing_config (
  id,
  hero_eyebrow,
  hero_title,
  hero_highlight,
  hero_subtitle,
  primary_cta_label,
  secondary_cta_label,
  diagnostic_title,
  diagnostic_subtitle,
  diagnostic_cta_label,
  contact_whatsapp,
  contact_instagram,
  contact_facebook
) values (
  'default',
  'Percepcao · Presenca · Direcao',
  'Sua marca nao precisa so aparecer. Precisa ser',
  'impossivel de ignorar.',
  'Posicionamento, conteudo estrategico e direcao constante para transformar presenca digital em autoridade e vendas reais.',
  'Agendar Diagnostico',
  'Falar no WhatsApp',
  'Diagnostico de Perfil',
  'A porta de entrada da FatorZ: descubra o que trava seu perfil antes de investir em conteudo, site ou gestao.',
  'Comecar pelo Diagnostico',
  '5553991456249',
  'https://www.instagram.com/fatorzhouse/',
  'https://www.facebook.com/FatorZHouse'
) on conflict (id) do nothing;

create or replace function public.set_landing_config_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_landing_config_updated_at on public.landing_config;
create trigger trg_landing_config_updated_at
before update on public.landing_config
for each row execute function public.set_landing_config_updated_at();

alter table public.landing_config enable row level security;

grant select on public.landing_config to anon, authenticated;
grant insert, update, delete on public.landing_config to authenticated;

drop policy if exists "landing_config_public_select" on public.landing_config;
create policy "landing_config_public_select"
on public.landing_config
for select
to anon, authenticated
using (true);

drop policy if exists "landing_config_staff_insert" on public.landing_config;
create policy "landing_config_staff_insert"
on public.landing_config
for insert
to authenticated
with check ((select public.is_admin()) = true);

drop policy if exists "landing_config_staff_update" on public.landing_config;
create policy "landing_config_staff_update"
on public.landing_config
for update
to authenticated
using ((select public.is_admin()) = true)
with check ((select public.is_admin()) = true);

drop policy if exists "landing_config_staff_delete" on public.landing_config;
create policy "landing_config_staff_delete"
on public.landing_config
for delete
to authenticated
using ((select public.is_admin()) = true);
