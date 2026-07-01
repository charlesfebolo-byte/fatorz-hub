# FatorZ Hub - Analise tecnica completa

Data da analise: 2026-07-01  
Branch analisada: `main`  
Ultimo historico visto: `4c1578a security: proteger resumo de pedido com token`

## 1. Resultado dos comandos pedidos

### Git

`git status --short`: sem alteracoes antes da criacao deste documento. Depois da analise, somente `docs/PROJECT_FULL_ANALYSIS.md` foi criado e `node_modules/dist` podem existir localmente por comandos de validacao, mas sao ignorados pelo Git.

`git branch --show-current`: `main`

`git log --oneline -10`:

```text
4c1578a security: proteger resumo de pedido com token
0874e8e security: proteger briefings contra alteracao indevida
90eb50f security: proteger pedidos contra alteracao indevida
a8f003c security: proteger course_purchases contra auto-liberacao
93529d8 security: proteger profiles contra autoelevação
2bccc03 fix: corrigir SEO tecnico e sitemap
8963ae7 style: adicionar agradecimento na pagina de pos-compra
cd44347 style: melhorar pagina de pos-compra
f5623be fix: redirecionar checkout para pos-compra
1f43c61 feat: criar pagina de pos-compra com upsell
```

### Build e lint

Primeira tentativa de `npm run build` e `npm run lint` falhou porque `node_modules` nao estava instalado: `tsc` e `eslint` nao eram reconhecidos. Rodei `npm ci`, que instalou 179 pacotes e reportou 1 vulnerabilidade high severity via `npm audit`.

`npm run build`: passou.

Observacao do build: o bundle principal ficou grande.

```text
dist/assets/index-B71tuW8W.js   949.52 kB | gzip: 229.87 kB
(!) Some chunks are larger than 500 kB after minification.
```

`npm run lint`: falhou com 312 problemas, sendo 294 erros e 18 warnings. Principais causas:

- Muitos `any`, especialmente em `api/appmax-webhook.ts`, `api/create-product-payment.ts`, `api/create-academy-pix.ts`, `api/get-order-summary.ts`, `src/App.tsx`, `src/pages/*`.
- Regras novas de React Hooks acusando funcoes usadas em `useEffect` antes da declaracao: `ProductCheckout.tsx`, `ServicePage.tsx`, `Services.tsx`, `Settings.tsx`, `ThankYou.tsx`.
- `react-hooks/set-state-in-effect` em efeitos que chamam `setState` diretamente.
- `supabase/functions/fatorz-ai-assistant/index.ts` tem `no-control-regex` e muitos `any`.
- `create-product-payment.ts` e `create-academy-pix.ts` tem `no-useless-assignment`.

## 2. Estrutura principal

```text
api/
  appmax-webhook.ts
  create-academy-pix.ts
  create-product-payment.ts
  debug-appmax.ts
  get-order-summary.ts
  sitemap.ts
public/
  robots.txt
  google-sitemap.xml
src/
  App.tsx
  lib/supabase.ts
  services/auth.ts
  components/
  data/
  hooks/
  pages/
supabase/
  functions/fatorz-ai-assistant/index.ts
  migrations/
```

Stack real:

- React 19, React DOM 19.
- TypeScript 6.
- Vite 8.
- React Router DOM 7.
- Supabase JS 2.
- Tailwind CSS 4 via `@tailwindcss/vite`.
- Vercel Serverless Functions em `api/`.
- Supabase Edge Function para assistente IA.
- Appmax como gateway de pagamento.

Dependencias chamam atencao: React 19, Vite 8, TypeScript 6 e ESLint 10 sao versoes bem recentes. O build passa, mas o lint esta sensivel a regras novas de React Hooks.

## 3. Rotas e App.tsx

`src/App.tsx` concentra praticamente toda a roteirizacao e autorizacao de tela.

Rotas publicas indexaveis ou abertas:

- `/`
- `/servicos`
- `/servicos/:slug`
- `/agencia-de-marketing-em-pelotas`
- `/mapa-do-site`
- `/blog`
- `/blog/:slug`
- `/login`
- `/checkout/academy`
- `/checkout/produto`
- `/obrigado`

Rotas protegidas por login:

- `/dashboard`
- `/minhas-entregas`
- `/configuracoes`
- `/mural`
- `/briefing`
- `/academy`

Rotas staff/admin:

- `/admin/pedidos`
- `/admin/produtos`
- `/admin/assinaturas`
- `/admin/usuarios`
- `/admin/cursos`
- `/admin/aulas`
- `/admin/links`
- `/projetos`

Rotas mortas/redirecionadas:

- `/clientes` redireciona para `/dashboard`.
- `/financeiro` redireciona para `/dashboard`.
- `Clients.tsx` e `Finance.tsx` existem, mas nao sao expostos no roteador atual.

Funcionamento do perfil:

- No start, `App` chama `supabase.auth.getSession()`.
- Se existe usuario, `loadProfile` busca `profiles` por `id = user.id` e chama `supabase.rpc("is_admin")`.
- Se `is_admin` retorna true, o app promove localmente `role` para `admin` e `staff_role` para `ceo_fatorz`.
- Se a query de profile falha, o app cria um fallback em memoria com `role` e `staff_role`.

Regra de staff/admin:

- `getStaffRole(profile)` usa `profile.staff_role`; se ausente e `profile.role === "admin"`, assume `ceo_fatorz`.
- `StaffRoute` protege UI por arrays de roles.
- Isso protege navegacao no frontend, mas nao substitui RLS/policies no Supabase. O banco precisa bloquear as tabelas diretamente.

