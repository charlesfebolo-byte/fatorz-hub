# Supabase Schema Runbook - FatorZ Hub

Data: 2026-07-01

Projeto alvo:

- ref: `ezfpxvezwpjtokbzsidu`
- url: `https://ezfpxvezwpjtokbzsidu.supabase.co`

Nao usar como FatorZ:

- `jfnyfgcxnucgaqswlknw`
- `melgfvqsjsfuzyyxptes`

Este runbook e preparatorio. Nao aplicar SQL sem aprovacao explicita.

## A) Backup/snapshot

1. Confirmar que o projeto aberto no Dashboard/CLI e `ezfpxvezwpjtokbzsidu`.
2. Gerar backup/snapshot do banco.
3. Exportar a lista atual de tabelas/colunas/policies para comparacao.
4. Confirmar que `src/lib/supabase.ts` aponta para o Supabase FatorZ, nao EngajaPro.

SQL diagnostico antes:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select table_name, column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'lessons',
    'orders',
    'site_products',
    'site_product_orders',
    'course_purchases',
    'courses',
    'lesson_progress',
    'service_briefings',
    'projects',
    'academy_links',
    'ai_usage',
    'payments',
    'clients',
    'mural_posts',
    'mural_reactions'
  )
order by table_name, ordinal_position;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

## B) Aplicar schema base

Aplicar somente:

```text
supabase/migrations/20260701150000_base_schema_incremental.sql
```

Nao aplicar a migration antiga:

```text
supabase/migrations/20260701151000_secure_rls_academy_checkout.sql
```

Notas:

- A base nao apaga tabelas.
- A base nao renomeia colunas antigas.
- A base nao transforma `lessons.id` nem `orders.id`; ambos seguem `uuid`.
- A base nao cria policies RLS.
- A base nao cria buckets.
- A base nao faz backfill de dados antigos de `lessons.title`/`lessons.chapter` para `lessons.lesson_title`/`lessons.module_title`; isso precisa de plano proprio de compatibilidade antes de depender das aulas antigas na UI nova.

## C) Verificar tabelas/colunas

SQL de verificacao:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'site_products',
    'site_product_orders',
    'course_purchases',
    'courses',
    'lessons',
    'lesson_progress',
    'service_briefings',
    'projects',
    'academy_links',
    'ai_usage',
    'orders',
    'payments',
    'clients',
    'mural_posts',
    'mural_reactions'
  )
order by table_name;

select table_name, column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'lessons' and column_name in ('id', 'course_id', 'module_title', 'lesson_title', 'description', 'video_url', 'order_index'))
    or (table_name = 'orders' and column_name in ('id', 'user_id', 'customer_email', 'customer_name', 'project_id'))
    or (table_name = 'lesson_progress' and column_name in ('id', 'user_id', 'lesson_id', 'completed', 'watched_at'))
    or (table_name = 'profiles' and column_name in ('id', 'role', 'staff_role', 'customer_tag', 'total_spent'))
  )
order by table_name, column_name;

select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'site_products_slug_key',
    'lesson_progress_user_lesson_key',
    'service_briefings_order_id_key',
    'mural_reactions_post_user_key',
    'ai_usage_user_date_key'
  )
order by tablename, indexname;
```

Esperado importante:

- `lessons.id` = `uuid`
- `orders.id` = `uuid`
- `lesson_progress.lesson_id` = `uuid`
- `profiles.id` = `uuid`

## D) Aplicar RLS

Aplicar somente depois da verificacao da base:

```text
supabase/migrations/20260701152000_secure_rls_schema_base.sql
```

Esta migration:

- Ativa RLS nas tabelas do Hub.
- Cria RPC `is_admin`.
- Cria trigger `fatorz_protect_profile_sensitive_fields` para impedir usuario comum de alterar `role`, `staff_role`, `customer_tag`, `total_spent` e `academy_expires_at`, mantendo `Settings.tsx` livre para atualizar dados de contato.
- Cria policies para `mural_posts`, `mural_reactions`.
- Cria/garante buckets `academy` e `product-covers`.
- Cria policies em `storage.objects` para leitura publica e escrita por staff.
- Ativa RLS em `mp_links` de forma condicional e sem policies publicas, porque a tabela esta vazia e nao e usada pelo FatorZ Hub.

## E) Verificar policies

SQL de verificacao:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'site_products',
    'site_product_orders',
    'course_purchases',
    'courses',
    'lessons',
    'lesson_progress',
    'service_briefings',
    'projects',
    'academy_links',
    'ai_usage',
    'orders',
    'payments',
    'clients',
    'mural_posts',
    'mural_reactions',
    'mp_links'
  )
order by tablename;

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname in ('public', 'storage')
  and (
    tablename in (
      'profiles',
      'site_products',
      'site_product_orders',
      'course_purchases',
      'courses',
      'lessons',
      'lesson_progress',
      'service_briefings',
      'projects',
      'academy_links',
      'ai_usage',
      'orders',
      'payments',
      'clients',
      'mural_posts',
      'mural_reactions'
    )
    or (schemaname = 'storage' and tablename = 'objects')
  )
order by schemaname, tablename, policyname;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'fatorz_is_staff',
    'is_admin',
    'fatorz_has_course_access',
    'fatorz_owns_site_product_order',
    'fatorz_protect_profile_sensitive_fields'
  )
order by routine_name;

select tgname
from pg_trigger
where tgrelid = 'public.profiles'::regclass
  and tgname = 'fatorz_protect_profile_sensitive_fields'
  and not tgisinternal;

select id, name, public
from storage.buckets
where id in ('academy', 'product-covers')
order by id;
```

## F) Testar fluxos

Testes manuais obrigatorios depois de base + RLS:

1. Login de usuario comum.
2. Login de admin/staff e chamada `is_admin`.
3. Usuario comum atualiza nome/WhatsApp/Instagram em Settings.
4. Usuario comum nao consegue alterar `role`, `staff_role`, `customer_tag`, `total_spent` ou `academy_expires_at`.
5. Listagem publica de produtos ativos na Landing/Services.
6. Checkout de produto nao Academy via API server-side.
7. Checkout Academy autenticado e sincronizacao em `course_purchases`.
8. Academy: listar cursos, abrir aulas compradas e salvar progresso.
9. Briefing: cliente abre pedido proprio, envia ficha e staff visualiza.
10. Admin Products: upload em `product-covers`.
11. Admin Courses: upload em `academy`.
12. Mural: admin publica; usuario autenticado reage; usuario comum nao publica.

Comandos locais apos qualquer alteracao de migration:

```powershell
npm.cmd run build
npm.cmd run lint
```

`lint` e diagnostico: hoje falha por debitos existentes e nao faz parte desta correcao.
