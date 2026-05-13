import { z } from 'zod'

export { z }

export async function validateBody<T>(event: any, schema: z.ZodSchema<T>): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
    throw createError({ statusCode: 400, statusMessage: `Dados inválidos: ${messages}` })
  }
  return result.data
}

export function validateQuery<T>(event: any, schema: z.ZodSchema<T>): T {
  const query = getQuery(event)
  const result = schema.safeParse(query)
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
    throw createError({ statusCode: 400, statusMessage: `Parâmetros inválidos: ${messages}` })
  }
  return result.data
}
