import { serverSupabaseClient } from '#supabase/server'
import { createOrderRepository } from '../../../repositories/order.repository'
import { validateBody, z } from '~~/server/utils/validate'
import { logger } from '~~/server/utils/logger'

const whatsappRegex = /^\+?[\d\s\-().]{8,20}$/

const CreateOrderSchema = z.object({
  storeId: z.string().uuid('storeId inválido.'),
  customerName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(100),
  customerWhatsapp: z.string().regex(whatsappRegex, 'WhatsApp inválido.'),
  deliveryMethod: z.enum(['home', 'pickup']),
  address: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    priceAtTime: z.number().nonnegative(),
    selectedSpecs: z.record(z.union([z.string(), z.array(z.string())])),
  })).min(1, 'O pedido deve ter pelo menos 1 item.'),
  subtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().nonnegative(),
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, CreateOrderSchema)

  // Usa o client anônimo — RLS orders_insert_anon já permite criação sem auth
  const client = await serverSupabaseClient(event)
  const repo = createOrderRepository(client)

  try {
    const order = await repo.createOrder(body)
    return order
  } catch (e: any) {
    logger.error('Erro ao criar pedido', { storeId: body.storeId, error: e.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao processar pedido.' })
  }
})
