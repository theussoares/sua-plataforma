# Database Documentation — suaplataforma

> Projeto Supabase: `ummhpnipkfhdcxlqqqen` · Região: `us-east-2` · PostgreSQL 17  
> Gerado em: 2026-05-11

---

## Visão Geral

O banco implementa um SaaS multi-tenant onde cada **loja** (`stores`) é um tenant isolado. O acesso é controlado por Row-Level Security (RLS) via a tabela `store_members`, que mapeia usuários Supabase Auth a lojas com um papel (`owner` ou `editor`).

```
auth.users
    │
    ├──► stores (owner_id)
    │        │
    │        ├──► store_members (controle de acesso RLS)
    │        ├──► categories
    │        ├──► products ──► order_items
    │        ├──► orders   ──► order_items
    │        └──► store_status_messages
    │
    └──► store_members (user_id)
```

---

## Tabelas

### `stores`
>
> Cada linha é um tenant (loja) do sistema white-label.

| Coluna | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | `uuid` | ✅ PK | `gen_random_uuid()` | Identificador único da loja |
| `owner_id` | `uuid` | ✅ FK→`auth.users` | — | Dono da loja |
| `slug` | `text` | ✅ UNIQUE | — | URL da loja (ex: `/minha-loja`) |
| `name` | `text` | ✅ | — | Nome exibido da loja |
| `logo_url` | `text` | — | `NULL` | URL da logo no Storage |
| `pix_key` | `text` | — | `NULL` | Chave PIX para recebimento |
| `delivery_fee` | `numeric` | ✅ | `0` | Taxa de entrega padrão |
| `plan` | `text` | ✅ | `'free'` | Plano: `free` / `pro` / `enterprise` |
| `open_hours` | `jsonb` | ✅ | `{}` | Horários de funcionamento por dia |
| `theme_settings` | `jsonb` | ✅ | `{}` | Configurações visuais (cores, fontes) |
| `whatsapp` | `text` | — | `NULL` | Número WhatsApp de contato |
| `deleted_at` | `timestamptz` | — | `NULL` | Soft delete — `NULL` = ativa |
| `created_at` | `timestamptz` | ✅ | `now()` | — |
| `updated_at` | `timestamptz` | ✅ | `now()` | — |

**Restrições:**

- `plan` aceita apenas: `free`, `pro`, `enterprise`
- Limites por plano: `free`=50 produtos, `pro`=500, `enterprise`=ilimitado

**RLS Policies:**

| Policy | Operação | Regra |
|---|---|---|
| `stores_select_public` | SELECT | `deleted_at IS NULL` (público) |
| `stores_insert_owner` | INSERT | `owner_id = auth.uid()` |
| `stores_update_member` | UPDATE | `is_store_member(id)` |
| `stores_delete_owner` | DELETE | `is_store_owner(id)` |

---

### `store_members`
>
> Controla quem pode acessar e editar cada loja. Base do RLS.

| Coluna | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `store_id` | `uuid` | ✅ PK FK→`stores` | — | Referência à loja |
| `user_id` | `uuid` | ✅ PK FK→`auth.users` | — | Usuário membro |
| `role` | `text` | ✅ | `'editor'` | Papel: `owner` ou `editor` |
| `created_at` | `timestamptz` | ✅ | `now()` | — |

**Chave primária composta:** `(store_id, user_id)`

**RLS Policies:**

| Policy | Operação | Regra |
|---|---|---|
| `store_members_select` | SELECT | `is_store_member(store_id)` |
| `store_members_insert_owner` | INSERT | `is_store_owner(store_id)` |
| `store_members_update_owner` | UPDATE | `is_store_owner(store_id)` |
| `store_members_delete_owner` | DELETE | `is_store_owner(store_id)` |

---

### `categories`
>
> Categorias de produtos. `sort_order` permite reordenação pelo lojista.

| Coluna | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | `uuid` | ✅ PK | `gen_random_uuid()` | — |
| `store_id` | `uuid` | ✅ FK→`stores` | — | Loja proprietária |
| `name` | `text` | ✅ | — | Nome da categoria |
| `sort_order` | `integer` | ✅ | `0` | Ordem de exibição |
| `created_at` | `timestamptz` | ✅ | `now()` | — |

