<template>
  <div
    class="min-h-screen transition-colors duration-500 flex flex-col"
    style="
      font-family: var(--font-primary, sans-serif);
      background-color: var(--bg-primary);
      color: var(--text-main);
    "
  >
    <!-- Header Simples -->
    <header
      class="sticky top-0 z-40 flex items-center gap-4 py-6 px-4 backdrop-blur-md border-b border-white/10 transition-all duration-300"
      style="
        background-color: rgba(var(--bg-primary-rgb), 0.8);
        color: var(--text-main);
      "
    >
      <NuxtLink
        :to="`/${route.params.slug}`"
        @click="clearOrderId"
        class="hover:bg-black/5 p-2 rounded-full transition-colors -ml-2"
        style="color: currentColor"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </NuxtLink>
      <h1
        class="text-base font-bold flex-1 text-center pr-8"
      >
        {{ currentOrderId ? 'Acompanhar Pedido' : items.length > 0 ? 'Seu Carrinho' : 'Carrinho' }}
      </h1>
    </header>

    <main
      class="flex-1 px-4 lg:px-8 py-6 lg:py-10 flex flex-col gap-8 max-w-5xl mx-auto w-full pb-24"
    >
      <!-- CASO 1: Pedido em Andamento -->
      <div v-if="currentOrderId" class="max-w-lg mx-auto w-full">
        <div
          class="flex flex-col gap-6 rounded-3xl p-6 border shadow-sm"
          style="background-color: var(--bg-secondary); border-color: var(--border-subtle)"
        >
          <!-- Cabeçalho do status -->
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              :class="orderStatus === 'cancelled' ? 'bg-red-100' : 'bg-green-100'"
            >
              <svg
                v-if="orderStatus !== 'cancelled'"
                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round" class="text-green-600"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round" class="text-red-500"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold" style="color: currentColor">
                {{ orderStatus === 'cancelled' ? 'Pedido Cancelado' : 'Pedido Realizado' }}
              </h2>
              <p class="text-sm" style="color: var(--text-muted)">
                {{ orderStatus === 'cancelled'
                  ? 'Entre em contato com a loja para mais informações.'
                  : 'Acompanhe o andamento abaixo.' }}
              </p>
            </div>
          </div>

          <!-- Timeline de progresso -->
          <div v-if="orderStatus !== 'cancelled'" class="flex flex-col gap-0">
            <div
              v-for="(step, idx) in orderTimeline"
              :key="step.key"
              class="flex items-start gap-3"
            >
              <div class="flex flex-col items-center">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                  :class="step.done ? 'bg-green-500 text-white' : step.active ? 'border-2 text-[var(--primary)]' : 'bg-gray-100'"
                  :style="step.active ? { borderColor: 'var(--primary)', backgroundColor: 'transparent' } : {}"
                >
                  <svg v-if="step.done" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <div v-else-if="step.active" class="w-2.5 h-2.5 rounded-full" style="background-color: var(--primary)"></div>
                  <div v-else class="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                </div>
                <div v-if="idx < orderTimeline.length - 1" class="w-0.5 h-6 my-1" :class="step.done ? 'bg-green-400' : 'bg-gray-200'"></div>
              </div>
              <div class="pt-1 pb-4">
                <p class="text-sm font-semibold" :style="{ color: step.done || step.active ? 'currentColor' : 'var(--text-muted)' }">
                  {{ step.label }}
                </p>
                <p v-if="step.active" class="text-xs mt-0.5" style="color: var(--text-muted)">{{ step.description }}</p>
              </div>
            </div>
          </div>

          <!-- Info do pedido -->
          <div class="rounded-xl p-4 text-sm space-y-2" style="background-color: var(--bg-primary)">
            <div class="flex justify-between items-center">
              <span style="color: var(--text-muted)">Número do pedido</span>
              <span class="font-mono font-semibold text-xs" style="color: currentColor">{{ currentOrderId }}</span>
            </div>
            <p class="text-xs" style="color: var(--text-muted)">
              Você pode fechar esta página. O lojista entrará em contato pelo WhatsApp se necessário.
            </p>
          </div>

          <!-- Ações -->
          <div class="flex flex-col gap-2">
            <Button
              @click="handleManualRefresh"
              :disabled="isRefreshing || refreshCooldown > 0"
              variant="outline"
              class="w-full h-12 text-sm font-semibold"
            >
              <span v-if="isRefreshing">Atualizando...</span>
              <span v-else-if="refreshCooldown > 0">Atualizar em {{ refreshCooldown }}s</span>
              <span v-else>Atualizar status</span>
            </Button>
            <Button
              @click="handleTalkToStore"
              class="w-full h-12 text-sm font-semibold bg-[#25D366] hover:bg-[#128C7E] text-white border-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" class="mr-2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"></path>
              </svg>
              Falar com a loja
            </Button>
          </div>

          <button
            @click="handleNewOrder"
            class="text-sm underline transition-colors mx-auto"
            style="color: var(--text-muted)"
          >
            Fazer novo pedido
          </button>
        </div>
      </div>

      <!-- CASO 2: Carrinho Vazio -->
      <div
        v-else-if="items.length === 0"
        class="max-w-lg mx-auto w-full flex flex-col items-center justify-center py-20 text-center gap-4"
      >
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center text-gray-300"
          style="background-color: var(--bg-secondary)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
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
        </div>
        <h2 class="text-xl font-bold">Seu carrinho está vazio</h2>
        <p class="text-[#797676] text-sm">
          Parece que você ainda não adicionou nada ao seu carrinho.
        </p>
        <Button
          @click="
            () => {
              clearOrderId();
              $router.push(`/${route.params.slug}`);
            }
          "
          class="mt-4 px-6 text-xs tracking-wider uppercase"
        >
          Continuar Comprando
        </Button>
      </div>

      <!-- CASO 3: Fluxo de Checkout Ativo -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

        <!-- Left column: cart items + form -->
        <div class="flex flex-col gap-6">
          <!-- Cart Items -->
          <section class="flex flex-col">
            <div class="flex justify-between items-end mb-4">
              <span class="text-xs font-semibold opacity-50 uppercase tracking-wider"
                >{{ totalItems }} {{ totalItems === 1 ? 'item' : 'itens' }}</span
              >
            </div>
            <div class="border-t" style="border-color: var(--border-subtle)">
              <CartItemRow
                v-for="item in items"
                :key="`${item.product.id}-${JSON.stringify(item.selectedSpecs)}`"
                :item="item"
                @update-quantity="
                  (qty, specs) => updateQuantity(item.product.id, qty, specs)
                "
                @remove="(specs) => removeFromCart(item.product.id, specs)"
              />
            </div>
          </section>

          <!-- Erros de validação inline -->
          <div
            v-if="formErrors.length > 0"
            role="alert"
            aria-live="polite"
            class="rounded-xl p-4 flex flex-col gap-1.5"
            style="background-color: #FEF2F2; border: 1px solid #FECACA"
          >
            <p class="text-xs font-bold text-red-700 uppercase tracking-wide">Preencha os campos obrigatórios</p>
            <ul class="list-disc list-inside">
              <li v-for="err in formErrors" :key="err" class="text-xs text-red-600">{{ err }}</li>
            </ul>
          </div>

          <!-- Checkout Form -->
          <section>
            <CheckoutForm v-model="formState" :errors="fieldErrors" />
          </section>
        </div>

        <!-- Right column: order summary (sticky on desktop) -->
        <div class="lg:sticky lg:top-28">
          <OrderSummary
            :subtotal="subtotal"
            :shippingFee="shippingFee"
            @submit="handleFinalize"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import CartItemRow from "../../features/showcase/components/CartItemRow.vue";
