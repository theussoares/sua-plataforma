import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { productService } from '~~/server/services/product.service'
import { validateBody, z } from '~~/server/utils/validate'

const CreateProductSchema = z.object({
  store_id: z.string().uuid('store_id inválido.'),
  name: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  description: z.string().max(2000).nullable().optional(),
  promo_price: z.number().nonnegative().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  active: z.boolean().optional().default(true),
  highlighted: z.boolean().optional().default(false),
  image_urls: z.array(z.string().url()).max(5).optional().default([]),
  specifications: z.array(z.object({ label: z.string(), value: z.string() })).optional().default([]),
  variation_options: z.record(z.array(z.string())).optional().default({}),
  stock: z.number().int().nonnegative().optional().default(0),
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, CreateProductSchema)

  // Valida que o usuário tem acesso à loja via RLS
  const userClient = await serverSupabaseClient(event)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (!user || authError) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const { data: storeAccess } = await userClient
    .from('stores')
    .select('id')
    .eq('id', body.store_id)
    .single()

  if (!storeAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Você não tem permissão para adicionar produtos nesta loja.' })
  }

  // Usa service role para criar (contorna RLS de insert que requer owner_id)
  const adminClient = await serverSupabaseServiceRole(event)

  try {
    const product = await productService.create(adminClient, {
      store_id: body.store_id,
      name: body.name,
      description: body.description ?? null,
      price: body.price,
      promo_price: body.promo_price ?? null,
      category_id: body.category_id ?? null,
      active: body.active,
      highlighted: body.highlighted,
      image_urls: body.image_urls,
      specifications: body.specifications,
      variation_options: body.variation_options,
      stock: body.stock,
    })
    return { success: true, data: product }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Erro ao criar produto.' })
  }
})
