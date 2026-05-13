<template>
  <header
    class="sticky top-0 z-40 flex items-center justify-between py-4 px-6 backdrop-blur-md border-b border-white/10 shadow-sm transition-all duration-300"
    style="
      background-color: rgba(var(--bg-primary-rgb), 0.8);
      color: var(--text-main);
    "
  >
    <div class="flex items-center gap-4 justify-between w-full">
      <h1
        class="text-xl font-black tracking-widest uppercase"
        style="color: currentColor"
      >
        {{ storeName }}
      </h1>
      <!-- Menu Icon -->
      <button
        class="text-gray-800 hover:text-primary transition-colors active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- <Button
      @click="$emit('open-cart')"
      variant="ghost"
      size="icon"
      class="relative hover:text-primary p-1"
      style="color: currentColor"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
      <span
        v-if="cartItemsCount > 0"
        class="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
      >
        {{ cartItemsCount }}
      </span>
    </Button> -->
  </header>
</template>

<script setup lang="ts">
import Button from "~/components/ui/Button.vue";

defineProps<{
  storeName: string;
  cartItemsCount: number;
}>();

defineEmits<{
  (e: "open-cart"): void;
}>();
</script>
