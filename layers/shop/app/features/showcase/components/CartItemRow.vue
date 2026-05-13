<template>
  <div
    class="flex gap-4 items-start py-4 border-b border-[var(--border-subtle)] last:border-0"
  >
    <!-- Image -->
    <div class="w-20 h-20 bg-[var(--bg-surface)] rounded overflow-hidden flex-shrink-0">
      <img
        v-if="item.product.imageUrls?.length"
        :src="item.product.imageUrls[0]"
        :alt="item.product.name"
        loading="lazy"
        class="w-full h-full object-cover"
      />
    </div>

    <!-- Info -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="flex justify-between items-start gap-2">
        <h4 class="text-sm font-bold truncate" style="color: currentColor">
          {{ item.product.name }}
        </h4>
        <span class="text-sm font-bold whitespace-nowrap" style="color: currentColor">{{
          formattedPrice
        }}</span>
      </div>

      <!-- Specs (e.g. Color, Size) -->
      <div v-if="hasSpecs" class="text-xs mt-1 truncate" style="color: var(--text-muted)">
        {{ specsText }}
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between mt-auto pt-3">
        <!-- Quantity Selector -->
        <div class="flex items-center border border-[var(--border-subtle)] rounded">
          <Button
            @click="
              $emit('update-quantity', item.quantity - 1, item.selectedSpecs)
            "
            variant="ghost"
            size="sm"
            class="px-2 py-1 h-auto hover:opacity-100"
            style="color: var(--text-muted)"
          >
            -
          </Button>
          <span class="px-2 py-1 text-xs font-medium min-w-[2ch] text-center" style="color: currentColor">{{
            item.quantity
          }}</span>
          <Button
            @click="
              $emit('update-quantity', item.quantity + 1, item.selectedSpecs)
            "
            variant="ghost"
            size="sm"
            class="px-2 py-1 h-auto hover:opacity-100"
            style="color: var(--text-muted)"
          >
            +
          </Button>
        </div>

        <Button
          @click="$emit('remove', item.selectedSpecs)"
          variant="ghost"
          size="sm"
          class="text-xs hover:text-red-500 hover:opacity-100 h-auto p-1 flex items-center gap-1"
          style="color: var(--text-muted)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Remover
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CartItem } from "~/types/app";
import { formatCurrency } from "~/utils/currency";
import Button from "~/components/ui/Button.vue";

const props = defineProps<{
  item: CartItem;
}>();

defineEmits<{
  (e: "update-quantity", qty: number, specs: Record<string, string | string[]>): void;
  (e: "remove", specs: Record<string, string | string[]>): void;
}>();

const formattedPrice = computed(() => {
  const price = props.item.product.promoPrice ?? props.item.product.price;
  return formatCurrency(price * props.item.quantity);
});

const hasSpecs = computed(
  () => Object.keys(props.item.selectedSpecs || {}).length > 0,
);
const specsText = computed(() => {
  if (!hasSpecs.value) return "";
  return Object.entries(props.item.selectedSpecs || {})
    .map(([key, val]) => {
      const displayVal = Array.isArray(val) ? val.join(", ") : val;
      return `${key}: ${displayVal}`;
    })
    .join(" • ");
});
</script>
