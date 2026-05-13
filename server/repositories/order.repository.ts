import type { SupabaseClient } from '@supabase/supabase-js'
import type { DbOrderItem, OrderStatus } from '~/types/database'
import type { Order, CreateOrderPayload, OrderItem } from '~/types/app'
import { unwrap } from '~/utils/errors'
import { generatePixPayload } from '~~/server/utils/pix'

export function createOrderRepository(client: SupabaseClient) {
    const mapToOrder = (db: any): Order => ({
        id: db.id,
        storeId: db.store_id,
        customerName: db.customer_name || '',
        customerWhatsapp: db.customer_whatsapp || '',
        deliveryMethod: db.delivery_method || '',
        address: db.address || '',
        subtotal: Number(db.subtotal),
        deliveryFee: Number(db.delivery_fee),
        total: Number(db.total),
        status: db.status,
        items: db.order_items?.map(mapToOrderItem),
        createdAt: db.created_at,
    })

    const mapToOrderItem = (db: DbOrderItem): OrderItem => ({
        id: db.id,
        productId: db.product_id,
        productName: db.product_name,
        unitPrice: Number(db.unit_price),
        quantity: db.quantity,
        specsSnapshot: db.specs_snapshot as Record<string, string | string[]>,
    })

    return {
        async createOrder(payload: CreateOrderPayload) {
            // Busca metadados da loja para gerar PIX e snapshot de nomes
            const { data: store } = await client
                .from('stores')
                .select('pix_key, name')
                .eq('id', payload.storeId)
                .single()

            // Snapshot dos nomes dos produtos
            const productIds = payload.items.map(i => i.productId)
            const { data: products } = await client
                .from('products')
                .select('id, name')
                .in('id', productIds)

            const productNameMap = Object.fromEntries(
                (products || []).map(p => [p.id, p.name])
            )

            // Gera payload PIX se a loja tiver chave cadastrada
            const pixPayload = store?.pix_key
                ? generatePixPayload(store.pix_key, store.name)
                : null

            const orderResult = await client
                .from('orders')
                .insert({
                    store_id: payload.storeId,
                    customer_name: payload.customerName,
                    customer_whatsapp: payload.customerWhatsapp,
                    delivery_method: payload.deliveryMethod,
                    address: payload.address,
                    subtotal: payload.subtotal,
                    delivery_fee: payload.deliveryFee,
                    total: payload.total,
                    pix_payload: pixPayload,
                    status: 'pending',
                })
                .select()
                .single()

            if (orderResult.error) throw orderResult.error
            const order = orderResult.data

            const itemsToInsert = payload.items.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                product_name: productNameMap[item.productId] || 'Produto Removido',
                unit_price: item.priceAtTime,
                quantity: item.quantity,
                specs_snapshot: item.selectedSpecs,
            }))

            const itemsResult = await client.from('order_items').insert(itemsToInsert)
            if (itemsResult.error) throw itemsResult.error

            return mapToOrder({ ...order, order_items: itemsToInsert })
        },

        async getOrderById(id: string): Promise<Order> {
            const result = await client
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', id)
                .single()

            return mapToOrder(unwrap(result))
        },

        async getOrdersByStore(storeId: string) {
            const result = await client
                .from('orders')
                .select('*, order_items(*)')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false })

            return unwrap(result).map(mapToOrder)
        },

        async updateStatus(orderId: string, status: OrderStatus, storeId: string) {
            const currentResult = await client
                .from('orders')
                .select('status')
                .eq('id', orderId)
                .single()
            const currentStatus = unwrap(currentResult).status

            if (status === 'delivered' && currentStatus !== 'delivered') {
                const itemsResult = await client
                    .from('order_items')
                    .select('product_id, quantity')
                    .eq('order_id', orderId)

                const items = unwrap(itemsResult) as any[]

                for (const item of items) {
                    if (!item.product_id) continue

                    // Decremento atômico — evita race condition entre concorrentes
                    await client.rpc('decrement_stock', {
                        p_product_id: item.product_id,
                        p_quantity: item.quantity,
                    })
                }
            }

            const result = await client
                .from('orders')
                .update({ status })
                .eq('id', orderId)
                .eq('store_id', storeId)
                .select()
                .single()

            return mapToOrder(unwrap(result))
        },

        async getStats(storeId: string, startDate?: string, endDate?: string) {
            const applyFilters = (q: any) => {
                let filtered = q.eq('store_id', storeId)
                if (startDate) filtered = filtered.gte('created_at', startDate)
                if (endDate) filtered = filtered.lte('created_at', endDate)
                return filtered
            }

            const { data: salesData } = await applyFilters(
                client.from('orders').select('total')
            ).eq('status', 'delivered')

            const totalSales = salesData?.reduce((acc: number, curr: any) => acc + Number(curr.total), 0) ?? 0

            const { count: totalOrders } = await applyFilters(
                client.from('orders').select('*', { count: 'exact', head: true })
            )

            const { count: pendingOrders } = await applyFilters(
                client.from('orders').select('*', { count: 'exact', head: true })
            ).eq('status', 'pending')

            return {
                totalSales,
                totalOrders: totalOrders ?? 0,
                pendingOrders: pendingOrders ?? 0,
            }
        },
    }
}