Risco: se `profiles` ou `rpc("is_admin")` tiver permissao errada, o app pode negar acesso indevidamente ou, pior, liberar UI de staff se o profile for alteravel. As migrations recentes tentam mitigar auto-elevacao, mas nao comprovam RLS.

## 4. Supabase - tabelas usadas

### `profiles`

Usos:

- `App.tsx`: carrega perfil, role, staff_role, customer_tag.
- `Settings.tsx`: atualiza dados do cliente.
- `AdminUsers.tsx`: lista/edita usuarios.
- `AdminSubscriptions.tsx`: relaciona compra Academy a usuario.
- Migrations de seguranca consultam `profiles` para validar staff.
- Edge Function `fatorz-ai-assistant` busca perfil e plano/uso.

Campos esperados:

- `id`, `email`, `nome`, `role`, `staff_role`, `customer_tag`, `academy_expires_at`, `total_spent`, `created_at`, `updated_at`, possivelmente `whatsapp`, `instagram`, `cpf`, `document`, `document_number`.

Riscos:

- O app depende de `rpc("is_admin")`, mas a funcao nao esta versionada nas migrations do repo.
- Trigger `protect_profiles_privilege_escalation` nao ativa RLS; ela so bloqueia alteracao de campos sensiveis em mutacoes.
- Se policies permitirem `select *` amplo, dados pessoais podem vazar entre usuarios.

### `site_products`

Usos:

- Landing, Services, ServicePage, ProductCard, AdminProducts.
- `ProductCheckout.tsx` carrega produto ativo por slug.
- APIs `create-product-payment`, `get-order-summary`, `appmax-webhook`.
- `CheckoutAcademy` busca produtos `category=academy` e `product_type=course`.

Campos esperados:

- `id`, `created_at`, `updated_at`, `name`, `slug`, `subtitle`, `description`, `category`, `product_type`, `price_cents`, `old_price_cents`, `is_active`, `is_featured`, `order_index`, `image_url`, `badge`, `checkout_provider`, `external_payment_url`, `accepts_pix`, `accepts_boleto`, `accepts_card`, `appmax_sku`, `appmax_product_name`, `course_id`, `notes`.

Riscos:

- Admin edita quase tudo que precisa, inclusive capa, preco, checkout, formas de pagamento, course_id e beneficios.
- Falta validacao forte de combinacoes: produto Academy sem `course_id`, `checkout_provider=appmax` sem SKU/nome consistente, produto sem forma de pagamento ativa.
- Se RLS permitir update por usuario normal, qualquer usuario pode alterar vitrine/preco. Nao ha migration protegendo `site_products`.

### `site_product_orders`

Usos:

- API de checkout cria pedido.
- Webhook atualiza status.
- `get-order-summary` retorna resumo seguro com token.
- `BriefingForm`, `MyDeliveries`, `AdminOrders`, `AdminProducts`, `Projects`, hooks de dashboard/clientes.
- Edge Function assistente usa para contexto de compras.

Campos esperados:

- `id`, `created_at`, `updated_at`, `user_id`, `user_email`, `customer_name`, `customer_phone`, `customer_document`, `product_id`, `product_slug`, `product_name`, `product_category`, `product_type`, `amount_cents`, `status`, `payment_provider`, `payment_method`, `appmax_customer_id`, `appmax_order_id`, `appmax_payment_id`, `payment_id`, `pix_qr_code`, `pix_copy_paste`, `boleto_url`, `boleto_barcode`, `boleto_digitable_line`, `boleto_expiration_date`, `raw_payment_response`, `project_id`, `notes`, `order_access_token_hash`, `order_access_token_created_at`.

Riscos:

- CPF e telefone sao salvos em texto claro (`customer_document`, `customer_phone`).
- `MyDeliveries` filtra apenas por `user_email`; se RLS estiver fraca, isso vira IDOR por query direta.
- Trigger protege mutacao por usuarios comuns, mas nao ativa RLS nem controla leitura.
- `AdminOrders` permite apagar pedidos pelo frontend staff; precisa policy real por staff.
- Campos de Pix/boleto sao recuperaveis no painel. Isso e necessario para UX, mas exige RLS restritiva.

### `course_purchases`

Usos:

- Academy libera acesso.
- AdminSubscriptions gerencia acesso vitalicio.
- APIs `create-product-payment`, `create-academy-pix`, `appmax-webhook`.
- Settings lista compras.
- AdminUsers/AdminCourses contam compras.
- Edge Function IA usa no contexto.

Campos esperados:

- `id`, `created_at`, `user_id`, `user_email`, `course_id`, `course_title`, `payment_id`, `payment_url`, `status`, `access_type`, `approved_at`, `notes`, `payment_provider`, `payment_method`, `amount_cents`, `appmax_customer_id`, `appmax_order_id`, `appmax_payment_id`, `raw_payment_response`.

Riscos:

- Academy atualmente consulta `.eq("user_id", user.id)`. Compras feitas sem login podem ficar com `user_id = null`, mesmo com `user_email`, e nao liberar curso depois do login.
- Trigger bloqueia auto-liberacao, mas nao substitui RLS de leitura.
- Duplicidade possivel entre checkout antigo `create-academy-pix` e checkout unificado.

### `courses`

Usos:

- Academy, CheckoutAcademy, AdminCourses, AdminLessons, AdminProducts, APIs de ponte Academy.

Campos esperados:

