<template>
  <button
    class="flex flex-col group relative text-left w-full focus:outline-none focus-visible:ring-2 rounded-2xl"
    style="--ring-color: var(--primary)"
    @click="$emit('view-details', product)"
    :aria-label="`Ver detalhes de ${product.name}, ${formattedPrice}`"
  >
    <!-- Image -->
    <div
      class="relative aspect-[4/5] rounded-2xl overflow-hidden border shadow-sm transition-shadow duration-300 group-hover:shadow-md w-full"
      style="background-color: var(--bg-secondary); border-color: var(--border-subtle)"
    >
      <img
        v-if="product.imageUrls?.length"
        :src="product.imageUrls[0]"
        :alt="product.name"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center gap-2"
        style="color: var(--text-muted)"
      >
        <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>

      <!-- Badge de Desconto -->
      <div
        v-if="discountPercentage"
        class="absolute top-2.5 left-2.5 z-10 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg"
      >
        -{{ discountPercentage }}%
      </div>

      <!-- Botão "+" de adicionar -->
      <button
        @click.stop="$emit('add-to-cart', product)"
        class="absolute bottom-2.5 right-2.5 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg transition-transform active:scale-90"
        style="background-color: var(--primary)"
        :aria-label="`Adicionar ${product.name} ao carrinho`"
        tabindex="-1"
      >
        +
      </button>
    </div>

    <!-- Info -->
    <div class="flex flex-col mt-3 px-0.5 gap-0.5">
      <h3
        class="text-sm font-semibold leading-snug line-clamp-2"
        style="color: currentColor"
      >
        {{ product.name }}
      </h3>
      <div class="flex items-center gap-1.5 mt-1">
        <span
          v-if="product.promoPrice"
          class="text-xs line-through"
          style="color: var(--text-muted)"
        >
          {{ formatCurrency(product.price) }}
        </span>
        <span class="text-sm font-bold" style="color: var(--primary)">
          {{ formattedPrice }}
        </span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Product } from "~/types/app";
import { formatCurrency } from "~~/app/utils/currency";
import Button from "~/components/ui/Button.vue";

const props = defineProps<{
  product: Product;
}>();

defineEmits<{
  (e: "view-details", product: Product): void;
  (e: "add-to-cart", product: Product): void;
}>();

const formattedPrice = computed(() => {
  const price = props.product.promoPrice ?? props.product.price;
  return formatCurrency(price);
});

const discountPercentage = computed(() => {
  if (!props.product.price || !props.product.promoPrice) return null;
  const discount =
    ((props.product.price - props.product.promoPrice) / props.product.price) *
    100;
  return Math.round(discount);
});
</script>
