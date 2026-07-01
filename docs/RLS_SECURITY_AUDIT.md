# RLS Security Audit - FatorZ Hub

Data: 2026-07-01

## Escopo desta correcao

Esta correcao cobre a primeira camada real de seguranca Supabase/RLS do FatorZ Hub:

- Habilitar RLS por migration nas tabelas expostas do schema `public`.
- Proteger `lessons.video_url` para que somente usuarios com compra aprovada do curso, ou equipe FatorZ, possam ler aulas.
- Impedir compra de produtos Academy/curso sem usuario autenticado.
- Preservar compra publica para produtos que nao sejam Academy/curso.
- Manter o escopo pequeno, sem refatorar layout, UX global, lint legado ou arquitetura fora do necessario.

## Limitacao de introspeccao

Nao foi possivel consultar o estado remoto do Supabase neste ambiente. A CLI local falhou antes de executar qualquer comando util:

```text
npx.cmd supabase --version
Bun v1.3.13 ... no_avx2 no_avx
panic: Illegal instruction
```

Tambem nao ha `supabase` global instalado. Por isso, a migration foi criada manualmente em vez de `supabase migration new`. A conclusao "antes" abaixo se baseia no estado versionado do repositorio: existiam triggers de protecao, mas nao uma migration que habilitasse RLS e definisse policies para as tabelas do Hub.

## Diagnostico antes da correcao

Como nao houve introspeccao remota, o status "RLS/policies antes" abaixo significa: nao havia RLS/policies versionadas no repositorio para garantir este comportamento. Se o banco remoto tiver policies manuais, elas nao estavam rastreadas pelo codigo.

| Tabela | RLS antes no repo | Policies antes no repo | SELECT antes garantido | INSERT antes garantido | UPDATE antes garantido | DELETE antes garantido |
| --- | --- | --- | --- | --- | --- | --- |
| `profiles` | Nao versionado | Trigger anti-escalada, sem policies RLS | Nao garantido por migration | Nao garantido por migration | Trigger bloqueava campos sensiveis para usuario comum | Nao garantido por migration |
| `site_products` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `site_product_orders` | Nao versionado | Trigger anti-mutacao critica, sem policies RLS | Nao garantido por migration | Trigger bloqueava usuario comum em mutacoes diretas | Trigger bloqueava status/valor/Appmax/payment ids | Trigger bloqueava usuario comum |
| `course_purchases` | Nao versionado | Trigger anti-auto-grant, sem policies RLS | Nao garantido por migration | Trigger bloqueava auto-concessao comum | Trigger bloqueava status/acesso aprovado por usuario comum | Nao garantido por migration |
| `courses` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `lessons` | Nao versionado | Sem policies RLS | Nao garantido; `Academy.tsx` buscava `select("*")` | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `lesson_progress` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `service_briefings` | Nao versionado | Trigger protegia campos internos, sem policies RLS | Nao garantido por migration | Trigger validava campos de cliente/pedido | Trigger protegia status/campos internos | Trigger bloqueava usuario comum |
| `projects` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `academy_links` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `ai_usage` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `orders` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `payments` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |
| `clients` | Nao versionado | Sem policies RLS | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration | Nao garantido por migration |

| Tabela | Risco encontrado no repositorio antes | Gravidade |
| --- | --- | --- |
| `profiles` | Triggers impediam escalada de privilegio, mas RLS/policies nao estavam versionadas. Sem RLS, perfis poderiam ficar listaveis pelo anon/auth se configuracao remota estivesse permissiva. | Alta |
| `site_products` | Produtos ativos precisam ser publicos, mas administracao/mutacao nao estava protegida por policy versionada. | Media |
| `site_product_orders` | Triggers protegiam mutacao por usuario comum, mas leitura por dono/equipe nao estava garantida por RLS versionada. | Alta |
| `course_purchases` | Triggers bloqueavam auto-concessao, mas leitura/gestao por dono/equipe nao estava garantida por RLS versionada. | Alta |
| `courses` | Metadados de cursos ativos podem ser publicos; gestao de cursos nao tinha policy versionada. | Media |
| `lessons` | A pagina Academy fazia `select("*")` em todas as aulas antes de validar compras. Se RLS remoto estivesse ausente ou permissivo, `video_url` vazaria. | Critica |
| `lesson_progress` | Progresso de aula e dono nao estavam protegidos por policy versionada. | Alta |
| `service_briefings` | Trigger protegia campos internos, mas leitura/mutacao por dono/equipe nao estava consolidada por RLS versionada. | Alta |
| `projects` | Tabela legada/operacional com dados de cliente; acesso nao estava consolidado por RLS versionada. | Alta |
| `academy_links` | Links internos da Academy eram buscados por usuarios autenticados; policy versionada ausente. | Media |
| `ai_usage` | Uso de IA por usuario/equipe nao estava protegido por policy versionada. | Media |
| `orders`, `payments`, `clients` | Tabelas legadas possivelmente ainda existentes; sem RLS versionado, poderiam expor dados historicos. | Alta |

## Correcao aplicada

Migration criada:

- `supabase/migrations/20260701151000_secure_rls_academy_checkout.sql`

Principais funcoes auxiliares:

- `public.fatorz_is_staff()`: identifica equipe/admin por `profiles.role` e `profiles.staff_role`.
- `public.fatorz_has_course_access(course_id)`: confirma compra aprovada do curso pelo `auth.uid()`.
- `public.fatorz_owns_site_product_order(order_id)`: confirma pedido de produto pelo `auth.uid()`.