- `id`, `created_at`, `title`, `subtitle`, `description`, `cover_url`, `badge`, `order_index`, `is_active`, `price_cents`, `payment_url`, `is_paid`.

Riscos:

- Aulas e cursos sao buscados no frontend. A protecao de conteudo depende do frontend nao renderizar iframe sem acesso. Se `lessons` estiver legivel para anon/auth sem policy adequada, usuarios podem buscar URLs de video diretamente via Supabase API.

### `lessons`

Usos:

- Academy, AdminCourses, AdminLessons.

Campos esperados:

- `id`, `created_at`, `course_id`, `module_title`, `lesson_title`, `description`, `video_url`, `order_index`.

Risco critico:

- `Academy.tsx` busca todas as aulas antes de aplicar `hasCourseAccess` no frontend. Se RLS nao restringir `lessons`, os `video_url` podem vazar para qualquer usuario logado, mesmo sem compra.

### `lesson_progress`

Usos:

- Academy: marca aula concluida.

Campos esperados:

- `id`, `user_id`, `lesson_id`, `completed`, `watched_at`.

Riscos:

- Precisa RLS por `user_id = auth.uid()` em select/insert/update. Sem isso, progresso pode vazar ou ser manipulado.

### `projects`

Usos:

- Projects admin, AdminOrders cria/vincula projeto, MyDeliveries acompanha entrega, Dashboard.

Campos esperados:

- `id`, `created_at`, `title`, `client_name`, `client_email`, `service_type`, `status`, `deadline`, `amount`, `delivery_link`, `notes`.

Riscos:

- Cliente ve projetos por `client_email`; RLS precisa permitir apenas proprio email/uid e staff.
- `delivery_link` pode ser material sensivel.

### `service_briefings`

Usos:

- BriefingForm, MyDeliveries, AdminOrders.

Campos esperados:

- `id`, `created_at`, `updated_at`, `order_id`, `project_id`, `user_id`, `user_email`, `customer_name`, `product_name`, `product_category`, `product_type`, `brand_name`, `instagram`, `whatsapp`, `website`, `city`, `main_objective`, `offer_description`, `target_audience`, `colors`, `avoid_colors`, `visual_style`, `references_like`, `references_dislike`, `logo_link`, `material_links`, `copy_notes`, `extra_notes`, `status`.

Riscos:

- Trigger protege mutacao por dono do pedido, mas nao ativa RLS.
- Briefing contem dados comerciais e links de materiais. Leitura precisa ser dono ou staff.

### `orders` e `payments`

Usos:

- Sistema legado: Dashboard, AdminOrders, AdminProducts, Projects, Finance, hooks.

Campos esperados:

- `orders`: `id`, `created_at`, `user_id`, `customer_email`, `customer_name`, `product_id`, `product_name`, `product_category`, `product_price`, `payment_link`, `status`, `payment_id`, `project_id`, `notes`.
- `payments`: `id`, `created_at`, `client_name`, `product_name`, `amount`, `status`, outros campos usados de forma flexivel.

Riscos:

- Parecem legado/manual e misturados com fluxo novo. Podem duplicar receita, confundir dashboard e exigir policies separadas.

### Outras tabelas encontradas

- `clients`: usado em `Clients.tsx`, `useClientes`, `useDashboard`.
- `academy_links`: Academy e AdminLinks.
- `mural_posts`, `mural_reactions` ou equivalente: `Mural.tsx` usa mural via Supabase.
- `ai_usage`: Edge Function do assistente.

## 5. Checkout e Appmax

Arquivos principais:

- `api/create-product-payment.ts`
- `api/get-order-summary.ts`
- `api/appmax-webhook.ts`
- `api/create-academy-pix.ts` (legado/residual)
- `src/pages/ProductCheckout.tsx`
- `src/pages/ThankYou.tsx`

### Fluxo unificado atual

1. `ProductCheckout` recebe `slug` e opcionalmente `method`.
2. Busca `site_products` ativo por slug.
3. Coleta nome, email, telefone, CPF e, para cartao, dados de cartao.
4. POST `/api/create-product-payment`.
5. API valida origem se `PAYMENT_ALLOWED_ORIGINS` estiver configurado, rate limit por IP e campos obrigatorios.
6. API busca produto ativo no Supabase com service role.
7. API procura pedido reutilizavel pendente por usuario/email/documento/produto/metodo.
8. Se reutilizavel, rotaciona token de acesso e retorna pedido existente.
9. Se novo, cria customer na Appmax.
10. Cria order na Appmax.
11. Cria pagamento Pix, boleto ou cartao na Appmax.
12. Salva `site_product_orders`.
13. Se produto for Academy com `course_id`, cria/atualiza `course_purchases`.
14. Retorna `order_id` e token bruto.
15. Front redireciona para `/obrigado?orderId=...&token=...`.

### Pix

- API chama `/payment/pix`.
- Salva `pix_qr_code` e `pix_copy_paste`.
- Status inicial `pending`.
- `ThankYou` mostra QR/copiar enquanto pendente.
- Webhook muda para `approved` ou `cancelled`.

### Boleto

- API chama `/payment/boleto`.
- Salva `boleto_url`, `boleto_barcode`, `boleto_digitable_line`, `boleto_expiration_date`.
- Status inicial `pending`.
- `ThankYou` mostra link/linha digitavel.
- Webhook confirma posteriormente.

### Cartao

- Front envia numero, validade e CVV para API.
- API tokeniza em `/tokenize/card`.
- API usa token em `/payment/credit-card`.
- Salva apenas `last4`, bandeira, parcelas e `tokenized: true` em `raw_payment_response`; nao salva numero/CVV.
- Status inicial vem da resposta Appmax (`approved`, `pending`, `cancelled`).

