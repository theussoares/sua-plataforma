<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Painel do Lojista
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Acesse para gerenciar seu catálogo
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-gray-200">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div v-if="errorMsg" class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
            {{ errorMsg }}
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">E-mail</label>
            <div class="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                v-model="email"
                class="appearance-none block w-full px-4 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <label for="password" class="block text-sm font-medium text-gray-700">Senha</label>
              <NuxtLink to="/dashboard/recover" class="text-sm font-medium text-blue-600 hover:underline">
                Esqueceu a senha?
              </NuxtLink>
            </div>
            <div class="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                v-model="password"
                class="appearance-none block w-full px-4 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 transition-colors"
            >
              {{ loading ? 'Entrando...' : 'Entrar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo, useHead } from '#imports'

definePageMeta({ layout: false })
useHead({ title: 'Login - Dashboard' })

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo('/dashboard')
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage ?? 'Erro ao conectar no servidor.'
  } finally {
    loading.value = false
  }
}
</script>
