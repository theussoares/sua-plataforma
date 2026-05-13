import { serverSupabaseClient } from '#supabase/server'
import { storeService } from '~~/server/services/store.service'

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = query.slug as string

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'O parâmetro slug é obrigatório' })
  }

  try {
    const supabase = await serverSupabaseClient(event)
    const store = await storeService.getStoreBySlug(supabase, slug)
    return { success: true, data: store }
  } catch (error: any) {
    // Slug não encontrado → 404 explícito para a vitrine renderizar a tela correta
    throw createError({
      statusCode: error.message?.includes('não encontrad') || error.code === 'PGRST116' ? 404 : 500,
      statusMessage: error.message || 'Loja não encontrada.',
    })
  }
}, {
  maxAge: 60 * 5, // 5 minutos
  staleMaxAge: 60 * 60,
  getKey: (event) => `store:slug:${getQuery(event).slug}`,
  shouldBypassCache: () => false,
})