Ponto sensivel: mesmo que nao grave cartao, o servidor recebe numero/CVV. Logs atuais usam `summarizeAppmaxResponse`, aparentemente sem dados de cartao, mas qualquer log acidental de `req.body` seria grave. Nao existe camada PCI formal; ideal e usar tokenizacao direta no provedor/browser se Appmax permitir.

### Idempotencia

Ha tentativa de idempotencia por `findReusableProductOrder` antes de criar nova cobranca. Ela busca pedido pendente por user/email/documento/produto/metodo. Isso reduz duplicidade de Pix/boleto.

Riscos restantes:

- Nao ha chave idempotente explicita enviada pelo cliente.
- Se duas requisicoes simultaneas chegarem antes do primeiro insert, podem criar duas cobrancas Appmax.
- Se Appmax criar customer/order/payment e o insert no Supabase falhar, a API tenta recuperar por IDs Appmax; se nao recuperar, retorna 502 com dados de reconciliacao. Isso e bom, mas ainda exige rotina operacional para reconciliar.
- Nao ha tabela de eventos/webhook nem lock transacional.

### Token seguro do pedido

- `create-product-payment` gera token aleatorio de 32 bytes em hex.
- Salva apenas SHA-256 em `order_access_token_hash`.
- `get-order-summary` compara com `timingSafeEqual`.
- O token bruto so vai no link `/obrigado`.

Pontos a melhorar:

- `order_access_token_created_at` existe, mas `get-order-summary` nao expira token por idade.
- Ao reutilizar pedido, token e rotacionado; links antigos deixam de funcionar. Isso e aceitavel, mas precisa ser esperado no suporte.
- `get-order-summary` usa service role e token; se token vazar, mostra Pix/boleto e resumo do pedido.

### Webhook Appmax

`api/appmax-webhook.ts`:

- Exige POST.
- Valida segredo por header/query em producao ou se `APPMAX_WEBHOOK_SECRET` existe.
- Extrai `appmaxOrderId` e `appmaxPaymentId` por busca profunda.
- Normaliza status para `pending`, `approved`, `cancelled`.
- Atualiza `course_purchases` e `site_product_orders`.
- Para produto Academy, sincroniza/gera `course_purchases` a partir de `site_product_orders`.
- Ignora transicao de `approved/cancelled` para `pending`.

Pontos bons:

- Webhook e idempotente quando status ja esta aplicado.
- Usa resumo seguro em `raw_payment_response`, nao grava payload bruto completo.

Riscos:

- Validacao por segredo simples, nao assinatura HMAC do corpo. Se Appmax suportar assinatura, deveria validar assinatura.
- Nao persiste eventos recebidos; auditoria e replay ficam ruins.
- O parser busca IDs por muitas chaves; robusto, mas pode casar campo errado se payload complexo tiver IDs internos nao relacionados.

## 6. Produtos e painel admin

`AdminProducts` esta bem completo para o catalogo atual.

Permite editar:

- Nome, slug, categoria, subtitulo, descricao.
- `product_type`.
- Ordem.
- Preco atual e antigo.
- `checkout_provider`.
- Link externo.
- `accepts_pix`, `accepts_boleto`, `accepts_card`.
- Beneficios publicos via `notes`.
- Badge.
- Imagem/capa por upload no bucket `product-covers` ou URL.
- Ativo/destaque.
- SKU Appmax.
- Nome Appmax.
- `course_id`.

Categorias atuais:

- `academy`
- `servicos-unicos`
- `sites`
- `identidade`
- `assessoria`

Tipos atuais:

- `course`
- `service`
- `site`
- `branding`
- `subscription`
- `diagnostic`

Falta ou seria util:

- Campo explicito `requires_briefing` para parar de depender de heuristica textual.
- Campo explicito `delivery_model` ou `fulfillment_type`.
- Campo explicito `access_model` para Academy.
- Validacoes por tipo: curso exige `course_id`; external exige URL; appmax exige SKU; produto ativo exige preco e ao menos um metodo.
- Confirmacao forte antes de deletar produto vendido. Hoje avisa, mas permite.

Produto Academy:

- Deve ser `category=academy`, `product_type=course`, `course_id` preenchido.
- CheckoutAcademy depende disso para redirecionar ao checkout unificado.

Produto diagnostico:

- Deve ser `product_type=diagnostic`.
- Nao deve pedir briefing.

Produto mensal/assessoria:

- Ideal `category=assessoria` ou `product_type=subscription`.
- Pede briefing e mostra linha do tempo mensal em `MyDeliveries`/`AdminOrders`.

Produto site/landing:

- Ideal `category=sites` e `product_type=site`.
- Pede briefing e pode virar projeto.

## 7. Pos-compra, briefing e entregas

### `/obrigado`

`ThankYou.tsx`:

- Exige `orderId` e `token`.
- Chama `/api/get-order-summary`.
- Mostra Pix/boleto/cartao conforme metodo e status.
- Define proximo passo:
  - Academy aprovado: ir para Academy/login.
  - Academy pendente: aguardar liberacao.
  - Produto com briefing: preencher briefing.
  - Pendente sem briefing: acompanhar entregas.
  - Cancelado: voltar ao checkout.
- Mostra upsell escolhido pela API.

Bom:

- Nao busca pedido direto do Supabase pelo frontend.
- Usa token seguro.
- Nao mostra dados pessoais do pedido no resumo.

