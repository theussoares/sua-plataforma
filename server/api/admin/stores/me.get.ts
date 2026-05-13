import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', user.id)
    .is('deleted_at', null)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar lojas.' })
  }

  return { success: true, data: stores ?? [] }
})
