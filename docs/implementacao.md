# Implementação de Melhorias — Cardápio Local

> **Branch:** `rychard/sugestoes-melhorias`  
> **Commit:** `a04b37a`  
> **Data:** 2026-05-13  
> **Base:** [`docs/melhorias-producao.md`](./melhorias-producao.md)

---

## Índice

1. [O Que Foi Implementado](#1-o-que-foi-implementado)
2. [Ações Manuais Necessárias Antes do Deploy](#2-ações-manuais-necessárias-antes-do-deploy)
3. [Variáveis de Ambiente Requeridas](#3-variáveis-de-ambiente-requeridas)
4. [O Que Ficou Pendente](#4-o-que-ficou-pendente)
5. [Notas de Arquitetura](#5-notas-de-arquitetura)

---

## 1. O Que Foi Implementado

### 1.1 Segurança — Auth movida para o backend

**Arquivos criados:**
- `server/api/auth/login.post.ts`
- `server/api/auth/recover.post.ts`
- `server/api/auth/update-password.post.ts`
- `server/api/auth/logout.post.ts`
- `server/api/admin/stores/me.get.ts`

**O que mudou:**

As páginas `login.vue`, `recover.vue` e `update-password.vue` não chamam mais `supabase.auth.*` diretamente do browser. Todo o fluxo de autenticação passa pelo Nitro server:

```
Antes:  browser → Supabase Auth (direto)
Depois: browser → POST /api/auth/login → Nitro → Supabase Auth
```

O composable `useAdminAuth.ts` também foi atualizado: `loadSession()` chama `GET /api/admin/stores/me` em vez de `supabase.from('stores')` direto, e `logout()` chama `POST /api/auth/logout`.

**Mensagens de erro de auth traduzidas para português:**

| Código Supabase | Mensagem exibida |
|---|---|
| `invalid_credentials` | E-mail ou senha incorretos. |
| `email_not_confirmed` | Confirme seu e-mail antes de acessar. |
| `too_many_requests` | Muitas tentativas. Aguarde alguns minutos. |

---

### 1.2 Segurança — Validação de e-mail no recover

**Arquivo:** `server/api/auth/recover.post.ts`

Antes de disparar o `resetPasswordForEmail`, o endpoint verifica se o e-mail existe via `adminClient.auth.admin.listUsers()`. Comportamento:

- ✅ E-mail encontrado → envia o link, retorna sucesso
- ❌ E-mail não encontrado → retorna `404` com mensagem: _"Nenhuma conta encontrada com este e-mail."_

> **Limitação atual:** `listUsers` busca até 1.000 usuários para fazer o filtro em memória. Para escala acima de 1.000 contas, implementar a função SQL descrita na [seção 2](#2-ações-manuais-necessárias-antes-do-deploy).

---

### 1.3 Segurança — Middleware de restrição de origem

**Arquivo:** `server/middleware/01.origin.ts`

Verifica o header `Origin` em todas as rotas `/api/*`. Requests do lado servidor (SSR do Nuxt, sem `Origin`) passam livremente.

**Configuração:** definir `ALLOWED_ORIGINS` no ambiente de produção.

```env
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com
```

Se a variável não estiver definida, o middleware é permissivo (comportamento de desenvolvimento).

---

### 1.4 Segurança — Rate limiting em endpoints sensíveis

**Arquivo:** `server/middleware/02.rateLimit.ts`

Limites por IP, janela de 1 minuto:

| Endpoint | Método | Máximo |
|---|---|---|
| `POST /api/shop/orders/create` | POST | 10 req/min |
| `POST /api/auth/login` | POST | 5 req/min |
| `POST /api/auth/recover` | POST | 3 req/min |

Retorna `HTTP 429` com header `Retry-After` quando o limite é atingido.

> **Nota:** implementação em memória — reinicia com o servidor. Para produção com múltiplas instâncias, substituir por Redis/Upstash.

---

### 1.5 Segurança — Service role corrigido

**Arquivo:** `server/api/shop/orders/create.post.ts`

Trocado de `serverSupabaseServiceRole` para `serverSupabaseClient`. A policy `orders_insert_anon: true` no Supabase já permite criação anônima, tornando o service role desnecessário e arriscado neste endpoint.

**Arquivo:** `server/api/admin/products/create.post.ts`

Substituído `createClient(url, key)` manual por `serverSupabaseServiceRole(event)` do módulo `#supabase/server` — padrão correto para não vazar a service key em bundles.

---

### 1.6 Qualidade — Validação de schema com Zod

**Arquivos criados:**
- `server/utils/validate.ts` — helpers `validateBody(event, schema)` e `validateQuery(event, schema)`

**Endpoints com Zod:**
- `POST /api/auth/login` — valida `email` (formato) + `password` (min 1 char)
- `POST /api/auth/recover` — valida `email` + `redirectTo` (URL opcional)
- `POST /api/auth/update-password` — valida `password` (min 6 chars)
- `POST /api/shop/orders/create` — schema completo com `storeId` (UUID), `items` (array não-vazio com quantity positivo), `customerWhatsapp` (regex), etc.
- `POST /api/admin/products/create` — schema com `store_id` (UUID), `name`, `price` (≥0), `image_urls` (max 5 URLs), etc.

Erros de validação retornam `HTTP 400` com mensagem descritiva: _"Dados inválidos: items.0.quantity: Number must be greater than 0"_.

---

### 1.7 Qualidade — Logger estruturado

**Arquivo:** `server/utils/logger.ts`

Logs em JSON para facilitar parsing em ferramentas externas (Axiom, Logtail, Datadog):

```json
{"level":"error","msg":"Erro ao criar pedido","ts":"2026-05-13T10:00:00.000Z","storeId":"...","error":"..."}
```

Uso:
```typescript
import { logger } from '~~/server/utils/logger'
logger.error('Erro ao criar pedido', { storeId, error: e.message })
```

---

### 1.8 Qualidade — Validação de variáveis de ambiente na startup

**Arquivo:** `server/plugins/env-check.ts`

Na inicialização do servidor Nitro, verifica se `SUPABASE_SERVICE_KEY`, `NUXT_PUBLIC_SUPABASE_URL` e `NUXT_PUBLIC_SUPABASE_ANON_KEY` estão definidas. Se faltar alguma, o processo falha imediatamente com mensagem clara — evita erros silenciosos em runtime.

---

### 1.9 Qualidade — Endpoint legado removido

Removido `server/api/orders/create.post.ts` (duplicata de `server/api/shop/orders/create.post.ts`).

---

### 1.10 Qualidade — Status HTTP corretos nos endpoints

`GET /api/admin/products/index.get.ts` e outros: erros internos agora retornam `500` em vez de `400`.

---

### 1.11 Escalabilidade — Paginação real no dashboard de produtos

**Arquivos modificados:**
- `server/repositories/product.repository.ts` — `findByStore` retorna `{ data: Product[], total: number }` com `count: 'exact'`
- `server/services/product.service.ts` — propaga o retorno
- `server/api/admin/products/index.get.ts` — retorna `{ data, total, page, limit }`, limite padrão reduzido para 20
- `layers/dashboard/app/composables/useAdminProductsList.ts` — expõe `total`, `totalPages`, `goToPage()`

**Componente criado:** `app/components/ui/Pagination.vue`

- Exibe intervalo de itens ("1–20 de 84 itens")
- Numeração com ellipsis para muitas páginas
- Botões "Anterior" / "Próxima" com estado desabilitado
- Responsivo: compacto em mobile

---

### 1.12 Escalabilidade — Carrinho persistido em localStorage

**Arquivo:** `layers/shop/app/stores/useStoreCart.ts`

Adicionado `@pinia-plugin-persistedstate/nuxt` (já instalado no `package.json`). O carrinho sobrevive a reloads da página.

Proteção contra mistura de lojas: ao chamar `addItem()` com um produto de uma loja diferente da que está no carrinho, o carrinho é limpo automaticamente antes de adicionar o novo item.

---

### 1.13 Escalabilidade — Cache Nitro nos endpoints públicos

**Arquivos:** `server/api/products/getAll.ts` e `server/api/stores/getBySlug.ts`

Ambos usam `defineCachedEventHandler` com:

| Endpoint | TTL ativo | TTL stale |
|---|---|---|
| `/api/products/getAll` | 2 minutos | 30 minutos |
| `/api/stores/getBySlug` | 5 minutos | 60 minutos |

Cache key inclui todos os parâmetros de query para evitar colisões entre lojas/filtros.

> **Invalidação:** ao salvar configurações da loja via `PUT /api/admin/stores/:id`, o cache não é invalidado automaticamente ainda — a loja ficará servindo dados antigos por até 5 minutos. Adicionar invalidação explícita é o próximo passo.

---

### 1.14 Escalabilidade — Decremento atômico de estoque

**Arquivo:** `server/repositories/order.repository.ts`

A baixa de estoque ao confirmar entrega agora usa `client.rpc('decrement_stock', { p_product_id, p_quantity })` em vez do padrão `SELECT stock → UPDATE stock - qty`. Isso elimina a race condition onde dois pedidos entregues simultaneamente poderiam ler o mesmo valor de estoque.

> **Requer ação manual:** ver [seção 2.1](#21-função-sql-decrement_stock-no-supabase).

---

### 1.15 Escalabilidade — PIX payload gerado automaticamente

**Arquivo:** `server/utils/pix.ts`

Implementação do BR Code (EMV) para PIX estático. Ao criar um pedido via `POST /api/shop/orders/create`, se a loja tiver `pix_key` cadastrada, o payload é gerado e salvo em `orders.pix_payload`.

O payload segue a especificação do Banco Central com:
- Merchant Account Info (chave PIX)
- Merchant Name e City (da loja, sanitizados)
- CRC16-CCITT para validação

O campo `orders.pix_payload` já existe no banco — nenhuma migração necessária.

---

### 1.16 UX — 404 para slug inválido

**Arquivo:** `layers/shop/app/features/showcase/composables/useStore.ts`

Ao receber um erro do `GET /api/stores/getBySlug`, o composable lança `createError({ statusCode: 404 })`, que o Nuxt trata automaticamente renderizando o `error.vue` com a mensagem _"Esta loja não foi encontrada ou está temporariamente indisponível."_

---

### 1.17 UX — SEO básico nas vitrines

**Arquivo:** `layers/shop/app/pages/[slug]/index.vue`

Adicionados ao `useHead`:

```html
<meta name="description" content="..." />
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />  <!-- logo da loja -->
<link rel="canonical" href="..." />
```

---

### 1.18 UX — Página de produtos sem chamada direta ao Supabase

**Arquivo:** `layers/dashboard/app/pages/dashboard/products/index.vue`

O carregamento de categorias para o filtro foi migrado de:

```typescript
// antes (chamada direta)
const { data } = await supabase.from('categories').select('id, name')...
```

para:

```typescript
// depois (via API)
const result = await $fetch(`/api/admin/categories?storeId=${storeId.value}`)
```

---

### 1.19 Infraestrutura — GitHub Actions CI

**Arquivo:** `.github/workflows/ci.yml`

Pipeline que roda em todo push para `main`/`develop` e em PRs:
1. Checkout
2. Setup pnpm 10 + Node 20
3. `pnpm install --frozen-lockfile`
4. `pnpm build` com as variáveis de ambiente do Supabase via GitHub Secrets

---

### 1.20 Infraestrutura — CORS e routeRules no nuxt.config.ts

Adicionado `routeRules` com cabeçalhos CORS diferenciados por tipo de rota:

- `/api/admin/**` → sem CORS (nunca deve ser chamado cross-origin)
- `/api/shop/**`, `/api/stores/**`, `/api/products/**` → métodos permitidos explícitos

---

## 2. Ações Manuais Necessárias Antes do Deploy

> Estas ações **devem** ser executadas antes de fazer deploy em produção. O build passa sem elas, mas funcionalidades específicas falharão em runtime.

---

### 2.1 Função SQL `decrement_stock` no Supabase

**Onde:** Supabase Dashboard → SQL Editor (ou Supabase CLI migrations)

**Por que:** O decremento atômico de estoque usa `client.rpc('decrement_stock', ...)`. Se a função não existir, a atualização de status para `delivered` lançará um erro `500`.

**SQL a executar:**

```sql
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_product_id;
END;
$$;
```

O arquivo já existe em `supabase/migrations/001_decrement_stock.sql` — pode ser aplicado via Supabase CLI:

```bash
supabase db push
# ou manualmente no SQL Editor do dashboard
```

---

### 2.2 Configurar variáveis de ambiente na plataforma de deploy

Além das variáveis já existentes, adicionar:

| Variável | Descrição | Exemplo |
|---|---|---|
| `ALLOWED_ORIGINS` | Domínios autorizados a chamar a API, separados por vírgula | `https://seudominio.com,https://www.seudominio.com` |

> Sem `ALLOWED_ORIGINS`, o middleware de origem é permissivo. Definir em produção é obrigatório para o bloqueio funcionar.

---

### 2.3 Configurar GitHub Secrets para o CI

Para o workflow `.github/workflows/ci.yml` rodar o build com sucesso, adicionar no repositório GitHub (`Settings → Secrets → Actions`):

| Secret | Descrição |
|---|---|
| `NUXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon pública |
| `SUPABASE_SERVICE_KEY` | Service role key (nunca expor publicamente) |

---

### 2.4 Instalar módulo de persistência do Pinia no nuxt.config.ts

O `@pinia-plugin-persistedstate/nuxt` já foi adicionado ao `nuxt.config.ts` e ao `package.json`. Verificar que o módulo está listado na ordem correta:

```typescript
// nuxt.config.ts
modules: [
  '@pinia/nuxt',
  '@pinia-plugin-persistedstate/nuxt', // deve vir DEPOIS do @pinia/nuxt
  ...
]
```

---

### 2.5 Revisar e habilitar o rate limiting para múltiplas instâncias (se aplicável)

A implementação atual usa um `Map` em memória no processo Node. Se o deploy usar múltiplas instâncias (ex: Vercel com serverless functions), cada instância tem seu próprio mapa — o rate limit não é compartilhado.

**Solução para múltiplas instâncias:** substituir o `Map` por uma storage compartilhada. Exemplo com Upstash Redis via `unstorage`:

```bash
pnpm add unstorage @upstash/redis
```

```typescript
// server/middleware/02.rateLimit.ts
import { createStorage } from 'unstorage'
import redisDriver from 'unstorage/drivers/redis'

const store = createStorage({ driver: redisDriver({ url: process.env.REDIS_URL }) })
```

Adicionar `REDIS_URL` nas variáveis de ambiente.

---

## 3. Variáveis de Ambiente Requeridas

Lista consolidada de todas as variáveis de ambiente para produção:

```env
# ── Supabase (obrigatórias) ────────────────────────────────────────────────
NUXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...          # NUNCA prefixar com NUXT_PUBLIC_

# ── Segurança (obrigatória em produção) ────────────────────────────────────
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com

# ── Rate limiting distribuído (opcional, para múltiplas instâncias) ────────
# REDIS_URL=redis://...
```

---

## 4. O Que Ficou Pendente

Os itens abaixo estão documentados em [`docs/melhorias-producao.md`](./melhorias-producao.md) mas não foram implementados nesta fase. Organizados por prioridade.

---

### 4.1 [ALTO] Testes automatizados

Nenhum teste foi configurado. Setup recomendado:

- **`vitest`** para unitários (`app/utils/`, serviços, repositories)
- **`@nuxt/test-utils`** para componentes Vue
- **`playwright`** para E2E (fluxo de checkout, login)

Comandos a adicionar no `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

---

### 4.2 [ALTO] PIX — exibir QR Code na tela de confirmação do pedido

O payload PIX já é **gerado e salvo** no banco (`orders.pix_payload`) ao criar o pedido. O que falta é exibir o QR Code e o código copia-e-cola para o cliente na tela de confirmação.

**O que implementar:**
- Na página de acompanhamento do pedido (`/[slug]/order/[id]` ou equivalente), buscar `order.pixPayload` e renderizar:
  - Código copia-e-cola (texto)
  - QR Code (usar lib `qrcode` ou `vue-qrcode`)

```bash
pnpm add qrcode
```

---

### 4.3 [ALTO] Role `editor` não implementado

`StoreRole = 'owner' | 'editor'` existe nos tipos e na tabela `store_members`, mas todos os membros agem como `owner`. Um editor pode deletar a loja.

**O que implementar:**
- Endpoint `GET /api/admin/stores/me` já retorna as lojas — adicionar o `role` do usuário na resposta
- Nos endpoints destrutivos (`DELETE /api/admin/stores/:id`, gerenciamento de membros), verificar `role === 'owner'`
- Na UI, ocultar ações restritas ao `owner` para editores

---

### 4.4 [MÉDIO] Invalidação de cache ao salvar configurações da loja

Quando o lojista salva configurações em `PUT /api/admin/stores/:id`, o cache do `GET /api/stores/getBySlug` ainda serve a versão antiga por até 5 minutos.

**O que implementar:**
```typescript
// server/api/admin/stores/[id]/index.put.ts — após atualizar:
await useStorage('cache').removeItem(`nitro:handlers:store:slug:${store.slug}`)
```

---

### 4.5 [MÉDIO] Monitoramento de erros em produção (Sentry)

Erros não tratados em produção passam despercebidos. Integrar Sentry:

```bash
pnpm add @sentry/nuxt
```

```typescript
// nuxt.config.ts
modules: ['@sentry/nuxt/module'],
sentry: { dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 }
```

Adicionar `SENTRY_DSN` nas variáveis de ambiente.

---

### 4.6 [MÉDIO] Paginação na listagem de pedidos

A página `dashboard/orders/index.vue` ainda carrega todos os pedidos de uma vez. Para lojas com alto volume, isso se torna lento.

**O que implementar:**
- Adicionar `page` e `limit` ao `GET /api/admin/orders`
- Atualizar `order.repository.ts → getOrdersByStore()` para usar `.range()`
- Adicionar paginação na página com o componente `UiPagination` já criado

---

### 4.7 [MÉDIO] Race condition no rate limiting (múltiplas instâncias)

Ver [seção 2.5](#25-revisar-e-habilitar-o-rate-limiting-para-múltiplas-instâncias-se-aplicável).

---

### 4.8 [MÉDIO] Validação de e-mail no recover para +1.000 usuários

O `listUsers` atual busca no máximo 1.000 usuários. Para escala maior, criar a função SQL:

```sql
CREATE OR REPLACE FUNCTION public.email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = p_email);
END;
$$;
```

E substituir no `server/api/auth/recover.post.ts`:
```typescript
// Trocar listUsers por:
const { data } = await adminClient.rpc('email_exists', { p_email: body.email })
if (!data) throw createError({ statusCode: 404, ... })
```

---

### 4.9 [BAIXO] Confirmação de e-mail de usuário novo

Ao criar conta, se o usuário tentar logar sem confirmar o e-mail, o erro `email_not_confirmed` é mapeado para português. O que falta:

- Exibir botão "Reenviar e-mail de confirmação" quando esse erro ocorrer no login
- Criar `POST /api/auth/resend-confirmation`

---

### 4.10 [BAIXO] Fluxo de cadastro de lojista

Não há página `register.vue`. Novos lojistas são criados manualmente no Supabase.

**Definir:** o modelo de negócio é self-service ou onboarding curado? Se self-service, criar o fluxo de registro é bloqueante para escalar aquisição.

---

### 4.11 [BAIXO] Slug com validação em tempo real

O campo slug nas configurações está atualmente `disabled`. Quando for habilitado para edição, adicionar:

- Endpoint `GET /api/admin/stores/check-slug?slug=&excludeId=`
- Debounced validation no input com ✅/❌ inline

---

### 4.12 [BAIXO] Índices de banco não verificados

Os índices recomendados em `docs/melhorias-producao.md` (seção 3.3) não foram criados — dependem de auditoria no Supabase Dashboard. Verificar e criar via SQL Editor:

```sql
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_categories_store_sort ON categories(store_id, sort_order);
```

---

## 5. Notas de Arquitetura

### Por que o login continua usando o cliente Supabase no frontend para leitura de sessão?

O `useSupabaseUser()` e `useSupabaseClient()` ainda são usados em alguns pontos do dashboard (middleware `adminAuth.global.ts`, por exemplo) para **ler** a sessão ativa — não para **escrevê-la**. Isso é o comportamento esperado do módulo `@nuxtjs/supabase`: a sessão é gerenciada via cookies pelo servidor, e o cliente reativo é apenas um mirror. A escrita da sessão (login, logout, reset) foi movida para o backend.

### Por que `serverSupabaseServiceRole` e não `createClient` manual?

O padrão correto no Nuxt é usar `serverSupabaseServiceRole(event)` do módulo `#supabase/server`. Isso garante que a `SUPABASE_SERVICE_KEY` é lida das variáveis de ambiente do servidor e nunca incluída no bundle do cliente. Usar `createClient(url, key)` diretamente (como estava em `admin/products/create.post.ts`) cria o risco de tree-shaking incorreto expor a chave.

### Por que o cache Nitro e não Redis?

Para o estágio atual (SaaS em early-stage, baixo tráfego), o cache Nitro em memória/filesystem é suficiente e sem dependências externas. Para múltiplas instâncias ou tráfego alto, trocar o driver:

```typescript
// nuxt.config.ts
nitro: {
  storage: {
    cache: { driver: 'redis', url: process.env.REDIS_URL }
  }
}
```

### O arquivo `supabase/migrations/` é informativo ou funcional?

Por ora, é **informativo** — o projeto não usa Supabase CLI para migrations automatizadas. O arquivo `001_decrement_stock.sql` documenta o SQL que precisa ser executado manualmente. Para adotar migrations gerenciadas, inicializar o Supabase CLI no projeto:

```bash
pnpm add -D supabase
npx supabase init
npx supabase db push
```
