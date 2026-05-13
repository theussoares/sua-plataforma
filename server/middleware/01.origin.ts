export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (!url.pathname.startsWith('/api/')) return

  const origin = getHeader(event, 'origin')
  if (!origin) return // server-side (SSR) calls — allow

  const rawAllowed = process.env.ALLOWED_ORIGINS ?? ''
  if (!rawAllowed) return // não configurado — permissivo (dev)

  const allowed = rawAllowed.split(',').map(s => s.trim()).filter(Boolean)
  if (!allowed.includes(origin)) {
    throw createError({ statusCode: 403, statusMessage: 'Origem não autorizada.' })
  }
})
