# Schema Gap Analysis - FatorZ Hub

Data: 2026-07-01

## Escopo e fontes

Projeto Supabase oficial da FatorZ: `ezfpxvezwpjtokbzsidu` (`https://ezfpxvezwpjtokbzsidu.supabase.co`).

Nao usar como FatorZ:

- `jfnyfgcxnucgaqswlknw`
- `melgfvqsjsfuzyyxptes`

Este diagnostico foi feito sem aplicar SQL e sem consultar/alterar producao. Fontes usadas:

- Codigo em `src/`, `api/` e `supabase/functions/`.
- Migrations versionadas em `supabase/migrations/`.
- Estado remoto informado na tarefa: `mp_links`, `profiles`, `lessons`, `news`, `orders`.
- Docs ja existentes: `docs/RLS_SECURITY_AUDIT.md` e `docs/PROJECT_FULL_ANALYSIS.md`.

EngajaPro esta fora do escopo.

## Status pos-aplicacao

Aplicacao manual concluida no SQL Editor do Supabase oficial da FatorZ (`ezfpxvezwpjtokbzsidu`, `https://ezfpxvezwpjtokbzsidu.supabase.co`):

- Schema base incremental `supabase/migrations/20260701150000_base_schema_incremental.sql`: aplicado com sucesso.
- Patch `user_id`: aplicado com sucesso.
- RLS companion `supabase/migrations/20260701152000_secure_rls_schema_base.sql`: aplicada com sucesso.
- Nenhum SQL deve ser reaplicado sem nova aprovacao explicita.

## Resumo executivo

O codigo atual espera 16 tabelas de aplicacao no schema `public`, 2 buckets de Storage e 1 RPC (`is_admin`). As migrations versionadas antes desta analise nao criam a base das tabelas; elas apenas adicionam protecoes/triggers, adicionam token a `site_product_orders` e preparam RLS na migration `20260701151000_secure_rls_academy_checkout.sql`, que nao deve ser aplicada ainda.

Pelo estado remoto informado, existem apenas `profiles`, `lessons` e `orders` dentre as tabelas esperadas pelo app. As tabelas `mp_links` e `news` existem no Supabase informado, mas nao foram encontradas como dependencia do codigo atual do FatorZ Hub.

Migration base proposta: `supabase/migrations/20260701150000_base_schema_incremental.sql`.

Ela cria tabelas/colunas faltantes com `create table if not exists` e `alter table ... add column if not exists`, sem policies RLS. A criacao/garantia dos buckets publicos `academy` e `product-covers` ficou na migration RLS companheira, porque exige `insert into storage.buckets` e a migration base foi limitada a operacoes estruturais incrementais.

Confirmacao posterior usada nesta revisao:

- Tabelas public existentes no Supabase FatorZ: `mp_links`, `profiles`, `lessons`, `news`, `orders`.
- `profiles`, `lessons` e `orders` ja existem, mas com schema antigo/incompleto.
- `lessons.id` e `orders.id` existentes sao `uuid`; a migration base nao tenta transformar esses IDs.
- `lessons` atual tem `title`, `description`, `video_url`, `thumbnail`, `chapter`, `order_index`; a base apenas adiciona `course_id`, `module_title` e `lesson_title`, mantendo colunas antigas.

## Tabelas e colunas esperadas

