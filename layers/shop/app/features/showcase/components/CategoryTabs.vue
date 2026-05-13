<template>
  <div
    class="flex items-center gap-2 overflow-x-auto pb-3 pt-2 px-1 scrollbar-hide"
    role="tablist"
    aria-label="Categorias de produtos"
  >
    <button
      v-for="category in categories"
      :key="category.id"
      @click="$emit('select', category.id)"
      role="tab"
      :aria-selected="selectedCategoryId === category.id"
      :tabindex="selectedCategoryId === category.id ? 0 : -1"
      class="px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 min-h-[44px]"
      :style="selectedCategoryId === category.id
        ? { backgroundColor: 'var(--primary)', color: '#fff' }
        : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }"
    >
      {{ category.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  categories: { id: string; name: string }[];
  selectedCategoryId: string;
}>();

defineEmits<{
  (e: "select", categoryId: string): void;
}>();
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