Problema:

- Para briefing, permite navegar mesmo com pagamento pendente. O texto diz "depois do pagamento", mas o botao existe. O `BriefingForm` nao bloqueia por `status`. Decisao de negocio precisa ser clara.

### Briefing

`BriefingForm.tsx`:

- Exige login.
- Recebe `orderId`.
- Busca pedido em `site_product_orders`.
- Valida dono por `user_id` ou email.
- Busca/edita `service_briefings` por `order_id`.
- Nao pede briefing para Academy/curso/diagnostico por heuristica.
- Ao salvar, faz upsert e, se houver projeto, muda status para `em diagnostico`.

Regras atuais:

- Academy nao pede briefing.
- Curso nao pede briefing.
- Diagnostico nao pede briefing.
- Servicos, site, branding, subscription/assessoria pedem briefing por default.

Risco:

- Regra duplicada em `ProductCheckout`, `get-order-summary`, `BriefingForm`, `MyDeliveries`, `AdminOrders`. Isso pode divergir. Precisa virar campo de produto ou util compartilhado.

### MyDeliveries

Mostra:

- Compras por `site_product_orders` filtradas por email.
- Projetos por `client_email`.
- Briefings por email.
- Status de pagamento.
- Botao de Pix/boleto quando pendente.
- Botao de briefing quando necessario.
- Linha do tempo de assessoria mensal.
- Projetos/entregas e `delivery_link`.

Riscos:

- Filtro por email precisa de RLS; no frontend nao basta.
- Projetos sem `project_id` vinculado podem aparecer separados ou confundir.

### AdminOrders

Consolida:

- `orders` legado.
- `site_product_orders` novo.
- `projects`.
- `service_briefings`.

Acoes:

- Abrir pagamento/Pix/boleto.
- Marcar aprovado.
- Criar projeto.
- Ver briefing.
- Avancar ciclo de assessoria.
- Marcar concluido.
- Salvar Payment ID.
- Observacoes.
- Cancelar.
- Apagar.

Falta para fluxo profissional:

- Auditoria de acoes admin.
- Evitar exclusao fisica; preferir status `archived`.
- Tabela de timeline/eventos por pedido.
- Criacao automatica de projeto quando pagamento aprovado e briefing recebido, conforme regra.
- SLA/prazos por produto.
- Notificacoes por email/WhatsApp.

## 8. Academy

Arquivos:

- `Academy.tsx`
- `CheckoutAcademy.tsx`
- `AdminCourses.tsx`
- `AdminLessons.tsx`
- `AdminLinks.tsx`
- `AdminSubscriptions.tsx`
- `api/create-academy-pix.ts` (antigo)

Fluxo atual:

- `Academy` mostra catalogo de cursos ativos.
- Cursos sao publicos, aulas so renderizam com acesso aprovado.
- Acesso e liberado quando existe `course_purchases` com `user_id = user.id`, `course_id`, `status=approved`.
- Compra passa por `CheckoutAcademy`, que encontra produto Academy vinculado e redireciona para `/checkout/produto`.
- `create-product-payment` cria/atualiza `course_purchases` quando produto possui `course_id`.
- `appmax-webhook` atualiza status e tambem faz ponte de pedidos de produto Academy para `course_purchases`.
- Acesso e vitalicio (`access_type=lifetime`).

Riscos importantes:

- Compra sem conta: `ProductCheckout` publico aceita `userId=null` e email. Se um usuario compra sem login, `course_purchases.user_id` pode ficar null. Depois, `Academy` busca apenas por `user_id`, nao por email. Resultado: compra paga pode nao liberar acesso automaticamente ao criar conta com mesmo email.
- `course_id` nulo: produto Academy sem `course_id` nao cria acesso.
- Cursos inativos nao aparecem, mas compras antigas de curso inativo podem ficar inacessiveis na UI porque `Academy` filtra cursos `is_active=true`.
- `lessons` sao baixadas antes da checagem de acesso no frontend. RLS deve proteger video URLs.
- Ha duplicidade entre `AdminCourses` e `AdminLessons`. Ambos gerenciam aulas, com UX/validacoes diferentes.
- `create-academy-pix.ts` e legado e pode gerar fluxo paralelo se alguem ainda chamar.

## 9. Dashboard e experiencia do cliente

Arquivos lidos/considerados:

- `Dashboard.tsx`
- `Sidebar.tsx`
- `Settings.tsx`
- `Mural.tsx`
- `Projects.tsx`
- `FatorzAssistant.tsx`
- hooks `useDashboard`, `useClientes`, `useFinanceiro`

O que funciona:

- Dashboard separa visao de time e cliente por staff_role.
- Cliente tem acesso a compras, Academy, entregas, mural e configuracoes.
- Staff tem atalhos para pedidos, produtos, cursos, usuarios e projetos.
- Settings permite atualizar profile e ver compras Academy.
- Mural usa Supabase para posts/reacoes.
- Projects administra projetos e pode vincular pedidos.
- Assistente chama Supabase Edge Function `fatorz-ai-assistant`.

O que parece mockado/incompleto:

- Dashboard ainda agrega tabelas legado (`orders`, `payments`, `clients`) e novo fluxo, com normalizacoes no frontend.
- `Clients.tsx` e `Finance.tsx` existem, mas rotas estao desativadas.
- `useFinanceiro`/`Finance.tsx` parecem fluxo antigo/manual.
- Alguns cards e metricas dependem de tabelas que podem nem existir no banco atual.
- FatorzAssistant depende de Gemini e `ai_usage`; sem migrations no repo, deploy/config pode quebrar.