| Tabela | Existe no codigo? | Existe em migration? | Precisa existir no Supabase? | Colunas esperadas derivadas do codigo | Dependencias | Risco se faltar |
| --- | --- | --- | --- | --- | --- | --- |
| `profiles` | Sim | Sim, mas so triggers/RLS; base nao existia | Sim. Ja existe no remoto informado, mas faltam colunas a confirmar | `id`, `created_at`, `updated_at`, `email`, `nome`, `whatsapp`, `instagram`, `role`, `customer_tag`, `staff_role`, `total_spent`, `academy_expires_at` | `App.tsx`, `Settings.tsx`, `AdminUsers.tsx`, `AdminSubscriptions.tsx`, Edge Function `fatorz-ai-assistant`, migrations de protecao | Login carrega perfil incompleto, admin/staff pode falhar, triggers/RLS dependem de `role` e `staff_role` |
| `site_products` | Sim | So RLS futura em `20260701151000` | Sim | `id`, `created_at`, `updated_at`, `name`, `slug`, `subtitle`, `description`, `category`, `product_type`, `price_cents`, `old_price_cents`, `is_active`, `is_featured`, `order_index`, `image_url`, `badge`, `checkout_provider`, `external_payment_url`, `accepts_pix`, `accepts_boleto`, `accepts_card`, `appmax_sku`, `appmax_product_name`, `course_id`, `notes` | Landing, Services, ServicePage, ProductCheckout, CheckoutAcademy, AdminProducts, APIs `create-product-payment`, `get-order-summary`, `appmax-webhook` | Loja, checkout e produtos Academy quebram |
| `site_product_orders` | Sim | `20260616090000` adiciona token; triggers/RLS futuras assumem existencia | Sim | `id`, `created_at`, `updated_at`, `user_id`, `user_email`, `customer_name`, `customer_phone`, `customer_document`, `product_id`, `product_slug`, `product_name`, `product_category`, `product_type`, `amount_cents`, `status`, `payment_provider`, `payment_method`, `appmax_customer_id`, `appmax_order_id`, `appmax_payment_id`, `payment_id`, `pix_qr_code`, `pix_copy_paste`, `boleto_url`, `boleto_barcode`, `boleto_digitable_line`, `boleto_expiration_date`, `raw_payment_response`, `project_id`, `notes`, `order_access_token_hash`, `order_access_token_created_at` | Product checkout, ThankYou/order summary API, BriefingForm, MyDeliveries, AdminOrders, Projects, Dashboard, webhooks | Pagamentos podem ser criados no Appmax mas nao persistidos; pos-compra e briefing quebram |
| `course_purchases` | Sim | Triggers/RLS futuras assumem existencia | Sim | `id`, `created_at`, `user_id`, `user_email`, `course_id`, `course_title`, `payment_id`, `payment_url`, `status`, `access_type`, `approved_at`, `notes`, `payment_provider`, `payment_method`, `amount_cents`, `appmax_customer_id`, `appmax_order_id`, `appmax_payment_id`, `pix_qr_code`, `pix_copy_paste`, `raw_payment_response` | Academy, CheckoutAcademy, AdminSubscriptions, AdminCourses, AdminUsers, APIs de checkout/webhook, Edge Function | Academy nao libera acesso e webhook nao sincroniza compras |
| `courses` | Sim | So RLS futura | Sim | `id`, `created_at`, `title`, `subtitle`, `description`, `cover_url`, `badge`, `order_index`, `is_active`, `price_cents`, `payment_url`, `is_paid` | Academy, AdminCourses, AdminLessons, AdminProducts, CheckoutAcademy, APIs | Academy sem cursos; produtos Academy nao vinculam curso |
| `lessons` | Sim | So triggers/RLS futuras; existe no remoto informado | Sim | `id uuid`, `created_at`, `course_id`, `module_title`, `lesson_title`, `description`, `video_url`, `order_index` | Academy, AdminLessons, AdminCourses | Aulas nao carregam; risco especial em `video_url` sem RLS |
| `lesson_progress` | Sim | So RLS futura | Sim | `id`, `created_at`, `user_id`, `lesson_id uuid`, `completed`, `watched_at` | Academy | Progresso de aulas nao salva |
| `service_briefings` | Sim | Trigger/RLS futuras assumem existencia | Sim | `id`, `created_at`, `updated_at`, `order_id`, `project_id`, `user_id`, `user_email`, `customer_name`, `product_name`, `product_category`, `product_type`, `brand_name`, `instagram`, `whatsapp`, `website`, `city`, `main_objective`, `offer_description`, `target_audience`, `colors`, `avoid_colors`, `visual_style`, `references_like`, `references_dislike`, `logo_link`, `material_links`, `copy_notes`, `extra_notes`, `status` | BriefingForm, AdminOrders, MyDeliveries | Clientes nao enviam briefing; projetos de servico ficam sem insumos |
| `projects` | Sim | So RLS futura | Sim | `id`, `created_at`, `title`, `client_name`, `client_email`, `service_type`, `status`, `deadline`, `amount`, `delivery_link`, `notes`, `user_id` | Projects, MyDeliveries, AdminOrders, Dashboard | Entregas e status de pedidos nao acompanham producao |
| `academy_links` | Sim | So RLS futura | Sim | `id`, `created_at`, `title`, `description`, `url`, `category`, `order_index`, `is_active` | Academy, AdminLinks | Links internos da Academy nao aparecem |
| `ai_usage` | Sim | So RLS futura | Sim | `id`, `created_at`, `user_id`, `usage_date`, `count`, `updated_at` | Edge Function `fatorz-ai-assistant` | Limite diario do assistente nao funciona |
| `orders` | Sim | So RLS futura; existe no remoto informado | Sim, legado/manual | `id uuid`, `created_at`, `user_id`, `customer_email`, `customer_name`, `customer_whatsapp`, `product_id`, `product_name`, `product_category`, `product_price`, `payment_link`, `status`, `payment_id`, `project_id`, `notes` | AdminOrders, Projects, Dashboard, useClientes, AdminProducts | Pedidos legados e dashboard podem quebrar ou ficar parciais |
| `payments` | Sim | So RLS futura | Sim, legado/manual | `id`, `created_at`, `client_name`, `product_name`, `amount`, `status`, `payment_method`, `notes` | Finance, useFinanceiro, Dashboard, AdminProducts | Lancamentos financeiros manuais nao funcionam |
| `clients` | Sim | So RLS futura | Sim | `id`, `created_at`, `name`, `service`, `status`, `instagram`, `whatsapp`, `email`, `notes`, `monthly_value`, `plan`, `started_at` | Clients, useClientes, Dashboard | Cadastro manual de clientes quebra |
| `mural_posts` | Sim | Nao | Sim | `id`, `author_id`, `title`, `content`, `category`, `status`, `pinned`, `created_at`, `updated_at` | Mural | Mural nao carrega/publica |
| `mural_reactions` | Sim | Nao | Sim | `id`, `post_id`, `user_id`, `emoji`, `created_at` | Mural | Reacoes do mural nao funcionam; precisa unique em `(post_id,user_id)` por causa do `upsert` |

