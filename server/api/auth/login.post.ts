import { serverSupabaseClient } from '#supabase/server'
import { validateBody, z } from '~~/server/utils/validate'
import { logger } from '~~/server/utils/logger'

const LoginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha obrigatória.'),
})

const authErrors: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de acessar.',
  too_many_requests: 'Muitas tentativas. Aguarde alguns minutos.',
  user_not_found: 'E-mail ou senha incorretos.',
}

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, LoginSchema)
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  })

  if (error) {
    const code = (error as any).code ?? ''
    const message = authErrors[code] ?? 'E-mail ou senha incorretos.'
    logger.warn('Login falhou', { email: body.email, code })
    throw createError({ statusCode: 401, statusMessage: message })
  }

  return { success: true, userId: data.user?.id }
})
