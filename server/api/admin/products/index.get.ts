import { serverSupabaseClient } from '#supabase/server'
import { productService } from '~~/server/services/product.service'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const storeId = query.storeId as string
    const q = query.q as string | undefined
    const categoryId = query.categoryId as string | undefined
    const page = query.page ? parseInt(query.page as string) : 1
    const limit = Math.min(query.limit ? parseInt(query.limit as string) : 20, 100)

    if (!storeId) {
      throw createError({ statusCode: 400, statusMessage: 'O parâmetro storeId é obrigatório' })
    }

    const supabase = await serverSupabaseClient(event)
    const result = await productService.getAll(supabase, storeId, {
      query: q,
      categoryId,
      page,
      limit,
      includeInactive: true,
    })

    return { success: true, data: result.data, total: result.total, page, limit }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode ?? 500, statusMessage: error.statusMessage ?? error.message })
  }
})