## Buckets esperados

| Bucket | Existe no codigo? | Existe em migration? | Precisa existir? | Uso | Risco |
| --- | --- | --- | --- | --- | --- |
| `academy` | Sim | Nao | Sim | Upload de capa de curso em `AdminCourses.tsx`, `getPublicUrl` | Upload de capas falha; por usar URL publica, bucket precisa ser publico ou haver outro mecanismo de URL |
| `product-covers` | Sim | Nao | Sim | Upload de capa de produto em `AdminProducts.tsx`, `getPublicUrl` | Capas de produtos nao sobem/aparecem |

## Objetos fora de tabela

| Objeto | Existe no codigo? | Existe em migration? | Necessidade |
| --- | --- | --- | --- |
| RPC `is_admin` | Sim, `supabase.rpc("is_admin")` em `App.tsx` | Nao encontrada | Deve existir ou o app cai em fallback. Recomendo tratar na proxima migration RLS/correcao de auth, nao nesta base de tabelas |
| `mp_links` | Nao encontrado | Nao | Existe no remoto informado, mas nao e dependencia atual do FatorZ Hub |
| `news` | Nao encontrado | Nao | Existe no remoto informado, mas nao e dependencia atual do FatorZ Hub |

## Migration base proposta

Arquivo: `supabase/migrations/20260701150000_base_schema_incremental.sql`.

