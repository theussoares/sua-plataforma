<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Criar Nova Senha
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Digite sua nova senha abaixo para atualizar seu acesso
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-gray-200">
        <div v-if="successMsg" class="bg-green-50 text-green-700 p-4 rounded-lg text-sm font-medium border border-green-100 text-center">
          <p>{{ successMsg }}</p>
          <NuxtLink to="/dashboard/login" class="mt-3 inline-block font-bold underline">Fazer Login</NuxtLink>
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleUpdatePassword">
          <div v-if="errorMsg" class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
            {{ errorMsg }}
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Nova Senha</label>
            <div class="mt-1">
              <input
                id="password"
                type="password"
                required
                v-model="password"
                minlength="6"
                class="appearance-none block w-full px-4 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label for="passwordConfirm" class="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
            <div class="mt-1">
              <input
                id="passwordConfirm"
                type="password"
                required
                v-model="passwordConfirm"
                minlength="6"
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
              {{ loading ? 'Atualizando...' : 'Atualizar Senha' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useHead } from '#imports'

definePageMeta({ layout: false })
useHead({ title: 'Nova Senha - Dashboard' })

const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const handleUpdatePassword = async () => {
  if (password.value !== passwordConfirm.value) {
    errorMsg.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    await $fetch('/api/auth/update-password', {
      method: 'POST',
      body: { password: password.value },
    })
    successMsg.value = 'Sua senha foi atualizada com sucesso!'
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage ?? 'Erro ao atualizar senha.'
  } finally {
    loading.value = false
  }
}
</script>
