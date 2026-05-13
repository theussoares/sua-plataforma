export default defineNitroPlugin(() => {
  const required = [
    'SUPABASE_SERVICE_KEY',
    'NUXT_PUBLIC_SUPABASE_URL',
    'NUXT_PUBLIC_SUPABASE_ANON_KEY',
  ]
  const missing = required.filter(k => !process.env[k])
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`)
  }
})
