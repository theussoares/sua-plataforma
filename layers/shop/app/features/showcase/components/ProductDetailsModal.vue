<template>
  <Teleport to="body">
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="modalTitleId"
    @keydown.esc="close"
    ref="modalRoot"
  >
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="close"
    />

    <!-- Modal Content -->
    <Card
      class="relative w-full sm:max-w-4xl max-h-[92dvh] overflow-hidden flex flex-col md:flex-row rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border-[var(--border-subtle)]"
      style="background-color: var(--bg-primary); color: var(--text-main)"
    >
      <!-- Swipe handle (mobile) -->
      <div class="flex justify-center pt-3 pb-1 md:hidden">
        <div class="w-10 h-1 rounded-full bg-black/20"></div>
      </div>

      <!-- Close Button -->
      <Button
        @click="close"
        variant="ghost"
        size="icon"
        class="absolute top-4 right-4 rounded-full z-20"
        style="background-color: var(--bg-secondary); color: var(--text-main)"
        aria-label="Fechar modal"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </Button>

      <!-- Image Section -->
      <div class="w-full md:w-1/2 h-64 md:h-auto flex-shrink-0" style="background-color: var(--bg-secondary)">
        <img
          v-if="product?.imageUrls?.length"
          :src="product.imageUrls[0]"
          :alt="product.name"
          class="w-full h-full object-cover"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-gray-300"
        >
          <svg
            class="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
        </div>
      </div>

      <!-- Content Section -->
      <div class="w-full md:w-1/2 flex flex-col p-6 md:p-8 overflow-y-auto">
        <div class="mb-6">
          <div class="flex justify-between items-start mb-2">
            <h2
              :id="modalTitleId"
              class="text-xl font-bold leading-snug"
              style="color: currentColor"
            >
              {{ product?.name }}
            </h2>
          </div>
          <p class="text-sm leading-relaxed" style="color: var(--text-muted)">
            {{ product?.description || "Sem descrição disponível." }}
          </p>
        </div>

        <!-- Variations -->
        <div v-if="hasVariations" class="space-y-8 mb-8">
          <div
            v-for="(group, idx) in variationGroups"
            :key="idx"
            class="space-y-3"
          >
            <div class="flex justify-between items-center">
              <label
                class="text-[11px] font-black uppercase tracking-[0.2em]"
                style="color: currentColor"
              >
                {{ group.name }}
              </label>
              <span
                v-if="group.required"
                class="text-[9px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest border border-red-100"
              >
                Obrigatório
              </span>
              <span
                v-else-if="group.limit"
                class="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-100"
              >
                Até {{ group.limit }} opções
              </span>
            </div>

            <div class="flex flex-wrap gap-2">
              <Button
                v-for="option in group.options"
                :key="option"
                @click="
                  toggleOption(group.name, option, !!group.multi, group.limit)
                "
                :variant="
                  isOptionSelected(group.name, option) ? 'default' : 'outline'
                "
                class="px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-300"
                :style="!isOptionSelected(group.name, option) ? { color: 'currentColor' } : {}"
              >
                {{ option }}
              </Button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-auto pt-6 border-t border-[var(--border-subtle)] flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-semibold"
              style="color: var(--text-muted)"
              >Total</span
            >
            <span
              class="text-xl font-bold"
              style="color: currentColor"
              >{{ formattedPrice }}</span
            >
          </div>

          <!-- Seletor de quantidade -->
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold" style="color: var(--text-muted)">Quantidade</span>
            <div class="flex items-center gap-3">
              <button
                @click="quantity = Math.max(1, quantity - 1)"
                class="w-9 h-9 rounded-full border flex items-center justify-center font-bold text-lg transition-colors active:scale-95"
                style="border-color: var(--border-subtle); color: currentColor"
                aria-label="Diminuir quantidade"
              >−</button>
              <span class="w-6 text-center font-bold text-sm" style="color: currentColor">{{ quantity }}</span>
              <button
                @click="quantity = quantity + 1"
                class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg transition-colors active:scale-95 text-white"
                style="background-color: var(--primary)"
                aria-label="Aumentar quantidade"
              >+</button>
            </div>
          </div>

          <Button
            @click="handleAddToCart"
            class="w-full h-14 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
            :disabled="!canAddToCart || (product?.stock || 0) <= 0"
          >
            <span class="font-semibold text-sm">
              {{
                (product?.stock || 0) <= 0
                  ? "Produto Esgotado"
                  : canAddToCart
                    ? "Adicionar ao Carrinho"
                    : "Selecione as opções obrigatórias"
              }}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, useId } from "vue";
