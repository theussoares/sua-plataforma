<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between gap-2 mt-4">
    <p class="text-sm text-gray-500 hidden sm:block">
      {{ rangeStart }}–{{ rangeEnd }} de {{ total }} itens
    </p>

    <div class="flex items-center gap-1">
      <button
        @click="$emit('change', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Anterior
      </button>

      <template v-for="page in visiblePages" :key="page">
        <span v-if="page === '...'" class="px-2 text-gray-400 select-none">…</span>
        <button
          v-else
          @click="$emit('change', page as number)"
          :class="[
            'min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition',
            page === currentPage
              ? 'bg-blue-600 text-white border border-blue-600'
              : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
          ]"
        >
          {{ page }}
        </button>
      </template>

      <button
        @click="$emit('change', currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Próxima
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentPage: number
  total: number
  limit: number
}>()

defineEmits<{ change: [page: number] }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
const rangeStart = computed(() => Math.min((props.currentPage - 1) * props.limit + 1, props.total))
const rangeEnd = computed(() => Math.min(props.currentPage * props.limit, props.total))

const visiblePages = computed<(number | '...')[]>(() => {
  const total = totalPages.value
  const cur = props.currentPage
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})
</script>
