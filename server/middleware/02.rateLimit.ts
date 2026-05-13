interface RateLimitEntry { count: number; resetAt: number }

const store = new Map<string, RateLimitEntry>()

const rules: Array<{ pattern: RegExp; method?: string; maxRequests: number; windowMs: number }> = [
  { pattern: /^\/api\/shop\/orders\/create/, method: 'POST', maxRequests: 10, windowMs: 60_000 },
  { pattern: /^\/api\/auth\/login/, method: 'POST', maxRequests: 5, windowMs: 60_000 },
  { pattern: /^\/api\/auth\/recover/, method: 'POST', maxRequests: 3, windowMs: 60_000 },
]

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const method = getMethod(event)

  const rule = rules.find(r =>
    r.pattern.test(url.pathname) && (!r.method || r.method === method)
  )
  if (!rule) return

  const ip = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
    ?? getHeader(event, 'x-real-ip')
    ?? 'unknown'

  const key = `${ip}:${url.pathname}`
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + rule.windowMs })
    return
  }

  entry.count++
  if (entry.count > rule.maxRequests) {
    setResponseHeader(event, 'Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
    throw createError({ statusCode: 429, statusMessage: 'Muitas requisições. Tente novamente em instantes.' })
  }
})
