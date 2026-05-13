import { serverSupabaseServiceRole } from '#supabase/server'
import { validateBody, z } from '~~/server/utils/validate'
import { logger } from '~~/server/utils/logger'

const RecoverSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  redirectTo: z.string().url().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, RecoverSchema)
  const adminClient = await serverSupabaseServiceRole(event)

  // Verifica se o e-mail existe antes de disparar o reset
  // Para escala maior, substituir por: SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = $1)
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 })

  if (listError) {
    logger.error('Erro ao listar usuários no recover', { error: listError.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro interno. Tente novamente.' })
  }

  const emailExists = users.some(u => u.email?.toLowerCase() === body.email.toLowerCase())
  if (!emailExists) {
    throw createError({ statusCode: 404, statusMessage: 'Nenhuma conta encontrada com este e-mail.' })
  }

  const { error } = await adminClient.auth.resetPasswordForEmail(body.email, {
    redirectTo: body.redirectTo,
  })

  if (error) {
    logger.error('Erro ao enviar e-mail de recuperação', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao enviar e-mail. Tente novamente.' })
  }

  return { success: true }
})