Pronto para cliente real:

- Login, checkout unificado, pos-compra, briefing, entregas e Academy ja tem estrutura funcional.

Ainda incompleto para operacao profissional:

- Falta schema versionado completo.
- Falta RLS versionada.
- Falta auditoria e historico de status.
- Falta notificacao e reconciliacao de pagamento.
- Falta tipagem central de tabelas.

## 10. SEO e paginas publicas

Arquivos:

- `Landing.tsx`
- `Services.tsx`
- `ServicePage.tsx`
- `Blog.tsx`
- `BlogPost.tsx`
- `SEO.tsx`
- `api/sitemap.ts`
- `public/robots.txt`
- `public/google-sitemap.xml`

Indexaveis:

- `/`
- `/servicos`
- `/mapa-do-site`
- `/agencia-de-marketing-em-pelotas`
- `/servicos/*`
- `/blog`
- `/blog/*`

Noindex:

- Login, checkout, obrigado, briefing, dashboard, admin, academy, mural, projetos, entregas, configuracoes etc.

Pontos bons:

- `SEO.tsx` seta title, description, keywords, canonical, OG, Twitter, robots e JSON-LD.
- `api/sitemap.ts` gera sitemap dinamico em `/sitemap.xml`.
- `robots.txt` bloqueia rotas privadas.
- Blog e servicos tem estrutura de SEO local.

Problemas:

- `public/google-sitemap.xml` e estatico com lastmod 2026-06-13; pode divergir do sitemap dinamico.
- `robots.txt` aponta para dominio fallback `https://fatorz-hub.vercel.app`; se dominio real mudar, precisa `SITE_URL`/arquivo atualizado.
- `SEO.tsx` usa `VITE_SITE_URL`; `api/sitemap.ts` usa `SITE_URL`; nomes diferentes podem gerar canonical e sitemap divergentes.
- `BlogPost.tsx` tambem manipula canonical/JSON-LD diretamente, podendo concorrer com `SEO.tsx`.
- `og-image.png` e `fatorz-favicon.svg` sao referenciados, mas nao aparecem no inventario inicial; se inexistentes, OG/logo quebram.
- Textos sao aceitaveis, mas muitos sao genericos e repetem termos de marketing digital. Prioridade real e melhorar paginas de servico com prova, cases, FAQ e oferta concreta.

## 11. Seguranca

Pontos positivos:

- `service_role` nao aparece hardcoded no frontend.
- APIs usam `SUPABASE_SERVICE_ROLE_KEY` por variavel de ambiente.
- `create-product-payment` valida campos basicos, origem opcional e rate limit em memoria.
- `get-order-summary` usa token hash + timing safe compare.
- Webhook exige segredo em producao.
- Migrations recentes protegem mutacoes sensiveis em `profiles`, `course_purchases`, `site_product_orders`, `service_briefings`.

Riscos graves ou importantes:

- `src/lib/supabase.ts` tem URL e anon key hardcoded. Anon key nao e segredo como service role, mas deve ir para env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) para rotacao/ambientes.
- Nao ha migrations completas de schema e RLS. As migrations dizem explicitamente que nao ativam RLS.
- `lessons.video_url` pode vazar se RLS permitir select.
- Dados pessoais em `site_product_orders`: CPF e telefone em texto claro.
- `AdminOrders` coloca CPF em notes de projeto. Isso espalha dado sensivel para `projects.notes`.
- APIs retornam detalhes de erro Appmax parcialmente sanitizados, mas ainda ha risco de expor mensagens internas.
- `PAYMENT_ALLOWED_ORIGINS` vazio aceita qualquer origem. Em producao precisa ser configurado.
- Rate limit em memoria nao e robusto em serverless distribuido.
- Rotas admin sao protegidas no frontend, mas precisam RLS/policies e/ou APIs server-side para acoes administrativas.
- `debug-appmax.ts` existe; precisa estar sempre protegido por segredo e idealmente desativado em producao.
- Webhook usa segredo simples, nao assinatura HMAC.

## 12. Problemas tecnicos

- Lint falha com 294 erros.
- Uso extensivo de `any`.
- `App.tsx`, `ProductCheckout.tsx`, `AdminOrders.tsx`, `AdminProducts.tsx`, `Academy.tsx`, `Dashboard.tsx` sao componentes grandes e concentram regra de negocio.
- Regras repetidas: `productNeedsBriefing/orderNeedsBriefing`, status, normalizacao Appmax, Academy product detection.
- `api/create-product-payment.ts` e `api/appmax-webhook.ts` duplicam muita logica de Academy bridge.
- `api/create-academy-pix.ts` parece legado e aumenta superficie de bug.
- Dashboard e admin misturam tabelas antigas e novas.
- Bundle grande sem code splitting.
- Sem tipos Supabase gerados.
- Sem testes automatizados.
- Sem schema completo versionado.
- Codificacao no terminal apareceu com mojibake em varios textos acentuados; arquivos provavelmente estao UTF-8, mas ambiente PowerShell exibiu errado.

## 13. Prioridades reais

### P0 - Quebra producao / risco grave

- Item: RLS/schema nao versionados.
  Arquivos: `supabase/migrations/*`, todo acesso Supabase.
  Motivo: triggers nao substituem policies; leitura de pedidos, aulas, briefings e projetos pode vazar.
  Como corrigir: criar migrations completas com RLS por tabela, staff policies, ownership por `auth.uid()`/email verificado e testes.

