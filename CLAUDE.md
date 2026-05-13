# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **pnpm** as the package manager (pnpm-lock.yaml is the lockfile).

```bash
pnpm install       # Install dependencies
pnpm dev           # Start dev server at http://localhost:3000
pnpm build         # Production build
pnpm preview       # Preview production build locally
```

No linting, formatting, or test tooling is configured.

## Architecture

**Cardápio Local** is a multi-tenant e-commerce SaaS. Store owners manage their catalog and orders via a dashboard; customers browse storefronts via dynamic slugs (e.g., `/[slug]`).

### Layer Structure (Nuxt Layers)

The project uses [Nuxt Layers](https://nuxt.com/docs/getting-started/layers) to separate the two applications:

- **`layers/dashboard/`** — Admin interface: product/category/order management, store settings, auth
- **`layers/shop/`** — Customer storefront: product browsing, cart, checkout, order tracking

Both layers inherit from the root app (`app/`, `server/`, `nuxt.config.ts`).

### Backend (Nitro + Supabase)

Server code lives in `server/` with a three-tier pattern:

```
server/api/           → Nitro route handlers (file-based routing)
  admin/              → Admin endpoints (products, orders, stats, stores)
  shop/               → Shop endpoints (orders, product lookups)
server/repositories/  → Direct Supabase queries (factory pattern: createXRepository(client))
server/services/      → Business logic that orchestrates repositories
```

Repositories are created via factory functions that receive a Supabase client. The `unwrap` and `handleSupabaseError` utilities in `app/utils/` standardize error handling across the server.

### Frontend (Vue 3 + Pinia)

```
app/types/app.ts       → Core domain types (Store, Product, Order, Cart, etc.)
app/types/database.ts  → Supabase schema mirror types (DbStore, DbProduct, etc.)
app/utils/             → Shared utilities (currency formatting, error handling)
app/components/ui/     → Base UI primitives (Button, Card)

layers/shop/app/
  pages/[slug]/        → Dynamic storefront routes
  features/showcase/   → Product browsing (components, composables, Pinia stores)
  features/checkout/   → Order flow (components, composables)
  stores/              → useStoreCart, useStoreProducts

layers/dashboard/app/
  pages/               → Admin pages (login, dashboard, products, orders, settings)
  components/          → Admin-specific modals, toasts, product manager
  composables/         → useAdminAuth, useAdminProductsList
  middleware/          → adminAuth.global.ts (global route guard)
  stores/              → useUi
```

### Key Conventions

- **Components**: Pure UI (props in, emits out). No direct API calls inside components.
- **Composables**: Encapsulate business logic, API calls, and reactive state. Feature-scoped under `features/<name>/composables/`.
- **Pinia Stores**: Application-level persistent state (cart, product list).
- **Types**: Always map between `DbX` types (raw Supabase schema) and domain types (`X`) — the conversion happens in repositories/services.

## Stack

| Concern | Technology |
|---|---|
| Framework | Nuxt 4 + Vue 3 |
| Language | TypeScript |
| Backend runtime | Nitro |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (`@nuxtjs/supabase`, redirect disabled in config) |
| State | Pinia (`@pinia/nuxt`) |
| Styling | Tailwind CSS 3.4 (theme colors via CSS variables in `tailwind.config.ts`) |
| Images | `@nuxt/image` |
| Icons | `nuxt-icons` |

## Database Schema (Supabase)

Tables: `stores`, `products`, `categories`, `orders`, `order_items`, `store_status_messages`.

`order_items` stores product snapshots at purchase time (not live references) to preserve historical accuracy. See `app/types/database.ts` for the full schema mirror.