Ela:

- Cria/ajusta as 16 tabelas usadas pelo codigo.
- Adiciona indices/constraints necessarios para fluxos reais: `site_products.slug`, `service_briefings.order_id`, `lesson_progress(user_id, lesson_id)`, `mural_reactions(post_id,user_id)`, `ai_usage(user_id,usage_date)`, busca por ids Appmax/payment.
- Mantem `lessons.id` e `orders.id` como `uuid` quando a tabela precisar ser criada em ambiente compatível com o schema real confirmado.
- Nao cria policies RLS, nao cria buckets e nao altera a migration RLS `20260701151000`.

Operacoes usadas na base:

- `create table if not exists`
- `alter table ... add column if not exists`
- `create index if not exists`
- `create unique index if not exists`

Removido da base apos revisao:

- `create extension if not exists pgcrypto`
- `insert into storage.buckets`

## Migration RLS companheira proposta

Arquivo: `supabase/migrations/20260701152000_secure_rls_schema_base.sql`.

Ela:

- Cria/atualiza os buckets `academy` e `product-covers`.
- Cria RPCs auxiliares `fatorz_is_staff`, `is_admin`, `fatorz_has_course_access` e `fatorz_owns_site_product_order`.
- Cria trigger propria `fatorz_protect_profile_sensitive_fields` para impedir autoelevacao em `profiles` sem depender de trigger antiga nao confirmada.
- Ativa RLS e cria policies para as tabelas do Hub, incluindo `mural_posts` e `mural_reactions`.
- Cria policies de storage para leitura publica e escrita apenas por staff nos buckets `academy` e `product-covers`.
- Ativa RLS em `mp_links` sem policies publicas; decisao atual: tabela legada, vazia e sem dependencia no FatorZ Hub, portanto acesso publico deve ficar bloqueado.

## Riscos e observacoes

- Como a migration base cria novas tabelas em `public` sem RLS, nao deve ser aplicada isoladamente em producao se o schema `public` estiver exposto pela Data API. A migration RLS companheira deve estar revisada e pronta para aplicar logo depois.
- A migration RLS existente `20260701151000_secure_rls_academy_checkout.sql` foi deixada intacta, mas nao deve ser usada como a RLS principal desta base. A nova companheira e `20260701152000_secure_rls_schema_base.sql`.
- A policy `profiles_update_own` permanece para nao quebrar Settings, mas a trigger `fatorz_protect_profile_sensitive_fields` bloqueia usuario comum de alterar `role`, `staff_role`, `customer_tag`, `total_spent` e `academy_expires_at`.
- As migrations antigas de triggers (`20260615193000`, `20260615194500`, `20260615200000`, `20260615201500`) tambem assumem que as tabelas existem. Para um ambiente novo, a base precisa rodar antes delas ou as migrations precisam ser reordenadas/agrupadas num runbook manual.
- `is_admin` nao esta versionada. O app tolera erro com fallback parcial, mas admins podem nao ser reconhecidos corretamente.
- Tipos foram escolhidos pelo uso do codigo e pelo schema real confirmado, nao por modelagem ideal. Exemplo: `orders.id` e `lessons.id` respeitam `uuid`; `orders.product_id` fica `text` porque o legado tipa assim no frontend.
- Nao foi feita introspeccao remota por SQL. O status remoto usado aqui e o informado na tarefa.

## Etapa de aplicacao

Concluida manualmente no Supabase oficial da FatorZ.

1. Schema base incremental aplicado.
2. Patch `user_id` aplicado.
3. RLS companion `20260701152000_secure_rls_schema_base.sql` aplicada.
4. RLS antiga `20260701151000_secure_rls_academy_checkout.sql` permanece fora deste ciclo.
5. Proximo trabalho recomendado: validar fluxos funcionais do Hub contra o schema aplicado, sem reaplicar SQL.
