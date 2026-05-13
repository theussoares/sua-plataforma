import { useState, useSupabaseUser, navigateTo } from '#imports'

export const useAdminAuth = () => {
  const storeId = useState<string | null>('admin-store-id', () => null)
  const userStores = useState<{ id: string; name: string }[]>('admin-user-stores', () => [])
  const user = useSupabaseUser()

  const loadSession = async () => {
    if (storeId.value) return true

    try {
      const result = await $fetch<{ success: boolean; data: { id: string; name: string }[] }>('/api/admin/stores/me')
      if (result.data && result.data.length > 0) {
        userStores.value = result.data
        if (!storeId.value) storeId.value = result.data[0].id
        return true
      }
      console.warn('Usuário autenticado mas sem lojas cadastradas.')
      return false
    } catch {
      return false
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      storeId.value = null
      userStores.value = []
      navigateTo('/dashboard/login')
    }
  }

  const switchStore = (id: string) => {
    storeId.value = id
  }

  return {
    storeId,
    userStores,
    user,
    loadSession,
    logout,
    switchStore,
  }
}