import type { Product } from "~/types/app";
import { formatCurrency } from "~~/app/utils/currency";
import { calculateItemUnitPrice } from "~~/app/utils/product";
import Button from "~/components/ui/Button.vue";
import Card from "~/components/ui/Card.vue";

const props = defineProps<{
  isOpen: boolean;
  product: Product | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "add-to-cart",
    product: Product,
    specs: Record<string, string | string[]>,
    quantity: number,
  ): void;
}>();

const modalRoot = ref<HTMLElement | null>(null);
const modalTitleId = `modal-title-${Math.random().toString(36).slice(2)}`;
const quantity = ref(1);

// Focus trap: move foco para o modal ao abrir
watch(() => props.isOpen, async (open) => {
  if (open) {
    await nextTick();
    modalRoot.value?.focus();
  }
});

// State: Cada chave é o nome do grupo, o valor pode ser string ou string[]
const selectedSpecs = ref<Record<string, any>>({});

const formattedPrice = computed(() => {
  if (!props.product) return "";
  const basePrice = props.product.promoPrice ?? props.product.price;
  const unitTotal = calculateItemUnitPrice(basePrice, selectedSpecs.value);
  return formatCurrency(unitTotal * quantity.value);
});

const variationGroups = computed(() => {
  if (!props.product?.variationOptions) return [];
  // Se for um array de objetos (novo formato)
  if (Array.isArray(props.product.variationOptions)) {
    return props.product.variationOptions;
  }
  // Fallback para o formato antigo (Record<string, string[]>)
  return Object.entries(props.product.variationOptions).map(
    ([name, options]) => ({
      name,
      options,
      required: true,
      multi: false,
    }),
  );
});

const hasVariations = computed(() => variationGroups.value.length > 0);

const isOptionSelected = (groupName: string, option: string) => {
  const val = selectedSpecs.value[groupName];
  if (Array.isArray(val)) return val.includes(option);
  return val === option;
};

const toggleOption = (
  groupName: string,
  option: string,
  multi: boolean,
  limit?: number,
) => {
  if (multi) {
    if (!Array.isArray(selectedSpecs.value[groupName])) {
      selectedSpecs.value[groupName] = [];
    }
    const current = [...selectedSpecs.value[groupName]];
    const idx = current.indexOf(option);

    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      if (!limit || current.length < limit) {
        current.push(option);
      }
    }
    selectedSpecs.value[groupName] = current;
  } else {
    selectedSpecs.value[groupName] = option;
  }
};

const canAddToCart = computed(() => {
  if (!hasVariations.value) return true;

  return variationGroups.value.every((group) => {
    if (!group.required) return true;
    const val = selectedSpecs.value[group.name];
    if (Array.isArray(val)) return val.length > 0;
    return !!val;
  });
});

watch(
  () => props.product,
  (newProduct) => {
    selectedSpecs.value = {};
    quantity.value = 1;
    if (newProduct?.variationOptions) {
      variationGroups.value.forEach((group) => {
        if (group.options?.length === 1 && group.required) {
          selectedSpecs.value[group.name] = group.options[0];
        }
      });
    }
  },
);

const close = () => {
  emit("close");
};

const handleAddToCart = () => {
  if (props.product && canAddToCart.value) {
    emit("add-to-cart", props.product, { ...selectedSpecs.value }, quantity.value);
    close();
  }
};
</script>
