import { serverSupabaseClient } from '#supabase/server'
import { validateBody, z } from '~~/server/utils/validate'

const UpdatePasswordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, UpdatePasswordSchema)
  const supabase = await serverSupabaseClient(event)

  const { error } = await supabase.auth.updateUser({ password: body.password })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: 'Sessão expirada ou inválida. Solicite um novo link de recuperação.' })
  }

  return { success: true }
})
