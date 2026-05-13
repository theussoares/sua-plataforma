// repositories/product.repository.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DbProduct } from '~/types/database'
import type { Product } from '~/types/app'
import { unwrap } from '~/utils/errors'

// O join com categories nos dá o nome da categoria junto
// sem precisar de uma segunda query
type DbProductWithCategory = DbProduct & {
    categories: { name: string } | null
}

function toProduct(db: DbProductWithCategory): Product {
    return {
        id: db.id,
        storeId: db.store_id,
        categoryId: db.category_id,
        categoryName: db.categories?.name ?? null,
        name: db.name,
        description: db.description,
        price: db.price,
        promoPrice: db.promo_price,
        imageUrls: db.image_urls,
        highlighted: db.highlighted,
        stock: db.stock,
        specifications: db.specifications,
        active: db.active,
        variationOptions: db.variation_options,
    }
}

export function createProductRepository(client: SupabaseClient) {
    return {
        // Vitrine pública: todos os produtos ativos de uma loja
        async findByStore(storeId: string, options?: { query?: string; categoryId?: string; page?: number; limit?: number; includeInactive?: boolean }): Promise<{ data: Product[]; total: number }> {
            let qb = client
                .from('products')
                .select('*, categories(name)', { count: 'exact' })
                .eq('store_id', storeId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            if (!options?.includeInactive) {
                qb = qb.eq('active', true)
            }

            if (options?.categoryId && options.categoryId !== 'all') {
                qb = qb.eq('category_id', options.categoryId)
            }

            if (options?.query) {
                qb = qb.ilike('name', `%${options.query}%`)
            }

            const page = options?.page ?? 1
            const limit = options?.limit ?? 5
            const from = (page - 1) * limit
            const to = from + limit - 1

            qb = qb.range(from, to)

            const result = await qb.returns<DbProductWithCategory[]>()

            if (result.error) throw result.error
            return {
                data: (result.data ?? []).map(toProduct),
                total: result.count ?? 0,
            }
        },

        // Busca produtos de uma loja filtrados por categoria
        async findByCategory(storeId: string, categoryId: string): Promise<Product[]> {
            const result = await client
                .from('products')
                .select('*, categories(name)')
                .eq('store_id', storeId)
                .eq('category_id', categoryId)
                .eq('active', true)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .returns<DbProductWithCategory[]>()

            return unwrap(result).map(toProduct)
        },

        // Busca um produto específico pelo id
        async findById(productId: string): Promise<Product> {
            const result = await client
                .from('products')
                .select('*, categories(name)')
                .eq('id', productId)
                .is('deleted_at', null)
                .returns<DbProductWithCategory[]>()
                .single()

            return toProduct(unwrap(result))
        },

        // Busca por nome (painel do lojista)
        async search(storeId: string, query: string): Promise<Product[]> {
            const result = await client
                .from('products')
                .select('*, categories(name)')
                .eq('store_id', storeId)
                .is('deleted_at', null)
                .ilike('name', `%${query}%`)
                .returns<DbProductWithCategory[]>()

            return unwrap(result).map(toProduct)
        },

        // Busca por especificação JSONB (ex: todos os produtos azuis)
        // specifications @> '[{"label":"Cor","value":"Azul"}]'
        async findBySpec(storeId: string, label: string, value: string): Promise<Product[]> {
            const filter = JSON.stringify([{ label, value }])

            const result = await client
                .from('products')
                .select('*, categories(name)')
                .eq('store_id', storeId)
                .eq('active', true)
                .is('deleted_at', null)
                .contains('specifications', filter)
                .returns<DbProductWithCategory[]>()

            return unwrap(result).map(toProduct)
        },

        // Criação de um novo produto (painel do lojista)
        async create(productData: Omit<DbProduct, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Product> {
            const result = await client
                .from('products')
                .insert([productData])
                .select('*, categories(name)')
                .returns<DbProductWithCategory[]>()
                .single()

            return toProduct(unwrap(result))
        },

        // Atualização de um produto existente (painel do lojista)
        async update(productId: string, storeId: string, productData: Partial<Omit<DbProduct, 'id' | 'store_id' | 'created_at' | 'deleted_at'>>): Promise<Product> {
            const result = await client
                .from('products')
                .update({ ...productData, updated_at: new Date().toISOString() })
                .eq('id', productId)
                .eq('store_id', storeId) // Security: ensure store owns the product
                .select('*, categories(name)')
                .returns<DbProductWithCategory[]>()
                .single()

            return toProduct(unwrap(result))
        },

        // Exclusão lógica (soft delete) (painel do lojista)
        async softDelete(productId: string, storeId: string): Promise<void> {
            const result = await client
                .from('products')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', productId)
                .eq('store_id', storeId)
                .select()

            unwrap(result)
        }
    }
}

export type ProductRepository = ReturnType<typeof createProductRepository>