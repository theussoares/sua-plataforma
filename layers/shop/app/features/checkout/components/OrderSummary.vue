<template>
  <div
    class="rounded-xl p-5 flex flex-col gap-4"
    style="background-color: var(--bg-secondary)"
  >
    <h3 class="text-lg font-bold" style="color: currentColor">
      Resumo do Pedido
    </h3>

    <div class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between" style="color: var(--text-muted)">
        <span>Subtotal</span>
        <span class="font-medium" style="color: currentColor">{{
          formatPrice(subtotal)
        }}</span>
      </div>
      <div
        class="flex justify-between"
        v-if="shippingFee !== undefined"
        style="color: var(--text-muted)"
      >
        <span>Frete</span>
        <span class="font-medium" style="color: currentColor">{{
          shippingFee === 0 ? "Grátis" : formatPrice(shippingFee)
        }}</span>
      </div>
      <!-- <div class="flex justify-between text-[#797676]" v-if="estimatedTax">
        <span>Taxas Estimadas</span>
        <span class="font-medium text-[#1A1A1A]">{{
          formatPrice(estimatedTax)
        }}</span>
      </div> -->
    </div>

    <div class="h-px w-full bg-[var(--border-subtle)] my-1"></div>

    <div
      class="flex justify-between items-center text-lg font-bold"
      style="color: currentColor"
    >
      <span>Total</span>
      <span>{{ formatPrice(total) }}</span>
    </div>

    <div class="mt-4 flex flex-col gap-3">
      <!-- Pay Online omitido por hora conforme acordado -->

      <Button
        @click="$emit('submit')"
        class="w-full text-sm font-semibold h-14 gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
        Enviar pedido via WhatsApp
      </Button>

      <p class="text-xs text-center mt-1" style="color: var(--text-muted)">
        Você será redirecionado para o WhatsApp para confirmar com a loja.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatCurrency } from "~/utils/currency";
import Button from "~/components/ui/Button.vue";

const props = defineProps<{
  subtotal: number;
  shippingFee?: number;
  estimatedTax?: number;
}>();

defineEmits<{
  (e: "submit"): void;
}>();

const formatPrice = (val: number) => {
  return formatCurrency(val);
};

const total = computed(() => {
  return props.subtotal + (props.shippingFee || 0) + (props.estimatedTax || 0);
});
</script>
