# Documentação Técnica — Cardápio Local

> **Última atualização:** 2026-05-11  
> **Mantenedor:** Time de Engenharia  
> Revisar a cada 2 semanas ou sempre que uma nova feature for adicionada.

---

## Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Tipagem TypeScript Completa](#2-tipagem-typescript-completa)
3. [Estrutura de Pastas Anotada](#3-estrutura-de-pastas-anotada)
4. [Fluxos de Autenticação](#4-fluxos-de-autenticação)
5. [Comunicação Front-End ↔ Back-End](#5-comunicação-front-end--back-end)
6. [Autenticação & Autorização](#6-autenticação--autorização)
7. [Banco de Dados](#7-banco-de-dados)
8. [Fluxos de Negócio](#8-fluxos-de-negócio)
9. [Composables & Estado Global](#9-composables--estado-global)
10. [Segurança](#10-segurança)
11. [Setup & Desenvolvimento Local](#11-setup--desenvolvimento-local)
12. [Dependências Principais](#12-dependências-principais)
13. [Tratamento de Erros](#13-tratamento-de-erros)
14. [Deploy & Produção](#14-deploy--produção)
15. [Troubleshooting Comum](#15-troubleshooting-comum)

---

## 1. Resumo Executivo

### Nome e Descrição

**Cardápio Local** é uma plataforma SaaS multi-tenant de e-commerce voltada para restaurantes e lojistas locais. Cada lojista cadastrado obtém uma vitrine pública acessível via slug personalizado (ex: `suaplataforma.com/pizzaria-do-jose`), e gerencia seu negócio através de um painel administrativo dedicado.

### Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Framework | Nuxt 4 + Vue 3 (Composition API) |
| Linguagem | TypeScript (strict) |
| Backend runtime | Nitro (embutido no Nuxt) |
| Banco de dados | Supabase (PostgreSQL gerenciado) |
| Autenticação | Supabase Auth (JWT) |
| Estado global | Pinia 3 |
| Estilização | Tailwind CSS 3.4 com CSS Variables de tema |
| Imagens | `@nuxt/image` (otimização automática) |
| Ícones | `nuxt-icons` |
| Gerenciador de pacotes | pnpm |

### Features Principais

**Painel do Lojista (Dashboard):**

- Login / Logout / Recuperação de senha via Supabase Auth
- Gestão de produtos: criar, editar, excluir (soft delete), imagens, especificações e variações
- Gestão de categorias
- Gestão de pedidos com mudança de status (`pending → confirmed → ready → delivered/cancelled`)
- Dashboard com estatísticas de vendas (hoje, ontem, data customizada)
- Configurações da loja: nome, slug, Pix, WhatsApp, horários, tema visual

**Vitrine do Cliente (Shop):**

- Browsing de produtos por categoria com busca textual
- Carrinho de compras em memória (Pinia, sem persistência de banco)
- Checkout com entrega ou retirada
- Rastreamento de pedido por ID

### Links Importantes

- Documentação Nuxt: <https://nuxt.com>
- Documentação Supabase: <https://supabase.io/docs>
- Documentação Pinia: <https://pinia.vuejs.org>

---

## 2. Tipagem TypeScript Completa

Todos os tipos vivem em `app/types/`. Há dois arquivos com responsabilidades distintas e sem sobreposição.

### 2.1 Database Types — `app/types/database.ts`

Espelho fiel do schema do Supabase. **Nunca adicione lógica aqui.** Só tipos que refletem exatamente o banco.

```typescript
// ── Enums ──────────────────────────────────────────────────────────────────
export type Plan = 'free' | 'pro' | 'enterprise'
// Plan: determina as funcionalidades disponíveis para a loja

export type StoreRole = 'owner' | 'editor'
// StoreRole: papel do usuário em relação à loja (reservado para uso futuro com store_members)

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'delivered' | 'cancelled'
// OrderStatus: ciclo de vida de um pedido

// ── Tabela: stores ─────────────────────────────────────────────────────────
export interface DbStore {
    id: string                              // UUID, PK
    owner_id: string                        // UUID, FK → auth.users
    slug: string                            // Unique, URL da vitrine
    name: string
    description: string | null
    logo_url: string | null
    pix_key: string | null
    delivery_fee: number
    plan: Plan
    open_hours: Record<string, string>      // { "seg": "08:00-18:00", "dom": "fechado" }
    theme_settings: Record<string, string>  // { primary_color, secondary_color, ... }
    whatsapp: string
    deleted_at: string | null              // Soft delete
    created_at: string
    updated_at: string
}

// ── Tabela: categories ─────────────────────────────────────────────────────
export interface DbCategory {
    id: string
    store_id: string                        // FK → stores
    name: string
    sort_order: number
    created_at: string
}

// ── Tabela: products ───────────────────────────────────────────────────────
export interface DbProductSpec {
    label: string   // ex: "Cor"
    value: string   // ex: "Azul"
}

export interface DbProductVariationOption {
    [key: string]: string[]  // ex: { "Tamanho": ["P","M","G"], "Cor": ["Azul","Vermelho"] }
}

export interface DbProduct {
    id: string
    store_id: string                        // FK → stores
    category_id: string | null             // FK → categories
    name: string
    description: string | null
    price: number                          // Preço base em reais
    promo_price: number | null             // Preço promocional (sobrescreve price)
    image_urls: string[]                   // URLs públicas (Storage do Supabase)
    specifications: DbProductSpec[]        // Atributos fixos (JSONB)
    variation_options: DbProductVariationOption  // Variações selecionáveis (JSONB)
    stock: number
    highlighted: boolean                   // Destaque na vitrine
    active: boolean
    deleted_at: string | null             // Soft delete
    created_at: string
    updated_at: string
}

// ── Tabela: orders ─────────────────────────────────────────────────────────
export interface DbOrder {
    id: string
    store_id: string                        // FK → stores
    customer_name: string | null
    customer_whatsapp: string
    status: OrderStatus
    total: number
    subtotal: number
    delivery_fee: number
    delivery_method: string                // 'home' | 'pickup'
    address: string | null
    pix_payload: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

// ── Tabela: order_items ────────────────────────────────────────────────────
export type SpecsValue = string | string[];

export interface DbOrderItem {
    id: string
    order_id: string                        // FK → orders
    product_id: string | null             // Pode ser null se produto foi deletado
    product_name: string                   // Snapshot do nome no momento da compra
    unit_price: number                     // Snapshot do preço no momento da compra
    quantity: number
    specs_snapshot: Record<string, any>    // Snapshot das variações escolhidas
    created_at: string
}

// ── Tabela: store_status_messages ──────────────────────────────────────────
export interface DbStoreStatusMessages {
    store_id: string                        // PK + FK → stores
    pending: string     // Mensagem WhatsApp para status "pending"
    confirmed: string
    ready: string
    completed_delivery: string
    completed_pickup: string
    cancelled: string
    updated_at: string
}
```

### 2.2 Application Types — `app/types/app.ts`

Tipos de domínio usados pelo frontend e por toda a camada de aplicação. Sempre em camelCase.

```typescript
// ── Store (Loja) ───────────────────────────────────────────────────────────
export interface ThemeSettings {
    primaryColor: string      // Cor principal (botões, links)
    secondaryColor: string    // Cor secundária
    bgPrimaryColor: string    // Cor de fundo principal
    bgSecondaryColor: string  // Cor de fundo secundária
    font: string              // Família tipográfica (ex: 'inter')
}

export interface OpenHours {
    [day: string]: string  // ex: { seg: '08:00-18:00', dom: 'fechado' }
}

export interface Category {
    id: string
    name: string
    sortOrder: number
}

export interface Store {
    id: string
    ownerId: string
    slug: string
    name: string
    description?: string | null
    logoUrl: string | null
    pixKey: string | null
    deliveryFee: number
    plan: Plan              // importado de database.ts
    openHours: OpenHours
    themeSettings: ThemeSettings
    whatsapp: string
    categories: Category[]
}

// ── Product (Produto) ──────────────────────────────────────────────────────
export interface ProductSpec {
    label: string
    value: string
}

export interface ProductVariationOption {
    [key: string]: string[]
}

export interface Product {
    id: string
    storeId: string
    categoryId: string | null
    categoryName: string | null   // Vem do JOIN com categories no repository
    name: string
    description: string | null
    price: number
    promoPrice: number | null
    highlighted: boolean
    imageUrls: string[]
    specifications: ProductSpec[]
    variationOptions: ProductVariationOption
    stock: number
    active: boolean
}

// Utilitário: retorna promoPrice se existir, senão price
export function getEffectivePrice(product: Product): number {
    return product.promoPrice ?? product.price
}

// ── Cart (Carrinho — apenas no cliente) ───────────────────────────────────
export interface CartItem {
    product: Product
    quantity: number
    selectedSpecs: Record<string, string | string[]>
    // ex: { Tamanho: 'M', Adicionais: ['Bacon', 'Ovo'] }
}

export interface Cart {
    items: CartItem[]
    storeId: string
}

// ── Order (Pedido) ────────────────────────────────────────────────────────
export interface CreateOrderPayload {
    storeId: string
    customerName: string
    customerWhatsapp: string
    deliveryMethod: string      // 'home' | 'pickup'
    address: string | null
    items: {
        productId: string
        quantity: number
        priceAtTime: number     // Preço no momento do checkout
        selectedSpecs: Record<string, string | string[]>
    }[]
    subtotal: number
    deliveryFee: number
    total: number
}

export interface OrderItem {
    id: string
    productId: string | null
    productName: string        // Snapshot
    unitPrice: number          // Snapshot
    quantity: number
    specsSnapshot: Record<string, string | string[]>
}

export interface Order {
    id: string
    storeId: string
    customerName: string
    customerWhatsapp: string
    deliveryMethod: string
    address: string | null
    subtotal: number
    deliveryFee: number
    total: number
    status: OrderStatus        // importado de database.ts
    items?: OrderItem[]
    createdAt: string
}
```

### 2.3 UI Types — `layers/dashboard/app/stores/useUi.ts`

```typescript
export interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
}
```

### 2.4 Utility Types — `app/utils/errors.ts`

```typescript
export type PostgrestError = {
    message: string
    code: string
    hint?: string | null
    details?: string | null
}
```

---

## 3. Estrutura de Pastas Anotada

```
cardapio-local/
├── app/                          ← Código compartilhado entre as duas camadas
│   ├── app.vue                   ← App root (NuxtLayout + NuxtPage)
│   ├── components/ui/            ← Primitivos de UI reutilizáveis
│   │   ├── Button.vue
│   │   └── Card.vue
│   ├── types/
│   │   ├── app.ts               ← Tipos de domínio (camelCase, lógica de app)
│   │   └── database.ts          ← Espelho do schema Supabase (snake_case, sem lógica)
│   └── utils/
│       ├── cn.ts                 ← clsx + tailwind-merge (helper de classnames)
│       ├── currency.ts           ← formatCurrency (Intl.NumberFormat BRL)
│       ├── errors.ts             ← AppError, handleSupabaseError, unwrap
│       └── product.ts            ← calculateItemUnitPrice (preço com variações)
│
├── layers/
│   ├── dashboard/                ← Camada do painel administrativo
│   │   ├── nuxt.config.ts
│   │   └── app/
│   │       ├── components/
│   │       │   ├── products/
│   │       │   │   └── VariationManager.vue    ← Gerencia variações do produto
│   │       │   └── ui/
│   │       │       ├── BaseModal.vue           ← Modal genérico reutilizável
│   │       │       └── BaseToast.vue           ← Notificação toast
│   │       ├── composables/
│   │       │   ├── useAdminAuth.ts             ← Auth + seleção de loja
│   │       │   └── useAdminProductsList.ts     ← Lista paginada de produtos
│   │       ├── layouts/
│   │       │   └── dashboard.vue              ← Layout do painel (sidebar + header)
│   │       ├── middleware/
│   │       │   └── adminAuth.global.ts        ← Guard global de rota do dashboard
│   │       ├── pages/dashboard/
│   │       │   ├── index.vue                  ← Dashboard overview (stats)
│   │       │   ├── login.vue                  ← Página de login
│   │       │   ├── recover.vue                ← Solicitação de recuperação de senha
│   │       │   ├── update-password.vue        ← Formulário nova senha (após email)
│   │       │   ├── settings.vue               ← Configurações da loja
│   │       │   ├── orders/index.vue           ← Lista e gestão de pedidos
│   │       │   └── products/
│   │       │       ├── index.vue              ← Lista de produtos com busca/filtro
│   │       │       ├── new.vue                ← Formulário criação de produto
│   │       │       └── [id].vue               ← Formulário edição de produto
│   │       └── stores/
│   │           └── useUi.ts                   ← Toast notifications (Pinia)
│   │
│   └── shop/                     ← Camada da vitrine pública
│       └── app/
│           ├── features/
│           │   ├── showcase/
│           │   │   ├── components/            ← ProductCard, CategoryFilter, etc.
│           │   │   └── composables/
│           │   │       └── useCart.ts         ← Lógica de carrinho (add/remove/update)
│           │   └── checkout/
│           │       ├── components/
│           │       │   ├── CheckoutForm.vue   ← Formulário dados do cliente
│           │       │   └── OrderSummary.vue   ← Resumo do pedido
│           │       └── composables/
│           │           └── useCheckout.ts     ← Utilitários de checkout (WhatsApp, etc.)
│           ├── pages/[slug]/                  ← Rotas dinâmicas da vitrine
│           └── stores/
│               ├── useStoreCart.ts            ← Carrinho (Pinia, em memória)
│               ├── useStoreProducts.ts        ← Cache de produtos da loja
│               └── useStoreStores.ts          ← Dados da loja atual
│
├── server/                       ← Backend Nitro
│   ├── api/
│   │   ├── admin/                ← Endpoints protegidos do painel
│   │   │   ├── categories/
│   │   │   │   ├── index.get.ts  ← GET /api/admin/categories?storeId=
│   │   │   │   └── create.post.ts← POST /api/admin/categories
│   │   │   ├── orders/
│   │   │   │   ├── index.get.ts  ← GET /api/admin/orders?storeId=
│   │   │   │   └── [id]/
│   │   │   │       └── status.patch.ts ← PATCH /api/admin/orders/:id/status
│   │   │   ├── products/
│   │   │   │   ├── index.get.ts  ← GET /api/admin/products?storeId=
│   │   │   │   ├── create.post.ts← POST /api/admin/products
│   │   │   │   ├── [id].get.ts   ← GET /api/admin/products/:id
│   │   │   │   ├── [id].put.ts   ← PUT /api/admin/products/:id
│   │   │   │   └── [id].delete.ts← DELETE /api/admin/products/:id?storeId=
│   │   │   ├── stats/
│   │   │   │   └── index.get.ts  ← GET /api/admin/stats?storeId=&filter=
│   │   │   └── stores/[id]/
│   │   │       ├── index.get.ts       ← GET /api/admin/stores/:id
│   │   │       ├── index.put.ts       ← PUT /api/admin/stores/:id
│   │   │       ├── status-messages.get.ts ← GET /api/admin/stores/:id/status-messages
│   │   │       └── status-messages.put.ts ← PUT /api/admin/stores/:id/status-messages
│   │   ├── shop/
│   │   │   └── orders/
│   │   │       ├── create.post.ts ← POST /api/shop/orders/create
│   │   │       └── [id].get.ts   ← GET /api/shop/orders/:id
│   │   ├── orders/
│   │   │   └── create.post.ts    ← POST /api/orders/create (legado)
│   │   ├── products/
│   │   │   └── getAll.ts         ← GET /api/products/getAll?storeId= (público)
│   │   └── stores/
│   │       └── getBySlug.ts      ← GET /api/stores/getBySlug?slug= (público)
│   ├── repositories/             ← Queries Supabase — SOMENTE acesso a dados
│   │   ├── category.repository.ts
│   │   ├── order.repository.ts
│   │   ├── product.repository.ts
│   │   ├── store.repository.ts
│   │   └── storeStatus.repository.ts
│   └── services/                 ← Orquestração de negócio sobre repositories
│       ├── category.service.ts
│       ├── order.service.ts
│       ├── product.service.ts
│       ├── store.service.ts
│       └── storeStatus.service.ts
│
├── docs/                         ← Documentação do projeto
├── nuxt.config.ts                ← Configuração principal do Nuxt
├── tailwind.config.ts            ← Extensões do Tailwind (cores via CSS variables)
└── package.json
```

### 3.1 Regras de Uso das Camadas

| Onde | O que pode existir | O que NÃO pode existir |
|------|--------------------|------------------------|
| `components/` | Props in, emits out. Lógica de UI pura. | Chamadas de API diretas, `$fetch`, stores |
| `composables/` | `$fetch`, lógica de negócio, estado reativo feature-scoped | Renderização de template |
| `stores/` (Pinia) | Estado global persistente (carrinho, produtos carregados) | Regras de negócio complexas |
| `server/repositories/` | Queries Supabase + conversão DbX → X | Lógica de negócio, validações |
| `server/services/` | Orquestração de repositories | Queries Supabase diretas |
| `server/api/` | Parse de request, autenticação, chamar services | Queries Supabase diretas |

---

## 4. Fluxos de Autenticação

O projeto usa **Supabase Auth** com o módulo `@nuxtjs/supabase`. A configuração `redirect: false` significa que o módulo **não faz redirecionamentos automáticos** — o controle é feito pelo middleware `adminAuth.global.ts`.

### 4.1 Login Flow

```
[Usuário acessa /dashboard/login]
        ↓
[Preenche email + senha no formulário]
        ↓
[Frontend chama: supabase.auth.signInWithPassword({ email, password })]
        ↓
[Supabase valida credenciais e retorna Session (JWT + refresh_token)]
        ↓
[Supabase client armazena sessão automaticamente (cookie httpOnly)]
        ↓
[useAdminAuth.loadSession() busca a loja do usuário em stores]
        ↓
[storeId é armazenado em useState('admin-store-id')]
        ↓
[navigateTo('/dashboard')]
```

**Implementação (frontend):**

```typescript
// layers/dashboard/app/pages/dashboard/login.vue
const supabase = useSupabaseClient()
const { error } = await supabase.auth.signInWithPassword({ email, password })
if (!error) navigateTo('/dashboard')
```

**Dados da sessão:**

- `access_token`: JWT válido por 1h (padrão Supabase)
- `refresh_token`: Token de longa duração para renovação automática
- Ambos armazenados em cookies pelo cliente Supabase

### 4.2 Verificação de Sessão (Middleware)

```typescript
// layers/dashboard/app/middleware/adminAuth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
    const publicPaths = ['/dashboard/login', '/dashboard/recover', '/dashboard/update-password']
    
    if (to.path.startsWith('/dashboard') && !publicPaths.includes(to.path)) {
        const user = useSupabaseUser()  // Reativo, sincroniza com a sessão
        
        if (!user.value) {
            return navigateTo('/dashboard/login')  // Sem sessão → login
        }

        const { loadSession } = useAdminAuth()
        await loadSession()  // Garante storeId carregado
    }
})
```

**Rotas públicas (sem auth):**

- `/dashboard/login`
- `/dashboard/recover`
- `/dashboard/update-password`

### 4.3 Logout Flow

```typescript
// layers/dashboard/app/composables/useAdminAuth.ts
const logout = async () => {
    await supabase.auth.signOut()    // Invalida sessão no Supabase + limpa cookies
    storeId.value = null             // Limpa estado local
    navigateTo('/dashboard/login')
}
```

### 4.4 Recuperação de Senha

```
[Usuário acessa /dashboard/recover]
        ↓
[Preenche email]
        ↓
[Frontend: supabase.auth.resetPasswordForEmail(email)]
        ↓
[Supabase envia email com link de reset]
        ↓
[Usuário clica no link → redireciona para /dashboard/update-password]
        ↓
[Frontend: supabase.auth.updateUser({ password: novaSenha })]
        ↓
[Senha atualizada → navigateTo('/dashboard/login')]
```

### 4.5 Token de Serviço no Backend

Para operações que exigem contornar o RLS (ex: criar pedido de cliente não autenticado, baixar estoque), o backend usa `serverSupabaseServiceRole(event)` que injeta o `SUPABASE_SERVICE_KEY`. Esse client tem privilégios de admin e **nunca deve ser exposto ao frontend**.

```typescript
// server/api/shop/orders/create.post.ts
const client = await serverSupabaseServiceRole(event)
// client tem acesso irrestrito ao banco — use apenas no servidor
```

---

## 5. Comunicação Front-End ↔ Back-End

### 5.1 Padrão de Requisições

O frontend usa `$fetch` (Nuxt) ou `useFetch` (com reatividade). O Supabase client do módulo `@nuxtjs/supabase` injeta automaticamente o JWT do usuário logado nos headers quando usado com `serverSupabaseClient`.

**Formato padrão de response (sucesso):**

```json
{ "success": true, "data": { } }
```

**Formato padrão de response (erro — lançado com `createError`):**

```json
{ "statusCode": 400, "statusMessage": "Descrição do erro" }
```

**Autenticação:** O JWT é enviado automaticamente pelo cliente Supabase via cookie de sessão. Os endpoints admin que precisam de auth chamam `serverSupabaseClient(event)` que lê a sessão do cookie.

### 5.2 Mapeamento Completo de Endpoints

---

#### `[GET] /api/stores/getBySlug`

**Autenticado:** Não | **Uso:** Vitrine pública

**Query params:**

```typescript
{ slug: string }
```

**Response 200:**

```typescript
Store  // tipo completo com categories[]
```

---

#### `[GET] /api/products/getAll`

**Autenticado:** Não | **Uso:** Vitrine pública

**Query params:**

```typescript
{
    storeId: string
    q?: string        // busca textual por nome
    categoryId?: string
    page?: number     // padrão: 1
    limit?: number    // padrão: 5
}
```

**Response 200:**

```typescript
{ success: true; data: Product[] }
```

---

#### `[GET] /api/shop/orders/:id`

**Autenticado:** Não | **Uso:** Rastreamento de pedido pelo cliente

**Response 200:** `Order` com `items[]`

---

#### `[POST] /api/shop/orders/create`

**Autenticado:** Não (usa service role no backend)

**Body:**

```typescript
CreateOrderPayload: {
    storeId: string
    customerName: string
    customerWhatsapp: string
    deliveryMethod: 'home' | 'pickup'
    address: string | null
    items: {
        productId: string
        quantity: number
        priceAtTime: number
        selectedSpecs: Record<string, string | string[]>
    }[]
    subtotal: number
    deliveryFee: number
    total: number
}
```

**Response 200:** `Order` recém-criado

**Erros:**

- `400`: Dados inválidos (storeId ausente, items vazio)
- `500`: Erro no banco

---

#### `[GET] /api/admin/products`

**Autenticado:** Sim (via cookie de sessão)

**Query params:**

```typescript
{
    storeId: string
    q?: string
    categoryId?: string
    page?: number    // padrão: 1
    limit?: number   // padrão: 100 (admin carrega mais)
}
```

**Response 200:**

```typescript
{ success: true; data: Product[] }  // inclui produtos inativos
```

---

#### `[GET] /api/admin/products/:id`

**Autenticado:** Sim

**Response 200:** `{ success: true; data: Product }`

---

#### `[POST] /api/admin/products/create`

**Autenticado:** Sim (valida propriedade da loja antes de criar)

**Body:**

```typescript
{
    store_id: string         // obrigatório
    name: string             // obrigatório
    price: number            // obrigatório
    description?: string
    promo_price?: number
    category_id?: string
    active?: boolean         // padrão: true
    highlighted?: boolean    // padrão: false
    image_urls?: string[]
    specifications?: DbProductSpec[]
    variation_options?: DbProductVariationOption
    stock?: number           // padrão: 0
}
```

**Response 200:** `{ success: true; data: Product }`

**Erros:**

- `400`: Campos obrigatórios ausentes
- `403`: Usuário não é dono da loja

---

#### `[PUT] /api/admin/products/:id`

**Autenticado:** Sim | **Body:** Mesmos campos do POST (todos opcionais)

**Response 200:** `{ success: true; data: Product }`

---

#### `[DELETE] /api/admin/products/:id`

**Autenticado:** Sim | **Query:** `storeId: string`

Realiza **soft delete** (preenche `deleted_at`), o produto não some do banco.

**Response 200:** `{ success: true }`

---

#### `[GET] /api/admin/categories`

**Autenticado:** Sim | **Query:** `storeId: string`

**Response 200:** `{ success: true; data: Category[] }`

---

#### `[POST] /api/admin/categories/create`

**Autenticado:** Sim | **Body:** `{ store_id: string; name: string; sort_order?: number }`

---

#### `[GET] /api/admin/orders`

**Autenticado:** Sim | **Query:** `storeId: string`

**Response 200:** Array de `Order` com `items[]`, ordenados por `created_at DESC`

---

#### `[PATCH] /api/admin/orders/:id/status`

**Autenticado:** Sim (usa service role para poder baixar estoque)

**Body:**

```typescript
{ status: OrderStatus; storeId: string }
```

**Lógica especial:** Quando `status === 'delivered'` e o pedido ainda não estava entregue, o repository decrementa o estoque de cada produto automaticamente.

**Response 200:** `Order` atualizado

---

#### `[GET] /api/admin/stats`

**Autenticado:** Sim | **Query:**

```typescript
{
    storeId: string
    filter: 'today' | 'yesterday' | 'custom'
    date?: string  // formato YYYY-MM-DD (apenas quando filter='custom')
}
```

**Response 200:**

```typescript
{
    totalSales: number      // Soma de total dos pedidos entregues
    totalOrders: number     // Contagem total de pedidos no período
    pendingOrders: number   // Contagem de pedidos pending no período
}
```

---

#### `[GET] /api/admin/stores/:id`

**Autenticado:** Sim | **Response 200:** `Store`

---

#### `[PUT] /api/admin/stores/:id`

**Autenticado:** Sim (verifica `ownerId === user.id`)

**Body (todos opcionais):**

```typescript
{
    name?: string
    slug?: string
    pixKey?: string
    logoUrl?: string
    whatsapp?: string
    openHours?: OpenHours
    themeSettings?: ThemeSettings
}
```

**Response 200:** `{ success: true; message: 'Loja atualizada com sucesso' }`

---

#### `[GET/PUT] /api/admin/stores/:id/status-messages`

**Autenticado:** Sim | Gerencia mensagens de WhatsApp por status de pedido

---

## 6. Autenticação & Autorização

### 6.1 Estratégia

- **Tipo:** Supabase Auth JWT
- **Armazenamento:** Cookies gerenciados automaticamente pelo `@supabase/supabase-js` (httpOnly quando configurado, ou localStorage em fallback)
- **Duração do access_token:** 1 hora (padrão Supabase)
- **Refresh:** Automático pelo cliente Supabase antes de expirar
- **Middleware:** `adminAuth.global.ts` protege todas as rotas `/dashboard/*` exceto as públicas

### 6.2 Sistema de Roles

Atualmente o sistema tem um modelo simples:

- **Owner:** Usuário autenticado que possui uma loja (`stores.owner_id = auth.uid()`)
- **Cliente:** Usuário anônimo que acessa a vitrine (sem autenticação)

O tipo `StoreRole = 'owner' | 'editor'` está definido mas o papel `editor` ainda não foi implementado na lógica de acesso.

### 6.3 Verificação de Propriedade nos Endpoints

A verificação se o usuário tem direito a operar em uma loja é feita **manualmente** nos endpoints críticos:

```typescript
// Padrão em PUT /api/admin/stores/:id
const { data: { user } } = await userClient.auth.getUser()
if (!user) throw createError({ statusCode: 401, ... })

const store = await storeService.getStoreById(client, id)
if (store.ownerId !== user.id) throw createError({ statusCode: 403, ... })
```

Para produtos, a verificação acontece via query com `eq('store_id', storeId)` — se o usuário não tiver acesso à loja, o Supabase RLS deve barrar (dependendo das policies configuradas).

### 6.4 Service Role vs User Client

| Client | Quando usar | Capacidades |
|--------|-------------|-------------|
| `serverSupabaseClient(event)` | Operações que devem respeitar RLS e contexto do usuário | Limitado pelas RLS policies |
| `serverSupabaseServiceRole(event)` | Operações administrativas (criar pedido, baixar estoque) | Acesso irrestrito — use com cuidado |

---

## 7. Banco de Dados

### 7.1 Tabelas

#### `stores`

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | uuid | PK, default uuid_generate_v4() | ID único |
| owner_id | uuid | NOT NULL, FK → auth.users | Proprietário |
| slug | text | UNIQUE, NOT NULL | URL slug da vitrine |
| name | text | NOT NULL | Nome da loja |
| description | text | NULL | Descrição |
| logo_url | text | NULL | URL da logo |
| pix_key | text | NULL | Chave Pix para pagamento |
| delivery_fee | numeric | NOT NULL, DEFAULT 0 | Taxa de entrega em reais |
| plan | text | DEFAULT 'free' | 'free' | 'pro' | 'enterprise' |
| open_hours | jsonb | NOT NULL | Horários de funcionamento |
| theme_settings | jsonb | NOT NULL | Cores e fonte da vitrine |
| whatsapp | text | NOT NULL | Número para contato/pedidos |
| deleted_at | timestamptz | NULL | Soft delete |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

#### `categories`

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | uuid | PK | |
| store_id | uuid | NOT NULL, FK → stores | |
| name | text | NOT NULL | |
| sort_order | integer | DEFAULT 0 | Ordenação na vitrine |
| created_at | timestamptz | DEFAULT now() | |

---

#### `products`

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | uuid | PK | |
| store_id | uuid | NOT NULL, FK → stores | |
| category_id | uuid | NULL, FK → categories | |
| name | text | NOT NULL | |
| description | text | NULL | |
| price | numeric | NOT NULL | Preço base |
| promo_price | numeric | NULL | Preço promocional |
| image_urls | text[] | DEFAULT '{}' | Array de URLs |
| specifications | jsonb | DEFAULT '[]' | `[{label, value}]` |
| variation_options | jsonb | DEFAULT '{}' | `{key: string[]}` |
| stock | integer | DEFAULT 0 | Estoque disponível |
| highlighted | boolean | DEFAULT false | Destaque na vitrine |
| active | boolean | DEFAULT true | Visível na vitrine |
| deleted_at | timestamptz | NULL | Soft delete |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

#### `orders`

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | uuid | PK | |
| store_id | uuid | NOT NULL, FK → stores | |
| customer_name | text | NULL | Nome do cliente |
| customer_whatsapp | text | NOT NULL | WhatsApp (com DDI 55) |
| status | text | DEFAULT 'pending' | Ciclo de vida do pedido |
| total | numeric | NOT NULL | Total com taxa de entrega |
| subtotal | numeric | NOT NULL | Total sem taxa |
| delivery_fee | numeric | NOT NULL | Taxa cobrada |
| delivery_method | text | NOT NULL | 'home' ou 'pickup' |
| address | text | NULL | Endereço (se delivery) |
| pix_payload | text | NULL | Payload Pix gerado (não implementado) |
| notes | text | NULL | Observações |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

#### `order_items`

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | uuid | PK | |
| order_id | uuid | NOT NULL, FK → orders | |
| product_id | uuid | NULL, FK → products | Pode ser null se produto deletado |
| product_name | text | NOT NULL | **Snapshot** do nome |
| unit_price | numeric | NOT NULL | **Snapshot** do preço |
| quantity | integer | NOT NULL | |
| specs_snapshot | jsonb | DEFAULT '{}' | Variações escolhidas |
| created_at | timestamptz | DEFAULT now() | |

> **Importante:** `order_items` armazena snapshots do produto no momento da compra. Isso preserva o histórico mesmo que o produto seja editado ou deletado posteriormente.

---

#### `store_status_messages`

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| store_id | uuid | PK, FK → stores | |
| pending | text | NOT NULL | Mensagem WhatsApp para status pending |
| confirmed | text | NOT NULL | |
| ready | text | NOT NULL | |
| completed_delivery | text | NOT NULL | |
| completed_pickup | text | NOT NULL | |
| cancelled | text | NOT NULL | |
| updated_at | timestamptz | DEFAULT now() | |

---

### 7.2 Relacionamentos

```
auth.users (Supabase)
    └── stores (owner_id → auth.users.id)
            ├── categories (store_id → stores.id)
            ├── products (store_id → stores.id)
            │       └── order_items (product_id → products.id, nullable)
            ├── orders (store_id → stores.id)
            │       └── order_items (order_id → orders.id)
            └── store_status_messages (store_id → stores.id, 1:1)
```

### 7.3 Soft Delete

As tabelas `stores` e `products` usam soft delete via campo `deleted_at`. Todas as queries aplicam `.is('deleted_at', null)` para filtrar registros deletados.

### 7.4 Baixa de Estoque

O estoque (`products.stock`) é decrementado **automaticamente** quando um pedido muda para status `delivered`. Essa lógica está no `order.repository.ts → updateStatus()` e inclui proteção contra dupla baixa (verifica o status anterior antes de agir).

---

## 8. Fluxos de Negócio

### 8.1 Criação de Pedido (Checkout)

```
[Cliente visualiza vitrine → adiciona produtos ao carrinho (Pinia)]
        ↓
[Preenche CheckoutForm (nome, WhatsApp, endereço, método de entrega)]
        ↓
[Frontend: valida campos obrigatórios localmente]
        ↓
[Frontend: POST /api/shop/orders/create com CreateOrderPayload]
        ↓
[Backend: valida storeId e items.length > 0]
        ↓
[Backend: busca nomes dos produtos (snapshot) para order_items]
        ↓
[Backend: INSERT em orders → obtém order.id]
        ↓
[Backend: INSERT em order_items (com snapshots)]
        ↓
[Backend: retorna Order]
        ↓
[Frontend: limpa carrinho (clearCart)]
        ↓
[Frontend: gera URL WhatsApp com resumo do pedido]
        ↓
[Frontend: redireciona para página de acompanhamento do pedido]
```

**Erros tratados:**

- `storeId` ausente → 400
- Items vazio → 400
- Erro no banco → 500

### 8.2 Gestão de Pedidos (Dashboard)

```
[Lojista acessa /dashboard/orders]
        ↓
[GET /api/admin/orders?storeId= → lista pedidos]
        ↓
[Lojista clica para mudar status do pedido]
        ↓
[PATCH /api/admin/orders/:id/status com { status, storeId }]
        ↓
[Backend: busca status atual (proteção dupla baixa de estoque)]
        ↓
[Se status = 'delivered' E era diferente → decrementa estoque de cada item]
        ↓
[UPDATE orders SET status WHERE id AND store_id]
        ↓
[Frontend: atualiza lista de pedidos localmente]
```

### 8.3 Gestão de Produtos (Dashboard)

**Criação:**

```
[POST /api/admin/products/create]
        → Valida campos obrigatórios (store_id, name, price)
        → Verifica acesso à loja (SELECT stores WHERE id = store_id)
        → Usa supabaseAdmin (service role) para contornar RLS de insert
        → productService.create → productRepository.create
        → Retorna Product
```

**Edição:**

```
[PUT /api/admin/products/:id]
        → serverSupabaseClient (respeita RLS)
        → productService.update(supabase, productId, storeId, data)
        → UPDATE products WHERE id AND store_id (store_id como segurança)
```

**Exclusão:**

```
[DELETE /api/admin/products/:id?storeId=]
        → productRepository.softDelete
        → UPDATE products SET deleted_at = now() WHERE id AND store_id
```

---

## 9. Composables & Estado Global

### 9.1 `useAdminAuth` — `layers/dashboard/app/composables/useAdminAuth.ts`

Gerencia sessão e contexto de loja do painel administrativo.

**Retorna:**

```typescript
{
    storeId: Ref<string | null>      // ID da loja selecionada (useState global)
    userStores: Ref<{id, name}[]>    // Todas as lojas do usuário
    user: Ref<User | null>           // Usuário Supabase autenticado
    loadSession(): Promise<boolean>  // Carrega storeId da primeira loja
    logout(): Promise<void>          // SignOut + redirect /dashboard/login
    switchStore(id: string): void    // Troca loja ativa
}
```

**Efeito colateral:** `storeId` é compartilhado via `useState('admin-store-id')` — persiste entre navegações sem re-fetch.

**Exemplo:**

```typescript
const { storeId, logout } = useAdminAuth()
// storeId.value → '123e4567-e89b-...'
```

### 9.2 `useAdminProductsList` — `layers/dashboard/app/composables/useAdminProductsList.ts`

Lista paginada e filtrável de produtos para o painel. É um composable **async** (usa `await useFetch`).

**Retorna:**

```typescript
{
    products: ComputedRef<Product[]>
    pending: Ref<boolean>
    searchQuery: Ref<string>
    categoryFilter: Ref<string>
    refresh(): void
    handleDelete(id: string): Promise<void>
}
```

**Exemplo:**

```typescript
const { products, searchQuery, handleDelete } = await useAdminProductsList()
searchQuery.value = 'pizza'  // Reactively re-fetches
```

### 9.3 `useCheckout` — `layers/shop/app/features/checkout/composables/useCheckout.ts`

Utilitários para o fluxo de checkout.

**Retorna:**

```typescript
{
    sanitizePhone(phone: string): string         // Garante DDI 55
    generateWhatsappUrl(orderId, customerName): string  // URL wa.me/
    formatCurrency(value: number): string        // R$ 1.234,56
}
```

### 9.4 Store `useStoreCart` — `layers/shop/app/stores/useStoreCart.ts`

Carrinho de compras. Estado **em memória** — não persiste entre reloads (por design).

```typescript
// State
items: Ref<CartItem[]>

// Computed
totalItems: ComputedRef<number>
subtotal: ComputedRef<number>   // Calcula com promoPrice e variações

// Actions
addItem(item: CartItem): void           // Respeita limite de estoque
removeItem(productId, specs): void
updateQuantity(productId, specs, qty): void
clearCart(): void
```

**Identificação de item único:** `${productId}-${JSON.stringify(specs)}` — mesmo produto com specs diferentes é tratado como item separado.

### 9.5 Store `useStoreProducts` — `layers/shop/app/stores/useStoreProducts.ts`

Cache dos produtos da loja atual.

```typescript
// State
products: Ref<Product[]>      // Produtos do filtro/página atual
allProducts: Ref<Product[]>   // Todos os produtos (para busca local)

// Setters
setProducts(products: Product[]): void
setAllProducts(products: Product[]): void
```

### 9.6 Store `useUiStore` — `layers/dashboard/app/stores/useUi.ts`

Toast notifications do painel.

```typescript
// State
toasts: Ref<Toast[]>

// Actions
addToast(message: string, type?: 'success'|'error'|'info'): void
// Auto-remove após 4000ms
removeToast(id: string): void
```

---

## 10. Segurança

### 10.1 Checklist

- ✅ JWT validado via `serverSupabaseClient` nos endpoints admin
- ✅ `SUPABASE_SERVICE_KEY` usada apenas no servidor (nunca exposta ao frontend)
- ✅ Verificação manual de propriedade (`ownerId === user.id`) nos endpoints de edição de loja
- ✅ Soft delete preserva histórico (evita deleção acidental de dados de pedidos)
- ✅ Snapshots em `order_items` evitam inconsistência de dados históricos
- ✅ `store_id` sempre validado nas queries de produto/pedido (isolamento multi-tenant)
- ⚠️ RLS policies do Supabase precisam ser verificadas e documentadas separadamente
- ⚠️ Falta rate limiting nos endpoints de criação de pedido (risco de spam)
- ⚠️ Validação de input no backend é básica (sem schema validation library como Zod)

### 10.2 Variáveis de Ambiente

| Variável | Onde | Uso |
|----------|------|-----|
| `NUXT_PUBLIC_SUPABASE_URL` | Cliente + Servidor | URL do projeto Supabase |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente + Servidor | Chave pública (segura expor) |
| `SUPABASE_SERVICE_KEY` | **Apenas Servidor** | Chave admin (nunca expor) |

### 10.3 Proteção Multi-Tenant

Cada query de produto e pedido inclui `eq('store_id', storeId)` para garantir que um lojista não acesse dados de outro lojista. A validação do `storeId` contra o usuário autenticado é feita via:

1. RLS do Supabase (quando `serverSupabaseClient` é usado)
2. Verificação manual de `ownerId` (quando `serverSupabaseServiceRole` é necessário)

---

## 11. Setup & Desenvolvimento Local

### 11.1 Pré-requisitos

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Conta no [Supabase](https://supabase.com)

### 11.2 Setup Inicial

```bash
# Clone o repositório
git clone <repo-url>
cd cardapio-local

# Instale dependências
pnpm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais Supabase

# Inicie servidor de desenvolvimento
pnpm dev
```

### 11.3 Variáveis de Ambiente

```env
# .env.local

# Supabase — obtidas em: Supabase Dashboard > Settings > API
NUXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Key — NUNCA commitar, NUNCA expor no frontend
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 11.4 Scripts Disponíveis

```bash
pnpm dev        # Dev server em http://localhost:3000 (com HMR)
pnpm build      # Build de produção
pnpm preview    # Preview local do build de produção
pnpm generate   # Geração estática (SSG)
```

### 11.5 Setup do Banco (Supabase)

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute os SQLs de criação de tabelas no SQL Editor do Supabase (conforme schema em §7.1)
3. Configure RLS policies para `stores`, `products`, `orders`, `order_items`
4. Copie a URL e as chaves para o `.env.local`

### 11.6 Acessando as Áreas

- **Vitrine:** `http://localhost:3000/<slug-da-loja>`
- **Painel:** `http://localhost:3000/dashboard/login`

---

## 12. Dependências Principais

| Dependência | Versão | Propósito |
|-------------|--------|-----------|
| `nuxt` | ^4.4.4 | Framework fullstack (SSR + API routes via Nitro) |
| `vue` | ^3.5.33 | UI com Composition API |
| `@nuxtjs/supabase` | 2.0.6 | Integração Supabase (auth automático, composables) |
| `@supabase/supabase-js` | ^2.105.3 | Client Supabase |
| `pinia` | ^3.0.4 | Estado global reativo |
| `@pinia/nuxt` | 0.11.3 | Integração Pinia + Nuxt |
| `@nuxt/image` | 2.0.0 | Otimização automática de imagens |
| `nuxt-icons` | 4.0.0 | Sistema de ícones SVG |
| `clsx` | ^2.1.1 | Composição condicional de classes CSS |
| `tailwind-merge` | ^3.5.0 | Merge inteligente de classes Tailwind |
| `@nuxtjs/tailwindcss` | ^6.14.0 | Integração Tailwind CSS + Nuxt |
| `tailwindcss` | ^3.4.0 | Framework CSS utility-first |

---

## 13. Tratamento de Erros

### 13.1 Utilitários Backend — `app/utils/errors.ts`

**`unwrap<T>(result)`**
Helper principal para lidar com respostas do Supabase. Lança `AppError` se houver erro ou se `data` for `null`.

```typescript
// Antes (verboso e inconsistente):
const { data, error } = await client.from('products').select('*').single()
if (error) throw error
if (!data) throw new Error('Not found')

// Depois (conciso e padronizado):
const product = unwrap(await client.from('products').select('*').single())
```

**`handleSupabaseError(error: PostgrestError): never`**
Converte códigos de erro PostgreSQL em mensagens amigáveis em português e lança `AppError`.

| Código PG | Mensagem |
|-----------|----------|
| `23505` | "Este registro já existe." |
| `23503` | "Referência inválida entre registros." |
| `42501` | "Você não tem permissão para esta ação." |
| `54001` | "Erro de recursão no banco..." |
| `PGRST116` | "Registro não encontrado." |
| Outros | "Ocorreu um erro inesperado. Tente novamente." |

**`AppError`**
Classe customizada com `code` e `originalError` para logging estruturado.

```typescript
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly originalError?: unknown
    ) { ... }
}
```

### 13.2 Tratamento nos Endpoints (Backend)

```typescript
// Padrão em todos os endpoints:
try {
    const result = await service.doSomething(...)
    return { success: true, data: result }
} catch (error: any) {
    throw createError({
        statusCode: error.statusCode || 400,
        statusMessage: error.message || 'Erro inesperado'
    })
}
```

### 13.3 Tratamento no Frontend (Dashboard)

O `useUiStore` centraliza o feedback ao usuário via toasts:

```typescript
// Em composables ou pages:
try {
    await $fetch('/api/admin/products/' + id, { method: 'DELETE', ... })
    ui.addToast('Produto excluído com sucesso!')         // success (verde)
} catch (e: any) {
    ui.addToast('Erro: ' + e.message, 'error')           // error (vermelho)
}
```

Toasts desaparecem automaticamente após 4 segundos.

---

## 14. Deploy & Produção

### 14.1 Deploy (Nuxt SSR)

O projeto é um app Nuxt com SSR — recomendado fazer deploy em plataformas que suportem Node.js:

- **Vercel** (zero-config para Nuxt)
- **Netlify** (com adaptador Nitro)
- **Railway / Fly.io** (Node.js Docker)

```bash
# Build de produção
pnpm build

# O output fica em .output/
# Para rodar em produção:
node .output/server/index.mjs
```

### 14.2 Variáveis de Produção Necessárias

```env
NUXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_KEY=sua_service_key_secreta
```

### 14.3 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas na plataforma de deploy
- [ ] `pnpm build` passa sem erros
- [ ] Tabelas e RLS policies criadas no Supabase de produção
- [ ] `SUPABASE_SERVICE_KEY` não está em nenhum bundle frontend
- [ ] Domínio customizado configurado (se houver)
- [ ] Email templates do Supabase Auth configurados (reset de senha)

---

## 15. Troubleshooting Comum

### Problema: Middleware redireciona para login mesmo após autenticação

**Causa:** `useSupabaseUser()` retorna `null` no SSR antes do cookie ser lido.  
**Solução:** O módulo `@nuxtjs/supabase` sincroniza o usuário via cookie. Verificar se `redirect: false` está em `nuxt.config.ts` e se o `adminAuth.global.ts` está esperando corretamente o estado reativo.

### Problema: `Cannot read properties of null (reading 'id')` no loadSession

**Causa:** `loadSession()` chamado antes da sessão Supabase estar pronta.  
**Solução:** Usar `await supabase.auth.getUser()` (que faz fetch) em vez de `useSupabaseUser()` (que é reativo/síncrono) dentro de `loadSession`.

### Problema: Produto criado não aparece na listagem

**Causa:** Paginação ou filtro `active: true` ativo.  
**Solução:** Admin usa `includeInactive: true` na query — verificar se o parâmetro está sendo passado corretamente.

### Problema: Estoque sendo baixado mais de uma vez

**Causa:** `updateStatus` chamado múltiplas vezes para `delivered`.  
**Solução:** O repository verifica `currentStatus !== 'delivered'` antes de decrementar — garantir que essa verificação está na versão deployada.

### Problema: CORS error em chamadas para `/api/*`

**Causa:** Chamada partindo de um domínio diferente do servidor Nuxt.  
**Solução:** As rotas `/api/*` do Nitro estão no mesmo servidor que o frontend (SSR). Se estiver testando externamente, verificar `allowedOrigins` nas configurações do Nitro.

### Problema: `SUPABASE_SERVICE_KEY` undefined em produção

**Causa:** Variável não configurada na plataforma de deploy.  
**Solução:** Adicionar a variável no painel da plataforma (Vercel > Settings > Environment Variables). **Não prefixar com `NUXT_PUBLIC_`** pois isso a exporia ao cliente.

### Problema: Soft delete não funciona e produto ainda aparece

**Causa:** Query sem `.is('deleted_at', null)`.  
**Solução:** Verificar se todas as queries de listagem aplicam o filtro. O `product.repository.ts` aplica em todos os métodos — verificar se não há query direta bypassando o repository.

---

## Recursos Adicionais

- [Documentação Nuxt 4](https://nuxt.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Pinia](https://pinia.vuejs.org)
- [Nuxt Layers](https://nuxt.com/docs/getting-started/layers)
- [Nitro (Server)](https://nitro.unjs.io)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)