- Item: possivel vazamento de aulas pagas.
  Arquivo: `src/pages/Academy.tsx`.
  Motivo: frontend busca `lessons` antes de validar acesso; se RLS permitir, `video_url` fica exposto.
  Como corrigir: RLS em `lessons` ou RPC/API que retorna aulas apenas para compradores/staff.

- Item: compra Academy sem login nao libera acesso.
  Arquivos: `src/pages/ProductCheckout.tsx`, `src/pages/Academy.tsx`, `api/create-product-payment.ts`.
  Motivo: `course_purchases.user_id` pode ser null e Academy consulta apenas por user_id.
  Como corrigir: vincular compra por email confirmado no login, backfill `user_id`, ou Academy consultar uma view/RPC segura por email autenticado.

- Item: dados pessoais espalhados.
  Arquivos: `api/create-product-payment.ts`, `src/pages/AdminOrders.tsx`.
  Motivo: CPF/telefone salvos em pedido e CPF copiado para `projects.notes`.
  Como corrigir: minimizar armazenamento, mascarar no admin, remover CPF de notes e restringir RLS.

- Item: lint falhando.
  Arquivos: varios.
  Motivo: CI com lint bloquearia deploy se configurado; qualidade e regressao ficam ruins.
  Como corrigir: fasear tipagem de APIs e componentes, ajustar hooks.

### P1 - Fluxo importante incompleto

- Item: idempotencia de pagamento nao transacional.
  Arquivo: `api/create-product-payment.ts`.
  Motivo: requisicoes simultaneas podem duplicar cobranca.
  Como corrigir: chave idempotente unica por checkout attempt, unique index e upsert controlado.

- Item: token de `/obrigado` sem expiracao.
  Arquivos: `api/get-order-summary.ts`, migration do token.
  Motivo: token vazado continua valido ate rotacao.
  Como corrigir: expirar por tempo e permitir reemissao autenticada.

- Item: regra de briefing duplicada por heuristica.
  Arquivos: `ProductCheckout.tsx`, `get-order-summary.ts`, `BriefingForm.tsx`, `MyDeliveries.tsx`, `AdminOrders.tsx`.
  Motivo: uma categoria/nome novo pode pedir briefing errado.
  Como corrigir: campo `requires_briefing` em `site_products`.

- Item: webhook sem tabela de eventos.
  Arquivo: `api/appmax-webhook.ts`.
  Motivo: sem auditoria/replay/reconciliacao.
  Como corrigir: criar `payment_events` e salvar payload sanitizado + resultado.

- Item: `create-academy-pix.ts` legado.
  Arquivo: `api/create-academy-pix.ts`.
  Motivo: fluxo paralelo pode divergir do checkout unificado.
  Como corrigir: remover/arquivar apos confirmar que nao ha chamadas.

### P2 - Melhoria profissional

- Item: code splitting.
  Arquivos: `src/App.tsx`, Vite config.
  Motivo: bundle JS ~950 kB.
  Como corrigir: lazy load para admin, Academy e checkout.

- Item: tipos Supabase centralizados.
  Arquivos: todos que usam Supabase.
  Motivo: `any` demais e campos divergentes.
  Como corrigir: gerar `database.types.ts` e tipar `createClient`.

- Item: AdminOrders com exclusao fisica.
  Arquivo: `src/pages/AdminOrders.tsx`.
  Motivo: risco operacional.
  Como corrigir: soft delete/archive e audit log.

- Item: SEO com origem duplicada.
  Arquivos: `SEO.tsx`, `api/sitemap.ts`, `robots.txt`.
  Motivo: canonicals/sitemap podem divergir por env.
  Como corrigir: padronizar `SITE_URL`/`VITE_SITE_URL` e gerar robots dinamico.

### P3 - Organizacao/limpeza

- Item: componentes grandes.
  Arquivos: `AdminOrders.tsx`, `AdminProducts.tsx`, `ProductCheckout.tsx`, `Academy.tsx`.
  Motivo: manutencao dificil.
  Como corrigir: extrair hooks, services e componentes internos por dominio.

- Item: rotas/arquivos legado.
  Arquivos: `Clients.tsx`, `Finance.tsx`, `create-academy-pix.ts`.
  Motivo: confunde proximos assistentes e devs.
  Como corrigir: decidir remover, reativar ou documentar como legado.

- Item: normalizadores duplicados.
  Arquivos: APIs e paginas.
  Motivo: regras divergentes.
  Como corrigir: criar `src/lib/productRules.ts` e modulo server compartilhado ou duplicacao controlada com testes.

- Item: textos com mojibake no terminal.
  Arquivos: varios com acentos.
  Motivo: ambiente exibiu codificacao errada; pode atrapalhar automacoes.
  Como corrigir: garantir UTF-8 e configurar terminal/CI.

## 14. Arquivos analisados

Principais arquivos lidos ou varridos:

- `package.json`
- `vite.config.ts`
- `vercel.json`
- `src/App.tsx`
- `src/lib/supabase.ts`
- `src/services/auth.ts`
- `src/pages/ProductCheckout.tsx`
- `src/pages/ThankYou.tsx`
- `src/pages/BriefingForm.tsx`
- `src/pages/MyDeliveries.tsx`
- `src/pages/AdminOrders.tsx`
- `src/pages/AdminProducts.tsx`
- `src/pages/Academy.tsx`
- `src/pages/CheckoutAcademy.tsx`
- `src/pages/AdminCourses.tsx`
- `src/pages/AdminLessons.tsx`
- `src/pages/AdminLinks.tsx`
- `src/pages/AdminSubscriptions.tsx`
- `src/pages/AdminUsers.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Mural.tsx`
- `src/pages/Projects.tsx`
- `src/pages/Landing.tsx`
- `src/pages/Services.tsx`
- `src/pages/ServicePage.tsx`
- `src/pages/Blog.tsx`
- `src/pages/BlogPost.tsx`
- `src/components/SEO.tsx`
- `src/components/Sidebar.tsx`
- `src/components/FatorzAssistant.tsx`
- `src/hooks/useDashboard.ts`
- `src/hooks/useClientes.ts`
- `src/hooks/useFinanceiro.ts`
- `src/data/seoServices.ts`
- `src/data/blogPosts.ts`
- `api/create-product-payment.ts`
- `api/get-order-summary.ts`
- `api/appmax-webhook.ts`
- `api/create-academy-pix.ts`
- `api/debug-appmax.ts`
- `api/sitemap.ts`
- `public/robots.txt`
- `public/google-sitemap.xml`
- `supabase/functions/fatorz-ai-assistant/index.ts`
- `supabase/migrations/*.sql`

## RESUMO PARA O CHATGPT

Projeto FatorZ Hub: React 19 + TypeScript 6 + Vite 8 + Supabase + Vercel APIs + Appmax.
Rotas ficam centralizadas em `src/App.tsx`.
Publicas: `/`, `/servicos`, `/servicos/:slug`, `/blog`, `/blog/:slug`, `/mapa-do-site`, `/checkout/produto`, `/checkout/academy`, `/obrigado`.
Protegidas: `/dashboard`, `/minhas-entregas`, `/configuracoes`, `/mural`, `/briefing`, `/academy`.
Admin/staff: `/admin/pedidos`, `/admin/produtos`, `/admin/assinaturas`, `/admin/usuarios`, `/admin/cursos`, `/admin/aulas`, `/admin/links`, `/projetos`.
Perfil: `App.tsx` usa `supabase.auth.getSession`, busca `profiles`, chama `rpc("is_admin")`, calcula `staff_role`.
Roles staff: `ceo_fatorz`, `diretor_operacional`, `gestor_entregas`, `criador_visual`, `suporte_fatorz`, `financeiro`, `mentor_academy`.
Supabase hardcoded no frontend em `src/lib/supabase.ts` com URL e anon key.
Tabelas principais: `profiles`, `site_products`, `site_product_orders`, `course_purchases`, `courses`, `lessons`, `lesson_progress`, `projects`, `service_briefings`, `orders`, `payments`, `clients`, `academy_links`, `ai_usage`.
Nao ha schema completo versionado no repo; so migrations recentes de protecao por trigger.
Migrations nao ativam RLS; precisam policies reais para leitura/escrita.
Checkout unificado: `ProductCheckout.tsx` -> `/api/create-product-payment` -> Appmax customer/order/payment -> `site_product_orders` -> `/obrigado`.
Pix: salva QR/copia e cola, status pending.
Boleto: salva URL/linha digitavel, status pending.
Cartao: tokeniza na Appmax, salva last4/bandeira/parcelas, nao salva numero/CVV.
`get-order-summary.ts` usa token aleatorio com hash SHA-256 salvo em `site_product_orders`.
Token de pos-compra nao expira ainda.
Webhook `appmax-webhook.ts` atualiza `site_product_orders` e `course_purchases`, e cria ponte para produto Academy.
Produto Academy precisa `category=academy`, `product_type=course`, `course_id`.
Academy libera curso por `course_purchases.status=approved` e `user_id=user.id`.
Risco: compra sem login pode criar `course_purchases.user_id=null` e nao liberar depois.
Risco critico: `Academy.tsx` busca `lessons` antes de checar acesso; RLS precisa proteger video URLs.
AdminProducts edita nome, slug, categoria, tipo, preco, checkout_provider, Pix/boleto/cartao, capa, SKU Appmax, course_id e notes.
Falta campo explicito `requires_briefing`; regra hoje e heuristica duplicada.
Pos-compra `/obrigado` mostra pagamento, proximo passo e upsell.
Briefing: `BriefingForm.tsx` exige login, valida dono por user_id/email, salva `service_briefings`.
Academy e diagnostico nao pedem briefing; servicos, sites e assessoria pedem.
MyDeliveries mostra pedidos, briefings, projetos, Pix/boleto pendente e timeline de assessoria.
AdminOrders mistura `orders` legado e `site_product_orders` novo; permite aprovar, criar projeto, ver briefing, concluir, cancelar e apagar.
Dashboard mistura tabelas antigas e novas; ha partes legado/mockadas.
`Clients.tsx` e `Finance.tsx` existem mas rotas redirecionam para dashboard.
SEO: `SEO.tsx`, `api/sitemap.ts`, `robots.txt`, blog/servicos estaticos.
Problema SEO: `robots.txt` e `google-sitemap.xml` estaticos podem divergir do dominio real e do sitemap dinamico.
Build passou apos `npm ci`.
Lint falhou com 312 problemas, principalmente `any` e React Hooks.
Bundle JS principal ~950 kB; precisa code splitting.
Principais riscos: RLS ausente/versionamento incompleto, vazamento de aulas, compra Academy sem login, dados pessoais em texto claro, idempotencia nao transacional.
Proximas tarefas: primeiro criar/validar RLS e schema; depois corrigir Academy por email/user_id; depois consolidar regra de briefing e idempotencia.
