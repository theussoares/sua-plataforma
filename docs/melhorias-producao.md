# Melhorias para Produção — Cardápio Local

> **Gerado em:** 2026-05-12  
> **Base:** Análise completa da codebase + documentação técnica existente  
> **Escopo:** Segurança, escalabilidade, qualidade de código, testes e usabilidade

---

## Índice

1. [Segurança](#1-segurança)
2. [Qualidade de Código](#2-qualidade-de-código)
3. [Escalabilidade](#3-escalabilidade)
4. [Testes](#4-testes)
5. [Usabilidade (UX)](#5-usabilidade-ux)
6. [Infraestrutura & Deploy](#6-infraestrutura--deploy)
7. [Features Incompletas que Bloqueiam Produção](#7-features-incompletas-que-bloqueiam-produção)

---

## 1. Segurança

### 1.1 [CRÍTICO] Front-end chamando Supabase diretamente

**Problema:** `login.vue` e `recover.vue` chamam `supabase.auth.*` direto do cliente. Isso expõe a lógica de autenticação no browser, contorna qualquer validação server-side futura (rate limit, logging, auditoria) e viola o princípio de que o front nunca deve ter acesso privilegiado ao Supabase.

```typescript
// recover.vue — atual (problemático)
const { error } = await supabase.auth.resetPasswordForEmail(email.value, { ... })

// login.vue — atual (problemático)
const { error } = await supabase.auth.signInWithPassword({ email, password })
```

**Solução:** Criar endpoints no backend para autenticação:

- `POST /api/auth/login` → chama Supabase server-side, retorna session via cookie httpOnly
- `POST /api/auth/recover` → valida se e-mail existe, depois dispara o reset (ver 1.2)
- `POST /api/auth/update-password` → recebe token + nova senha, atualiza server-side
- `POST /api/auth/logout` → invalida sessão

O front passa a fazer `$fetch('/api/auth/login', { body })` — nenhuma dependência do SDK do Supabase no cliente para auth.

---

### 1.2 [CRÍTICO] Recuperação de senha sem validação de e-mail existente

**Problema:** `recover.vue` chama `resetPasswordForEmail` e, independente de o e-mail existir ou não na base, o Supabase retorna `error = null` (comportamento intencional para evitar user enumeration por atacantes). O resultado: o usuário vê "Verifique sua caixa de entrada" e fica esperando um e-mail que nunca chega.

**Solução:** No endpoint `POST /api/auth/recover` (criado no item 1.1), antes de disparar o reset:

```typescript
// server/api/auth/recover.post.ts
const { data: users } = await adminClient.auth.admin.listUsers()
const exists = users.users.some(u => u.email === body.email)

if (!exists) {
  throw createError({ statusCode: 404, statusMessage: 'Nenhuma conta encontrada com este e-mail.' })
}

await adminClient.auth.resetPasswordForEmail(body.email, { redirectTo: ... })
```

O front então exibe mensagem de erro clara: _"Nenhuma conta encontrada com este e-mail."_

---

### 1.3 [CRÍTICO] Sem restrição de origem nas chamadas à API

**Problema:** Qualquer pessoa pode chamar `POST /api/shop/orders/create` ou `GET /api/products/getAll` de qualquer origem, incluindo bots, scrapers e abusadores.

**Solução em duas camadas:**

**Camada 1 — Middleware Nitro (aplicação):**

```typescript
// server/middleware/origin.ts
export default defineEventHandler((event) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',')
  const origin = getHeader(event, 'origin') ?? ''
  
  if (isApiRoute(event) && !allowedOrigins.includes(origin)) {
    throw createError({ statusCode: 403, statusMessage: 'Origem não autorizada.' })
  }
})
```

Variável de ambiente: `ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com`

**Camada 2 — Cloudflare (infraestrutura):** Configurar WAF rule para bloquear requests sem `Origin` ou `Referer` no header, ou com User-Agent suspeito. Isso protege antes de o request chegar ao servidor Node.

---

### 1.4 [ALTO] Sem rate limiting nos endpoints públicos

**Problema:** `POST /api/shop/orders/create` não tem proteção contra flood. Um atacante pode criar milhares de pedidos falsos, poluindo o painel do lojista e gerando notificações WhatsApp ininterruptas.

**Solução:** Implementar rate limiting no Nitro com `unstorage` (já disponível no Nitro):

```typescript
// server/middleware/rateLimit.ts
// Limitar por IP: max 10 pedidos/minuto por IP
// Limitar por storeId: max 30 pedidos/minuto por loja
```

Alternativa mais simples: usar o rate limiting nativo do Cloudflare (5 requests/minuto por IP para a rota `/api/shop/orders/create`).

---

### 1.5 [ALTO] Service Role usado onde não é necessário

**Problema:** `POST /api/shop/orders/create` usa `serverSupabaseServiceRole` (acesso irrestrito ao banco) para criar pedidos. O RLS já tem `orders_insert_anon: true`, então um client anônimo normal funcionaria. Usar service role desnecessariamente amplia a superfície de risco se houver um bug de lógica no handler.

**Solução:** Usar `serverSupabaseClient` para a criação do pedido (cliente anônimo). Reservar service role apenas para operações que genuinamente precisam contornar RLS (ex: decrementar estoque ao entregar).

---

### 1.6 [ALTO] Sem validação de schema nos endpoints (ausência de Zod)

**Problema:** Os endpoints validam campos manualmente (`if (!body.storeId || !body.items.length === 0)`). Isso é frágil: campos com tipos errados (ex: `price: "abc"`, `quantity: -1`) chegam ao banco sem rejeição, podendo causar comportamentos inesperados ou corrupção de dados.

**Solução:** Adicionar Zod como dependência e criar schemas para todos os endpoints que recebem body:

```typescript
// Exemplo: server/api/shop/orders/create.post.ts
import { z } from 'zod'

const CreateOrderSchema = z.object({
  storeId: z.string().uuid(),
  customerName: z.string().min(2).max(100),
  customerWhatsapp: z.string().regex(/^\d{10,15}$/),
  deliveryMethod: z.enum(['home', 'pickup']),
  address: z.string().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    priceAtTime: z.number().nonnegative(),
    selectedSpecs: z.record(z.union([z.string(), z.array(z.string())]))
  })).min(1),
  subtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().nonnegative(),
})
```

Criar um helper `validateBody(event, schema)` para ser reutilizado em todos os handlers.

---

### 1.7 [MÉDIO] RLS policies com lacunas de segurança

**Problemas identificados na documentação do banco:**

- `categories_select_public`: SELECT público com `true` — qualquer pessoa pode listar categorias de qualquer loja (incluindo lojas soft-deletadas). Deveria filtrar `stores.deleted_at IS NULL`.
- `orders_insert_anon: true` + `Public View Order Status: true` — qualquer pessoa pode ver qualquer pedido pelo ID. Para um SaaS com pedidos sensíveis (nome + WhatsApp do cliente), considerar exigir pelo menos o WhatsApp do cliente para consultar o status.
- `products_insert_owner`: usa `store_id IN (stores WHERE owner_id = auth.uid())` — correto, mas se `store_members` com role `editor` precisar criar produtos, essa policy bloqueia. Alinhar com a implementação do role `editor` (ver item 7.1).

---

### 1.8 [MÉDIO] Mensagens de erro vazam detalhes internos

**Problema:** O padrão de catch nos endpoints repassa `error.message` diretamente para o cliente:

```typescript
throw createError({ statusCode: error.statusCode || 400, statusMessage: error.message })
```

Erros internos do Supabase (ex: mensagens PostgreSQL, stack traces) podem vazar via `statusMessage`.

**Solução:** Distinguir erros de negócio (seguros de retornar) de erros internos (logar, retornar mensagem genérica):

```typescript
if (error instanceof AppError) {
  throw createError({ statusCode: 400, statusMessage: error.message }) // seguro
} else {
  console.error('[API Error]', error) // log interno
  throw createError({ statusCode: 500, statusMessage: 'Erro interno. Tente novamente.' })
}
```

---

### 1.9 [MÉDIO] Upload de imagens sem validação de tipo e tamanho

**Problema:** O campo `image_urls` armazena URLs do Supabase Storage, mas não há nenhuma validação server-side de tipo de arquivo (pode subir qualquer coisa) ou tamanho máximo por produto.

**Solução:** Configurar Storage policies no Supabase:
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`
- Tamanho máximo: 5MB por arquivo
- Máximo de imagens por produto: 5 (sugerido)

Validar no endpoint `PUT /api/admin/products/:id` se as URLs enviadas pertencem ao bucket correto do Storage (evitar que o lojista aponte para URLs externas arbitrárias).

---

## 2. Qualidade de Código

### 2.1 Endpoint legado duplicado

**Problema:** Existe `server/api/orders/create.post.ts` (legado) além de `server/api/shop/orders/create.post.ts`. Dois endpoints fazendo a mesma coisa criam risco de manutenção divergente.

**Solução:** Remover o endpoint legado. Se houver clientes apontando para ele, retornar `410 Gone` com instrução de atualizar para o novo endpoint.

---

### 2.2 Hardcoded no código de produção

**Problema:** `docs/showcase.md` menciona número de WhatsApp hardcoded `+5567992171768` para testes. Verificar se esse número persiste em algum arquivo `.vue` além da documentação.

**Ação:** Grep no codebase por esse número. Se encontrado em código, substituir pelo valor dinâmico da store (`store.whatsapp`).

---

### 2.3 Status HTTP incorreto nos erros

**Problema:** Vários endpoints retornam `400` para erros que deveriam ser `500`:

```typescript
// server/api/products/getAll.ts
throw createError({ statusCode: 400, statusMessage: error.message }) // erro de banco → 400?
```

**Solução:** Mapear corretamente:
- `400`: Input inválido (validação de schema)
- `401`: Não autenticado
- `403`: Autenticado mas sem permissão
- `404`: Recurso não encontrado
- `409`: Conflito (slug duplicado, etc.)
- `422`: Dados semânticamente inválidos
- `429`: Rate limit
- `500`: Erro interno inesperado

---

### 2.4 `useAdminProductsList` com limite default de 100

**Problema:** O endpoint `GET /api/admin/products` tem `limit` default de 100 para o admin. Com um lojista `pro` (500 produtos) ou `enterprise` (ilimitado), isso vai gerar queries pesadas e respostas lentas.

**Solução:** Padronizar para `limit: 20` com paginação real (ver 3.1). O admin não precisa de todos os produtos ao mesmo tempo.

---

### 2.5 Tipo `Record<string, any>` em `specs_snapshot`

**Problema:** `DbOrderItem.specs_snapshot: Record<string, any>` usa `any`, perdendo a segurança de tipos para snapshots de variações.

**Solução:** Tipar como `Record<string, string | string[]>` (consistente com `CartItem.selectedSpecs`).

---

### 2.6 Ausência de variáveis de ambiente validadas na startup

**Problema:** Se `SUPABASE_SERVICE_KEY` ou `NUXT_PUBLIC_SUPABASE_URL` não estiverem definidas, o erro só aparece em runtime na primeira request que precisar delas.

**Solução:** Validar na inicialização do servidor:

```typescript
// server/plugins/env-check.ts
export default defineNitroPlugin(() => {
  const required = ['SUPABASE_SERVICE_KEY', 'NUXT_PUBLIC_SUPABASE_URL', 'NUXT_PUBLIC_SUPABASE_ANON_KEY']
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Variável de ambiente obrigatória ausente: ${key}`)
  }
})
```

---

## 3. Escalabilidade

### 3.1 Paginação incompleta nos CRUDs

**Problema:** A paginação existe nos endpoints mas a UI do dashboard não implementa navegação entre páginas — a lista de produtos e pedidos carrega apenas a primeira página e não expõe controles para avançar.

**Solução:** Implementar paginação completa nas páginas:

- `/dashboard/products`: paginação com offset (ou cursor-based para performance melhor)
- `/dashboard/orders`: paginação + filtro por status (hoje provavelmente carrega todos os pedidos de uma vez)

**Layout:** Componente `Pagination.vue` compartilhado, responsivo (mobile: "anterior/próximo"; desktop: numeração). O endpoint já suporta `page` e `limit` — falta apenas o componente de UI.

---

### 3.2 Vitrine sem cache de dados

**Problema:** Cada acesso à vitrine (`/[slug]`) faz duas queries ao banco: `getBySlug` (loja + categorias) e `getAll` (produtos). Para uma loja com tráfego, isso gera carga desnecessária no Supabase.

**Solução:** Usar o cache do Nitro para as rotas públicas da vitrine:

```typescript
// server/api/stores/getBySlug.ts
export default defineCachedEventHandler(async (event) => {
  // ... lógica atual
}, {
  maxAge: 60 * 5, // 5 minutos
  staleMaxAge: 60 * 60, // serve stale por 1h enquanto revalida
  getKey: (event) => `store:${getQuery(event).slug}`,
})
```

Invalidar o cache ao salvar configurações da loja no `PUT /api/admin/stores/:id`.

---

### 3.3 Índices de banco ausentes (inferidos)

**Queries mais frequentes que provavelmente não têm índice:**

| Tabela | Coluna(s) | Query que usa |
|---|---|---|
| `products` | `(store_id, active, deleted_at)` | Listagem da vitrine |
| `orders` | `(store_id, created_at DESC)` | Dashboard de pedidos |
| `orders` | `(store_id, status)` | Filtro por status |
| `categories` | `(store_id, sort_order)` | Listagem de categorias |
| `stores` | `slug` | Lookup por slug (já tem UNIQUE, mas confirmar) |

**Ação:** Auditoria de índices no Supabase Dashboard (`Database > Indexes`). Criar os faltantes via migration.

---

### 3.4 Carrinho sem persistência entre sessões

**Problema:** O `useStoreCart` é Pinia em memória — ao recarregar a página, o carrinho se perde. Em mobile com refresh acidental ou troca de aba, o cliente perde todo o carrinho.

**Solução:** Persistir o carrinho em `localStorage` com `pinia-plugin-persistedstate`:

```typescript
// stores/useStoreCart.ts
export const useStoreCart = defineStore('storeCart', () => { ... }, {
  persist: {
    key: (id) => `cart-${storeSlug}`, // chave por slug para não misturar carrinhos de lojas diferentes
    storage: localStorage,
  }
})
```

**Atenção:** Limpar o carrinho se o `storeId` do item salvo não corresponder à loja atual (cliente abrindo outra vitrine).

---

### 3.5 Baixa de estoque sem proteção contra concorrência

**Problema:** A baixa de estoque ocorre ao mudar status para `delivered`:

```typescript
// Lê estoque atual → decrementa
// Entre o SELECT e o UPDATE, outro processo pode ler o mesmo valor
```

Isso é uma race condition: dois pedidos entregues simultaneamente podem ambos ler `stock = 1` e ambos escreverem `stock = 0`, quando o correto seria `stock = -1` (ou erro de estoque insuficiente).

**Solução:** Usar decremento atômico no banco:

```sql
UPDATE products SET stock = stock - $quantity 
WHERE id = $id AND stock >= $quantity
RETURNING stock
```

Se `RETURNING` retornar vazio, o estoque era insuficiente → tratar como erro ou logar como alerta.

---

## 4. Testes

### 4.1 Ausência total de testes

O projeto não tem nenhum teste configurado (`package.json` sem scripts de teste). Para produção, o mínimo viável é:

**Tier 1 — Unitários (rápidos, sem I/O):**
- `app/utils/errors.ts`: `unwrap`, `handleSupabaseError`, `AppError`
- `app/utils/currency.ts`: `formatCurrency`
- `app/utils/product.ts`: `calculateItemUnitPrice`, `getEffectivePrice`
- `app/types/app.ts`: `getEffectivePrice` (função exportada)

**Tier 2 — Integração (com banco de teste):**
- Repositories: CRUD de products, orders, categories contra um Supabase local (via `supabase start`)
- Endpoints críticos: `POST /api/shop/orders/create`, `PATCH /api/admin/orders/:id/status`

**Tier 3 — E2E (Playwright):**
- Fluxo completo de checkout: abrir vitrine → adicionar produto → preencher dados → confirmar pedido
- Login e navegação básica no dashboard

**Setup recomendado:**
- `vitest` para unitários e integração (compatível com Nuxt/Nitro, sem config complexa)
- `@nuxt/test-utils` para testes de componentes Vue
- `playwright` para E2E

**Onde criar:** `tests/unit/`, `tests/integration/`, `tests/e2e/`

---

## 5. Usabilidade (UX)

### 5.1 Recuperação de senha com feedback enganoso

**(Já coberto em 1.2)** — O bug de UX: usuário vê mensagem de sucesso mesmo quando o e-mail não existe. Após a correção do item 1.2, exibir:
- ✅ E-mail encontrado: "Link enviado! Verifique sua caixa de entrada e pasta de spam."
- ❌ E-mail não encontrado: "Nenhuma conta encontrada com este e-mail."

---

### 5.2 Mensagens de erro do Supabase em inglês

**Problema:** `login.vue` exibe `error.message` direto do SDK do Supabase: _"Invalid login credentials"_, _"Email not confirmed"_ — em inglês.

**Solução:** Mapear os códigos de erro no backend para mensagens em português:

```typescript
const supabaseAuthErrors: Record<string, string> = {
  'invalid_credentials': 'E-mail ou senha incorretos.',
  'email_not_confirmed': 'Confirme seu e-mail antes de acessar.',
  'too_many_requests': 'Muitas tentativas. Aguarde alguns minutos.',
}
```

---

### 5.3 Vitrine sem página 404 para slug inválido

**Problema:** Acessar `/slug-que-nao-existe` provavelmente resulta em erro não tratado ou tela em branco.

**Solução:** No `[slug]/index.vue`, ao receber erro 404 do endpoint `getBySlug`, renderizar uma página amigável:
_"Esta loja não foi encontrada ou está temporariamente indisponível."_

---

### 5.4 Sem feedback de loading em operações do dashboard

**Problema:** Ações como deletar produto, salvar configurações, ou mudar status de pedido não têm estado de loading visual consistente — o botão pode ser clicado múltiplas vezes.

**Solução:** Padrão consistente: ao iniciar qualquer operação assíncrona, desabilitar o botão e exibir spinner. O composable de cada operação deve expor `loading: Ref<boolean>`.

---

### 5.5 Ausência de confirmação antes de ações destrutivas

**Problema:** Deletar um produto ou cancelar um pedido aparentemente não exige confirmação do usuário.

**Solução:** Usar o `BaseModal.vue` existente como modal de confirmação para:
- Deletar produto: _"Tem certeza? Esta ação não pode ser desfeita."_
- Cancelar pedido: _"Confirmar cancelamento do pedido #XXXX?"_

---

### 5.6 Slug sem validação em tempo real nas configurações

**Problema:** O lojista edita o slug da loja nas configurações e só descobre que o slug já existe quando tenta salvar (erro 409 do banco). Em slugs similares, o erro pode ser frustrante.

**Solução:** Input de slug com debounced validation:

```typescript
// Ao digitar, aguardar 500ms e chamar:
GET /api/admin/stores/check-slug?slug=novo-slug&excludeId=store-id-atual
// Retorna: { available: boolean }
```

Exibir ✅/❌ inline ao lado do input enquanto o usuário digita.

---

### 5.7 Ausência de SEO básico nas vitrines

**Problema:** As páginas `/[slug]` não têm meta tags adequadas para SEO e compartilhamento social, prejudicando o alcance orgânico dos lojistas.

**Solução:** Usar `useHead` em `[slug]/index.vue`:

```typescript
useHead({
  title: `${store.name} — Cardápio`,
  meta: [
    { name: 'description', content: store.description ?? `Conheça o cardápio de ${store.name}` },
    { property: 'og:title', content: store.name },
    { property: 'og:image', content: store.logoUrl ?? '/og-default.png' },
    { property: 'og:url', content: `https://seudominio.com/${store.slug}` },
  ]
})
```

---

### 5.8 Validação de WhatsApp frágil

**Problema:** O campo `customer_whatsapp` no checkout recebe qualquer string. O `useCheckout.sanitizePhone` adiciona DDI 55, mas não valida se o número é válido (formato, DDD existente, etc.).

**Solução:** Validar com regex no frontend E no backend (Zod):

```typescript
// Aceitar: (11) 99999-9999, 11999999999, +5511999999999
const whatsappRegex = /^(\+55)?(\d{2})(\d{8,9})$/
```

Exibir erro inline no formulário de checkout antes de submeter.

---

## 6. Infraestrutura & Deploy

### 6.1 Sem pipeline de CI/CD

**Situação atual:** Sem nenhum CI configurado (sem `.github/workflows/`).

**Solução mínima (GitHub Actions):**

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      # Após adicionar testes:
      # - run: pnpm test
```

Deploy automático no merge para `main` via Vercel/Netlify integration (zero config).

---

### 6.2 Sem logging estruturado

**Problema:** Os `console.error` espalhados nos handlers não têm estrutura consistente (sem request ID, sem contexto de tenant, sem timestamp).

**Solução:** Centralizar logging com um wrapper simples:

```typescript
// server/utils/logger.ts
export const logger = {
  error: (msg: string, ctx?: Record<string, unknown>) => 
    console.error(JSON.stringify({ level: 'error', msg, ts: new Date().toISOString(), ...ctx })),
  warn: (msg: string, ctx?: Record<string, unknown>) => 
    console.warn(JSON.stringify({ level: 'warn', msg, ts: new Date().toISOString(), ...ctx })),
}

// Uso nos handlers:
logger.error('Erro ao criar pedido', { storeId: body.storeId, error: e.message })
```

Em produção, direcionar os logs para um agregador (Axiom, Logtail, Datadog — todos têm integração com Vercel/Railway).

---

### 6.3 Sem monitoramento de erros em produção

**Solução:** Integrar Sentry (free tier suficiente para começar):

```typescript
// nuxt.config.ts
modules: ['@sentry/nuxt/module'],
sentry: {
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% de requests monitorados
}
```

Captura automaticamente erros não tratados no servidor e no cliente.

---

### 6.4 Ausência de configuração de CORS explícita no Nitro

**Problema:** O `nuxt.config.ts` não define `routeRules` com cabeçalhos CORS. O Nitro serve os endpoints sem `Access-Control-Allow-Origin` explícito.

**Solução:**

```typescript
// nuxt.config.ts
routeRules: {
  '/api/admin/**': { cors: false },  // nunca deve ser chamado cross-origin
  '/api/shop/**': { 
    headers: { 
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS ?? '',
      'Access-Control-Allow-Methods': 'GET,POST',
    }
  },
  '/api/stores/**': { headers: { 'Access-Control-Allow-Origin': '*' } },  // público
  '/api/products/**': { headers: { 'Access-Control-Allow-Origin': '*' } },
}
```

---

### 6.5 `NUXT_PUBLIC_*` expõe chave anon publicamente

**Observação:** A chave `SUPABASE_ANON_KEY` prefixada com `NUXT_PUBLIC_` é enviada ao bundle do cliente — isso é **intencional** para o módulo `@nuxtjs/supabase` funcionar. Mas após mover autenticação para o backend (item 1.1), a maioria das operações não precisará mais do cliente Supabase no front. Avaliar se é possível remover a anon key do bundle público por completo, usando apenas server-side client.

---

## 7. Features Incompletas que Bloqueiam Produção

### 7.1 Role `editor` definido mas não implementado

**Situação:** `StoreRole = 'owner' | 'editor'` existe nos tipos e na tabela `store_members`, mas a lógica de acesso não distingue roles — qualquer membro age como owner.

**Impacto:** Se o sistema for multi-usuário (lojista + atendente), o atendente pode deletar a loja.

**Solução:** Implementar guards por role nos endpoints críticos:
- Deletar loja: apenas `owner`
- Gerenciar membros: apenas `owner`
- Editar produtos/categorias: `owner` ou `editor`

---

### 7.2 PIX payload não implementado

**Situação:** O campo `pix_payload` existe na tabela `orders` e no tipo `DbOrder`, mas a documentação indica `"não implementado"`. O lojista tem `pix_key` configurada mas o cliente não recebe um QR Code ou código copia-e-cola.

**Impacto:** Para lojistas que querem pagamento via PIX, o fluxo está incompleto — o cliente precisa copiar a chave PIX manualmente do WhatsApp.

**Solução:** Ao criar o pedido no `POST /api/shop/orders/create`, se a loja tiver `pix_key`:
1. Gerar payload PIX estático (BR Code) usando biblioteca como `pix-payload` (npm)
2. Salvar em `orders.pix_payload`
3. Retornar no pedido para o frontend exibir QR Code na tela de confirmação

---

### 7.3 Confirmação de e-mail de usuário novo não tratada

**Problema:** Ao criar conta no Supabase Auth, o usuário recebe e-mail de confirmação. Se tentar logar antes de confirmar, o erro retornado é `"Email not confirmed"` — e a mensagem chega em inglês (ver 5.2). Além disso, não há UI de "reenviar e-mail de confirmação".

**Solução:**
- Mapear o erro para português
- Exibir link/botão "Reenviar e-mail de confirmação" quando esse erro ocorrer
- Backend: `POST /api/auth/resend-confirmation`

---

### 7.4 Ausência de página de criação de conta

**Situação:** Não há página `register.vue` no dashboard. Novos lojistas precisam ser criados manualmente no Supabase ou via convite.

**Definir:** Isso é intencional (onboarding manual/curado) ou é uma feature a implementar? Se o modelo de negócio for self-service, criar o fluxo de cadastro é bloqueante para produção.

---

### 7.5 Número de WhatsApp hardcoded em arquivo de código

**Situação:** Conforme `docs/showcase.md`, o número `+5567992171768` foi usado em testes. Verificar se ainda está presente em algum arquivo `.vue` ou `.ts` do projeto.

**Ação imediata:**

```bash
grep -r "5567992171768" layers/ server/ app/
```

Se encontrado, remover e garantir que o número vem de `store.whatsapp`.

---

## Resumo de Prioridades

| # | Item | Severidade | Esforço |
|---|------|-----------|---------|
| 1.1 | Auth direto no front-end | 🔴 Crítico | Alto |
| 1.2 | E-mail de recuperação enganoso | 🔴 Crítico | Baixo |
| 1.3 | Sem restrição de origem | 🔴 Crítico | Médio |
| 1.4 | Sem rate limiting | 🔴 Crítico | Médio |
| 1.6 | Sem validação Zod | 🟠 Alto | Alto |
| 1.5 | Service role desnecessário | 🟠 Alto | Baixo |
| 3.1 | Paginação sem UI | 🟠 Alto | Médio |
| 3.4 | Carrinho sem persistência | 🟠 Alto | Baixo |
| 5.1 | UX de recuperação de senha | 🟠 Alto | Baixo |
| 5.2 | Erros em inglês | 🟠 Alto | Baixo |
| 7.2 | PIX não implementado | 🟠 Alto | Alto |
| 4.1 | Sem testes | 🟡 Médio | Alto |
| 3.2 | Sem cache na vitrine | 🟡 Médio | Médio |
| 3.5 | Race condition no estoque | 🟡 Médio | Baixo |
| 5.3 | 404 para slug inválido | 🟡 Médio | Baixo |
| 5.7 | Sem SEO nas vitrines | 🟡 Médio | Baixo |
| 6.1 | Sem CI/CD | 🟡 Médio | Médio |
| 6.3 | Sem Sentry | 🟡 Médio | Baixo |
| 7.1 | Role editor não implementado | 🟡 Médio | Médio |
| 2.1 | Endpoint legado duplicado | 🟢 Baixo | Baixo |
| 2.6 | Env vars sem validação startup | 🟢 Baixo | Baixo |
| 5.6 | Slug sem validação tempo real | 🟢 Baixo | Médio |