As policies nao usam `auth.role()`; usam `TO anon/authenticated`, `auth.uid()` e predicados de dono/equipe. Policies de `UPDATE` usam `USING` e `WITH CHECK`.

## Matriz apos a correcao

| Tabela | RLS | Leitura cliente | Leitura equipe | Escrita cliente | Escrita equipe |
| --- | --- | --- | --- | --- | --- |
| `profiles` | Ativado | Proprio perfil | Todos | Proprio perfil, com triggers protegendo campos sensiveis | Sim |
| `site_products` | Ativado | Produtos ativos, anon/auth | Todos | Nao | Sim |
| `site_product_orders` | Ativado | Somente `user_id = auth.uid()` | Todos | Nao via anon/client | Sim |
| `course_purchases` | Ativado | Somente `user_id = auth.uid()` | Todos | Nao via anon/client | Sim |
| `courses` | Ativado | Cursos ativos, anon/auth | Todos | Nao | Sim |
| `lessons` | Ativado | Somente aulas de cursos comprados/aprovados | Todas | Nao | Sim |
| `lesson_progress` | Ativado | Proprio progresso | Todos | Proprio progresso | Sim |
| `service_briefings` | Ativado | Briefings do proprio usuario/pedido | Todos | Proprio briefing/pedido | Sim |
| `projects` | Ativado | Dono por `user_id`; fallback por `client_email`; se ausentes, equipe apenas | Todos | Nao | Sim |
| `academy_links` | Ativado | Links ativos para autenticados | Todos | Nao | Sim |
| `ai_usage` | Ativado | Proprio uso | Todos | Nao via client | Nao via client; service role continua bypassando RLS |
| `orders` | Ativado | Dono por `user_id`; fallback por `customer_email`; se ausentes, equipe apenas | Todos | Nao | Sim |
| `payments` | Ativado | Nao | Todos | Nao | Sim |
| `clients` | Ativado | Nao | Todos | Nao | Sim |

## Protecao de `lessons.video_url`

A protecao agora existe em duas camadas:

1. RLS: `lessons` so permite `SELECT` para equipe ou para usuarios com `course_purchases.status = 'approved'` no mesmo curso.
2. Frontend: `src/pages/Academy.tsx` deixou de buscar todas as aulas no carregamento inicial. Agora busca compras primeiro e so consulta `lessons` para cursos aprovados do usuario, ou todas as aulas quando o perfil e equipe Academy.

Com isso, mesmo que a interface mostre cursos ativos publicos, o campo `video_url` fica preso a compra aprovada ou equipe.

## Bloqueio de compra Academy sem login

Arquivos alterados:

- `src/pages/ProductCheckout.tsx`
- `api/create-product-payment.ts`

Regras aplicadas:

- Produto com `category = 'academy'`, `product_type = 'course'` ou `course_id` exige usuario autenticado.
- O frontend redireciona visitante para login ao abrir checkout de curso.
- O endpoint rejeita com `401` qualquer tentativa de criar pagamento Academy/curso sem `userId`.
- Produtos que nao sao Academy/curso continuam podendo ser comprados sem login.
- Produto Academy/curso sem `course_id` passa a falhar com `400`, evitando compra sem vinculo de acesso.

## Riscos residuais

- A migration ainda precisa ser aplicada no Supabase remoto via pipeline/CLI funcional. O ambiente local atual nao permitiu executar `supabase db push` nem validar introspeccao remota.
- `projects` e `orders` possuem fallback por email quando nao houver `user_id`; isso existe para nao quebrar tabelas legadas, mas o modelo mais forte e migrar esses registros para ownership por `user_id`.
- `payments` e `clients` ficaram restritas a equipe, por cautela. Se houver tela de cliente final lendo essas tabelas diretamente, sera necessario criar policies de dono com base em colunas confirmadas.
- O arquivo de login atual nao consome `redirectTo`; a seguranca nao depende disso, mas a UX de retorno pos-login pode ser melhorada em uma tarefa separada.

## Verificacao local

Comandos executados antes da correcao:

- `npm.cmd run build`: passou.
- `npm.cmd run lint`: falhou com 312 problemas preexistentes, principalmente `any`, regras de hooks e regex em funcao edge. Esta tarefa nao alterou lint global.
- `npx.cmd supabase --version`: falhou por crash do binario Bun empacotado.

Comandos executados depois da correcao:

- `npm.cmd run build`: passou.
- `npm.cmd run lint`: continuou falhando com 312 problemas (294 erros, 18 avisos). Os grupos continuam sendo divida existente do projeto: `@typescript-eslint/no-explicit-any`, regras React Hooks em componentes grandes e `no-control-regex` na edge function `fatorz-ai-assistant`.
- `git diff --check`: passou sem erros de whitespace; apenas avisos de conversao LF/CRLF em arquivos ja editados.

Comandos Supabase que nao puderam ser executados:

- `supabase --version`: comando global ausente.
- `npx.cmd supabase --version`: crash do binario empacotado.
- `supabase migration list`, `supabase db diff`, `supabase db lint/advisors`: dependem da CLI funcional e ficaram bloqueados pelo mesmo problema.

Comandos a executar depois de aplicar esta migration em ambiente com CLI funcional:

```powershell
npx.cmd supabase db push
npx.cmd supabase migration list
npx.cmd supabase db lint
npm.cmd run build
```
