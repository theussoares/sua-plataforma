// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/image',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    'nuxt-icons',
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss',
  ],

  supabase: { redirect: false },

  runtimeConfig: {
    allowedOrigins: process.env.ALLOWED_ORIGINS ?? '',
  },

  routeRules: {
    // Endpoints admin: nunca cross-origin
    '/api/admin/**': {
      headers: { 'Access-Control-Allow-Origin': 'none' },
    },
    // Endpoints públicos: permitem CORS via ALLOWED_ORIGINS
    '/api/shop/**': {
      headers: { 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' },
    },
    '/api/stores/**': {
      headers: { 'Access-Control-Allow-Methods': 'GET,OPTIONS' },
    },
    '/api/products/**': {
      headers: { 'Access-Control-Allow-Methods': 'GET,OPTIONS' },
    },
  },

  vite: {
    optimizeDeps: {
      include: ['clsx', 'tailwind-merge'],
    },
  },
})