**RLS Policies:**

| Policy | Operação | Regra |
|---|---|---|
| `categories_select_public` | SELECT | `true` (público) |
| `categories_insert_member` | INSERT | `is_store_member(store_id)` |
| `categories_update_member` | UPDATE | `is_store_member(store_id)` |
| `categories_delete_member` | DELETE | `is_store_member(store_id)` |

---

### `products`
>
> Produtos de cada tenant. `specifications` é flexível por nicho.

| Coluna | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | `uuid` | ✅ PK | `gen_random_uuid()` | — |
| `store_id` | `uuid` | ✅ FK→`stores` | — | Loja proprietária |
| `category_id` | `uuid` | — FK→`categories` | `NULL` | Categoria (opcional) |
| `name` | `text` | ✅ | — | Nome do produto |
| `description` | `text` | — | `NULL` | Descrição longa |
| `price` | `numeric` | ✅ | — | Preço normal (≥ 0) |
| `promo_price` | `numeric` | — | `NULL` | Preço promocional (≥ 0) |
| `image_urls` | `text[]` | ✅ | `{}` | URLs das fotos no Storage |
| `specifications` | `jsonb` | ✅ | `[]` | Array de `{label, value}` — atributos livres |
| `variation_options` | `jsonb` | — | `NULL` | Variações disponíveis ex: `{Cor: [Azul, Preto]}` |
| `stock` | `integer` | — | `0` | Estoque disponível |
| `highlighted` | `boolean` | — | `false` | Produto em destaque |
| `active` | `boolean` | ✅ | `true` | Visível no cardápio |
| `deleted_at` | `timestamptz` | — | `NULL` | Soft delete |
| `created_at` | `timestamptz` | ✅ | `now()` | — |
| `updated_at` | `timestamptz` | ✅ | `now()` | — |

**Exemplo de `specifications`:**

```json
[
  { "label": "Tamanho", "value": "M" },
  { "label": "Cor", "value": "Azul" }
]
```

**Exemplo de `variation_options`:**

```json
{ "Cor": ["Azul", "Preto"], "Tamanho": ["P", "M", "G"] }
```

**RLS Policies:**

| Policy | Operação | Roles | Regra |
|---|---|---|---|
| `products_select_public` | SELECT | public | `active = true AND deleted_at IS NULL` |
| `products_select_member` | SELECT | public | `is_store_member(store_id)` (vê inativos/deletados) |
| `products_insert_owner` | INSERT | authenticated | `store_id IN (stores onde owner_id = auth.uid())` |
| `products_update_member` | UPDATE | public | `is_store_member(store_id)` |
| `products_delete_member` | DELETE | public | `is_store_member(store_id)` |

---

### `orders`
>
> Pedidos recebidos. Nunca são deletados — use status `cancelled`.

| Coluna | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | `uuid` | ✅ PK | `gen_random_uuid()` | — |
| `store_id` | `uuid` | ✅ FK→`stores` | — | Loja que recebeu o pedido |
| `customer_name` | `text` | — | `NULL` | Nome do cliente |
| `customer_whatsapp` | `text` | ✅ | — | WhatsApp para contato/notificação |
| `status` | `text` | ✅ | `'pending'` | Ver fluxo abaixo |
| `total` | `numeric` | ✅ | — | Valor total (≥ 0) |
| `subtotal` | `numeric` | — | `0` | Valor dos itens sem taxa |
| `delivery_fee` | `numeric` | ✅ | `0` | Taxa de entrega aplicada |
| `delivery_method` | `text` | — | `NULL` | `delivery` ou `pickup` |
| `address` | `text` | — | `NULL` | Endereço de entrega |
| `pix_payload` | `text` | — | `NULL` | Payload PIX copia-e-cola gerado no pedido |
| `notes` | `text` | — | `NULL` | Observações do cliente |
| `created_at` | `timestamptz` | ✅ | `now()` | — |
| `updated_at` | `timestamptz` | ✅ | `now()` | — |

