import { serverSupabaseClient } from '#supabase/server'
import { productService } from '~~/server/services/product.service'

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const storeId = query.storeId as string
  const q = query.q as string | undefined
  const categoryId = query.categoryId as string | undefined
  const page = query.page ? parseInt(query.page as string) : 1
  const limit = query.limit ? parseInt(query.limit as string) : 5

  if (!storeId) {
    throw createError({ statusCode: 400, statusMessage: 'O parâmetro storeId é obrigatório' })
  }

  const supabase = await serverSupabaseClient(event)
  const result = await productService.getAll(supabase, storeId, { query: q, categoryId, page, limit })

  return { success: true, data: result.data, total: result.total, page, limit }
}, {
  maxAge: 60 * 2, // 2 minutos
  staleMaxAge: 60 * 30,
  getKey: (event) => {
    const q = getQuery(event)
    return `products:${q.storeId}:${q.page ?? 1}:${q.limit ?? 5}:${q.categoryId ?? ''}:${q.q ?? ''}`
  },
  shouldBypassCache: () => false,
})