import CheckoutForm from "../../features/checkout/components/CheckoutForm.vue";
import OrderSummary from "../../features/checkout/components/OrderSummary.vue";
import Button from "~/components/ui/Button.vue";

import { useCheckout } from "../../features/checkout/composables/useCheckout";
import { useOrderTracking } from "../../features/checkout/composables/useOrderTracking";
import { useCart } from "../../features/showcase/composables/useCart";
import { useStoreStores } from "../../stores/useStoreStores";
import { useStore } from "../../features/showcase/composables/useStore";

const route = useRoute();

// Ensures theme data is available even on direct navigation to /checkout
await useStore();

const {
  items,
  totalItems,
  subtotal,
  updateQuantity,
  removeFromCart,
  clearCart,
} = useCart();
const { generateWhatsappUrl } = useCheckout();
const { currentOrderId, saveOrderId, loadOrderId, clearOrderId } =
  useOrderTracking();

const storeStores = useStoreStores();

const orderData = ref<any>(null);
const orderStatus = computed(() => orderData.value?.status || "pending");
const isRefreshing = ref(false);
const refreshCooldown = ref(0);

onMounted(() => {
  loadOrderId();
  if (currentOrderId.value) {
    fetchStatus();
  }
});

const fetchStatus = async () => {
  if (!currentOrderId.value) return;
  try {
    const data = await $fetch<any>(`/api/shop/orders/${currentOrderId.value}`);
    orderData.value = data;
  } catch (e) {
    console.error("Erro ao atualizar status");
  }
};

