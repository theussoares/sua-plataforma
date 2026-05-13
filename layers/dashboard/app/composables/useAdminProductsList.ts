import { computed, ref } from 'vue'
import { useFetch } from '#imports'
import { useAdminAuth } from './useAdminAuth'
import { useUiStore } from '../stores/useUi'
import type { Product } from '~/types/app'

const PAGE_LIMIT = 20

export const useAdminProductsList = async () => {
    const { storeId } = useAdminAuth()
    const ui = useUiStore()

    const page = ref(1)
    const searchQuery = ref('')
    const categoryFilter = ref('')

    const { data, pending, refresh } = await useFetch('/api/admin/products', {
        params: computed(() => ({
            storeId: storeId.value,
            page: page.value,
            limit: PAGE_LIMIT,
            q: searchQuery.value || undefined,
            categoryId: categoryFilter.value || undefined,
        })),
    })

    const products = computed(() => (data.value?.data as Product[]) ?? [])
    const total = computed(() => (data.value as any)?.total ?? 0)
    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_LIMIT)))

    const goToPage = (p: number) => {
        if (p < 1 || p > totalPages.value) return
        page.value = p
    }

    const handleDelete = async (id: string) => {
        try {
            await $fetch(`/api/admin/products/${id}`, {
                method: 'DELETE',
                params: { storeId: storeId.value },
            })
            await refresh()
            ui.addToast('Produto excluído com sucesso!')
        } catch (e: any) {
            ui.addToast('Erro ao excluir produto: ' + (e.data?.statusMessage ?? e.message), 'error')
        }
    }

    return {
        products,
        pending,
        total,
        page,
        totalPages,
        limit: PAGE_LIMIT,
        searchQuery,
        categoryFilter,
        goToPage,
        refresh,
        handleDelete,
    }
}