**Fluxo de status:**

```
pending → confirmed → ready → delivered
                            ↘ cancelled (qualquer etapa)
```

**RLS Policies:**

| Policy | Operação | Regra |
|---|---|---|
| `orders_insert_anon` | INSERT | `true` (clientes anônimos criam pedidos) |
| `Public View Order Status` | SELECT | `true` (cliente acompanha status) |
| `orders_select_member` | SELECT | `is_store_member(store_id)` |
| `orders_update_member` | UPDATE | `is_store_member(store_id)` |
| `Owner Manage Orders` | ALL | membro de `store_members` para a loja |

---

### `order_items`
>
> Itens do pedido. `unit_price` e `specs_snapshot` são imutáveis após criação — preservam o estado histórico do produto no momento da compra.

| Coluna | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | `uuid` | ✅ PK | `gen_random_uuid()` | — |
| `order_id` | `uuid` | ✅ FK→`orders` | — | Pedido pai |
| `product_id` | `uuid` | — FK→`products` | `NULL` | Produto original (pode ser `NULL` se deletado) |
| `product_name` | `text` | ✅ | — | Nome snapshot no momento da compra |
| `unit_price` | `numeric` | ✅ | — | Preço snapshot (≥ 0) |
| `quantity` | `integer` | ✅ | — | Quantidade (> 0) |
| `specs_snapshot` | `jsonb` | ✅ | `{}` | Variações/especificações escolhidas |
| `created_at` | `timestamptz` | — | — | — |

**RLS Policies:**

| Policy | Operação | Regra |
|---|---|---|
| `order_items_insert_anon` | INSERT | `true` (cliente anônimo insere junto ao pedido) |
| `order_items_select_member` | SELECT | membro da loja do pedido pai |

---

### `store_status_messages`
>
> Mensagens WhatsApp automáticas por status de pedido, personalizáveis por loja.

| Coluna | Tipo | Obrigatório | Padrão |
|---|---|---|---|
| `store_id` | `uuid` | ✅ PK FK→`stores` | — |
| `pending` | `text` | ✅ | Mensagem padrão de recebimento |
| `confirmed` | `text` | ✅ | Mensagem com link de pagamento |
| `ready` | `text` | ✅ | Mensagem de aguardando pagamento |
| `completed_delivery` | `text` | — | Mensagem de pedido saiu para entrega |
| `completed_pickup` | `text` | — | Mensagem de pedido pronto para retirada |
| `cancelled` | `text` | ✅ | Mensagem de cancelamento |
| `updated_at` | `timestamptz` | — | `now()` |

**Variáveis de template disponíveis:** `{nome}`, `{id}`, `{infos_pagamento}`

**RLS Policy:**

| Policy | Operação | Regra |
|---|---|---|
| `members only` | ALL | membro de `store_members` para a loja |

---

## Funções RLS Auxiliares

As policies usam duas funções helper (não retornadas pela API, mas inferidas do uso):

```sql
-- Verifica se o usuário autenticado é membro da loja
is_store_member(store_id uuid) → boolean

-- Verifica se o usuário autenticado é owner da loja
is_store_owner(store_id uuid) → boolean
```

---

## Resumo de Permissões por Perfil

| Operação | Anônimo (cliente) | Editor | Owner |
|---|---|---|---|
| Ver loja/produtos ativos | ✅ | ✅ | ✅ |
| Ver todos os produtos (inativos) | ❌ | ✅ | ✅ |
| Criar pedido | ✅ | ✅ | ✅ |
| Gerenciar pedidos | ❌ | ✅ | ✅ |
| Criar/editar produtos | ❌ | ✅ | ✅ |
| Gerenciar membros | ❌ | ❌ | ✅ |
| Deletar loja | ❌ | ❌ | ✅ |

---

## Contagem Atual de Registros

| Tabela | Linhas |
|---|---|
| `stores` | 2 |
| `store_members` | 2 |
| `categories` | 11 |
| `products` | 60 |
| `orders` | 21 |
| `order_items` | 21 |
| `store_status_messages` | 2 |