// Polling a cada 5 minutos
let pollInterval: any = null;
onMounted(() => {
  pollInterval = setInterval(fetchStatus, 5 * 60 * 1000);
});
onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

const handleManualRefresh = async () => {
  if (refreshCooldown.value > 0) return;
  isRefreshing.value = true;
  await fetchStatus();
  isRefreshing.value = false;
  refreshCooldown.value = 30;
  const timer = setInterval(() => {
    refreshCooldown.value--;
    if (refreshCooldown.value <= 0) clearInterval(timer);
  }, 1000);
};

const handleTalkToStore = () => {
  if (!currentOrderId.value) return;
  const whatsappUrl = generateWhatsappUrl(
    currentOrderId.value,
    orderData.value?.customerName || "Cliente",
  );
  window.open(whatsappUrl, "_blank");
};

const handleNewOrder = () => {
  clearOrderId();
  navigateTo(`/${route.params.slug}`);
};

const STATUS_ORDER = ["pending", "confirmed", "ready", "delivered"] as const;

const orderTimeline = computed(() => {
  const currentIdx = STATUS_ORDER.indexOf(orderStatus.value as any);
  return [
    {
      key: "pending",
      label: "Pedido recebido",
      description: "Aguardando confirmação da loja",
      done: currentIdx > 0,
      active: currentIdx === 0,
    },
    {
      key: "confirmed",
      label: "Pedido confirmado",
      description: "A loja está preparando seu pedido",
      done: currentIdx > 1,
      active: currentIdx === 1,
    },
    {
      key: "ready",
      label: "Pronto para retirada / entrega",
      description: "Seu pedido está a caminho ou disponível",
      done: currentIdx > 2,
      active: currentIdx === 2,
    },
    {
      key: "delivered",
      label: "Finalizado",
      description: "",
      done: currentIdx >= 3,
      active: false,
    },
  ];
});
const storeName = computed(() => storeStores.getCurrentStore?.name ?? "");

const formState = ref({
  firstName: "",
  lastName: "",
  whatsapp: "",
  address: "",
  deliveryMethod: "home" as "home" | "pickup",
});

const formErrors = ref<string[]>([]);
const fieldErrors = ref<Record<string, string>>({});

const validateForm = () => {
  const errors: string[] = [];
  const fields: Record<string, string> = {};

  if (!formState.value.firstName.trim()) {
    errors.push("Nome é obrigatório");
    fields.firstName = "Campo obrigatório";
  }
  if (!formState.value.whatsapp.trim()) {
    errors.push("WhatsApp é obrigatório");
    fields.whatsapp = "Campo obrigatório";
  }
  if (formState.value.deliveryMethod === "home" && !formState.value.address.trim()) {
    errors.push("Endereço de entrega é obrigatório");
    fields.address = "Campo obrigatório";
  }

  formErrors.value = errors;
  fieldErrors.value = fields;
  return errors.length === 0;
};

