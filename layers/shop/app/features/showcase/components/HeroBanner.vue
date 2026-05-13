<template>
  <div
    v-if="promoProducts.length > 0"
    class="w-full flex justify-center mb-2 min-[383px]"
  >
    <main
      class="relative w-full h-[350px] md:h-[400px] rounded-[2rem] overflow-hidden shadow-2xl bg-black"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
      role="region"
      aria-label="Produtos em destaque"
    >
      <!-- Slides -->
      <TransitionGroup
        enter-active-class="transition duration-500 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-300 ease-in absolute inset-0"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="(product, index) in promoProducts"
          v-show="index === currentIndex"
          :key="product.id"
          class="absolute inset-0 cursor-pointer"
          @click="$emit('select-product', product)"
          :aria-label="`Ver detalhes de ${product.name}`"
        >
          <!-- Background Image -->
          <img
            :src="product.imageUrls[0]"
            :alt="product.name"
            loading="lazy"
            class="w-full h-full object-cover opacity-60"
          />
          <!-- Overlay Gradiente -->
          <div
            class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
          ></div>
          <div
            class="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent"
          ></div>

          <!-- Content -->
          <div
            class="absolute inset-0 p-8 md:p-12 flex flex-col justify-end md:justify-center max-w-full md:max-w-[70%]"
          >
            <div class="space-y-2 mb-4">
              <span
                v-if="getDiscount(product)"
                class="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full"
              >
                -{{ getDiscount(product) }}% de desconto
              </span>
              <h2
                class="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg"
              >
                {{ product.name }}
              </h2>
            </div>

            <p
              class="text-gray-300 text-sm md:text-base line-clamp-2 mb-6 leading-relaxed max-w-md"
            >
              {{ product.description }}
            </p>

            <div class="flex items-center gap-4">
              <div class="flex flex-col">
                <span
                  v-if="product.promoPrice"
                  class="text-gray-400 text-xs line-through"
                >
                  {{ formatCurrency(product.price) }}
                </span>
                <span class="text-2xl md:text-3xl font-bold text-white">
                  {{ formatCurrency(product.promoPrice || product.price) }}
                </span>
              </div>
              <Button
                @click.stop="$emit('add-to-cart', product)"
                class="px-6 h-12 rounded-full font-semibold text-sm shadow-xl"
              >
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <!-- Controles (Dots) + navegação por setas -->
      <div
        v-if="promoProducts.length > 1"
        class="absolute bottom-1 md:bottom-5 left-0 right-0 z-30 flex items-center justify-center gap-2"
        role="tablist"
        :aria-label="`${promoProducts.length} slides`"
      >
        <button
          v-for="(_, index) in promoProducts"
          :key="index"
          @click.stop="goTo(index)"
          role="tab"
          :aria-selected="index === currentIndex"
          :aria-label="`Slide ${index + 1} de ${promoProducts.length}`"
          :class="[
            'h-1.5 transition-all duration-300 ease-out rounded-full min-w-[24px] min-h-[24px] flex-shrink-0',
            index === currentIndex
              ? 'bg-white w-8'
              : 'bg-white/40 w-1.5 hover:bg-white/70',
          ]"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import type { Product } from "~/types/app";
import { formatCurrency } from "~~/app/utils/currency";
import Button from "~/components/ui/Button.vue";

const props = defineProps<{
  products: Product[];
}>();

defineEmits(["select-product", "add-to-cart"]);

const currentIndex = ref(0);
let interval: any = null;

const promoProducts = computed(() =>
  props.products.filter(
    (p) => p.highlighted && p.active && p.imageUrls?.length > 0 && p.stock > 0,
  ),
);

const getDiscount = (product: any) => {
  if (!product.price || !product.promoPrice) return null;
  const discount = ((product.price - product.promoPrice) / product.price) * 100;
  return Math.round(discount);
};

const goTo = (index: number) => {
  currentIndex.value = index;
  resetTimer();
};

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % promoProducts.value.length;
};

const prev = () => {
  currentIndex.value =
    (currentIndex.value - 1 + promoProducts.value.length) %
    promoProducts.value.length;
};

// Swipe support
let touchStartX = 0;
const SWIPE_THRESHOLD = 50;

const onTouchStart = (e: TouchEvent) => {
  touchStartX = e.touches[0].clientX;
};

const onTouchEnd = (e: TouchEvent) => {
  if (promoProducts.value.length <= 1) return;
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > SWIPE_THRESHOLD) {
    diff > 0 ? next() : prev();
    resetTimer();
  }
};

const startTimer = () => {
  if (promoProducts.value.length > 1) {
    interval = setInterval(next, 5000);
  }
};

const resetTimer = () => {
  if (interval) clearInterval(interval);
  startTimer();
};

onMounted(() => startTimer());
onUnmounted(() => {
  if (interval) clearInterval(interval);
});

watch(
  () => promoProducts.value,
  () => {
    currentIndex.value = 0;
    if (interval) clearInterval(interval);
    startTimer();
  },
);
</script>