const shippingFee = computed(() =>
  formState.value.deliveryMethod === "home"
    ? storeStores.getCurrentStore?.deliveryFee
    : 0,
);
// Simulando uma taxa de imposto caso queira exibir
const estimatedTax = computed(() => subtotal.value * 0.08);

const handleFinalize = async () => {
  const { sanitizePhone, generateWhatsappUrl } = useCheckout();

  if (!validateForm()) return;

  const customerName =
    `${formState.value.firstName} ${formState.value.lastName}`.trim();
  const sanitizedWhatsapp = sanitizePhone(formState.value.whatsapp);

  try {
    // 1. Criar pedido na API
    const order = await $fetch<{ id: string }>("/api/shop/orders/create", {
      method: "POST",
      body: {
        storeId: storeStores.getCurrentStore?.id,
        customerName,
        customerWhatsapp: sanitizedWhatsapp,
        deliveryMethod: formState.value.deliveryMethod,
        address:
          formState.value.deliveryMethod === "home"
            ? formState.value.address
            : null,
        items: items.value.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          priceAtTime: item.product.promoPrice ?? item.product.price,
          selectedSpecs: item.selectedSpecs,
        })),
        subtotal: subtotal.value,
        deliveryFee: shippingFee.value || 0,
        total: subtotal.value + (shippingFee.value || 0),
      },
    });

    // 2. Salvar ID na sessão e atualizar estado local
    saveOrderId(order.id);
    currentOrderId.value = order.id;

    // 3. Limpar carrinho e carregar dados do pedido
    clearCart();
    await fetchStatus();
  } catch (e: any) {
    formErrors.value = [e.statusMessage || "Erro ao processar pedido. Tente novamente."];
  }
};

const getFontFamily = (fontName: string) => {
  const map: Record<string, string> = {
    playfair: "Playfair Display",
    inter: "Inter",
    outfit: "Outfit",
    roboto: "Roboto",
  };
  return map[fontName?.toLowerCase()] || "Inter";
};

const hexToRgb = (hex: string) => {
  if (!hex) return "255, 255, 255";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

const themeVars = computed(() => {
  const store = storeStores.getCurrentStore;
  if (!store?.themeSettings) return "";
  const fontFamily = store.themeSettings.font
    ? getFontFamily(store.themeSettings.font)
    : "Inter";

  const primaryBg = store.themeSettings.bgPrimaryColor || "#FFFFFF";
  const primaryBgRgb = hexToRgb(primaryBg);

  // Cálculo de Luminância para garantir contraste
  const r = parseInt(primaryBg.slice(1, 3), 16);
  const g = parseInt(primaryBg.slice(3, 5), 16);
  const b = parseInt(primaryBg.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isDark = luminance < 0.5;

  const textMain = isDark ? "#FFFFFF" : "#1A1A1A";
  const textMuted = isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)";
  const bgSurface = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.02)";
  const borderSubtle = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";

  return `:root {
    --primary: ${store.themeSettings.primaryColor || "#1A1A1A"};
    --secondary: ${store.themeSettings.secondaryColor || "#FFFFFF"};
    --bg-primary: ${primaryBg};
    --bg-primary-rgb: ${primaryBgRgb};
    --bg-secondary: ${store.themeSettings.bgSecondaryColor || "#F9FAFB"};
    --text-main: ${textMain};
    --text-muted: ${textMuted};
    --bg-surface: ${bgSurface};
    --border-subtle: ${borderSubtle};
    --font-primary: '${fontFamily}', sans-serif;
  }`;
});

useHead(computed(() => ({
  title: storeName.value ? `Carrinho — ${storeName.value}` : "Carrinho",
  style: [
    { innerHTML: themeVars.value },
    {
      innerHTML:
        ".hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }",
    },
  ],
})));
</script>
