<template>
  <div
    class="min-h-dvh transition-colors duration-500"
    style="
      font-family: var(--font-primary, sans-serif);
      background-color: var(--bg-primary);
      color: var(--text-main);
    "
  >
    <StoreHeader
      :storeName="store?.name || 'PRISTINE'"
      :cartItemsCount="totalItems"
      @open-cart="$router.push(`/${route.params.slug}/checkout`)"
    />

    <main class="px-4 lg:px-8 py-6 flex flex-col gap-6 max-w-5xl mx-auto pb-28">
      <!-- Intro / Title -->
      <section>
        <p
          v-if="store?.description"
          class="text-[#797676] text-sm leading-relaxed"
        >
          {{ store?.description }}
        </p>

        <!-- Store Info: WhatsApp & Hours -->
        <div class="mt-4 flex flex-col gap-3">
          <!-- <div v-if="store?.whatsapp" class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center"
            >
              <svg
                class="w-4 h-4 text-green-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                />
              </svg>
            </div>
            <a
              :href="`https://wa.me/${store?.whatsapp?.replace(/\D/g, '')}`"
              target="_blank"
              class="text-sm font-bold text-gray-900"
            >
              {{ store?.whatsapp }}
            </a>
          </div> -->

          <div
            v-if="store?.openHours"
            class="rounded-2xl p-4"
            style="background-color: var(--bg-secondary)"
          >
            <div class="flex items-center gap-2 mb-2">
              <svg
                class="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span
                class="text-xs font-black uppercase tracking-widest opacity-40"
                style="color: currentColor"
                >Horários</span
              >
            </div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div
                v-for="(val, key) in store.openHours"
                :key="key"
                class="flex justify-between text-[11px]"
              >
                <span
                  class="font-medium capitalize opacity-40"
                  style="color: currentColor"
                  >{{ key }}:</span
                >
                <span
                  :class="
                    val === 'fechado'
                      ? 'text-red-400'
                      : 'text-[var(--text-main)] font-bold'
                  "
                  >{{ val }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Hero Banner (Destaques) -->
      <ClientOnly>
        <HeroBanner
          v-if="!searchQuery && selectedCategoryId === 'all'"
          :products="allProducts"
          @select-product="handleViewDetails"
          @add-to-cart="handleAddToCart"
        />
      </ClientOnly>

      <!-- Search -->
      <SearchBar v-model="searchQuery" />

      <!-- Categories -->
      <CategoryTabs
        :categories="categories"
        :selectedCategoryId="selectedCategoryId"
        @select="(id) => (selectedCategoryId = id)"
      />

      <!-- Categorized Layout (Only when no search and 'all' is selected) -->
      <template v-if="selectedCategoryId === 'all' && !searchQuery">
        <section
          v-for="category in categoriesWithProducts"
          :key="category.id"
          class="mt-4"
        >
          <div class="flex justify-between items-end mb-4 px-1">
            <h3
              class="text-lg font-bold text-[var(--text-main)] uppercase tracking-tight"
            >
              {{ category.name }}
            </h3>
            <Button
              v-if="category.products.length > 5"
              @click="selectedCategoryId = category.id"
              variant="ghost"
              size="sm"
              class="text-[var(--primary)] hover:text-[var(--primary)] h-auto px-2"
            >
              Ver mais
            </Button>
          </div>

          <div
            class="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar -mx-2 px-4"
          >
            <div
              v-for="product in category.products.slice(0, 5)"
              :key="product.id"
              class="w-[60vw] sm:w-[220px] lg:w-[260px] flex-shrink-0 snap-start"
            >
              <ProductCard
                :product="product"
                @view-details="handleViewDetails"
                @add-to-cart="handleAddToCart"
              />
            </div>
          </div>
        </section>

        <div
          v-if="categoriesWithProducts.length === 0 && !pending"
          class="py-10 text-center text-[#797676]"
        >
          Nenhum produto encontrado.
        </div>
      </template>

      <!-- Standard Grid Layout (When searching or filtering by category) -->
      <template v-else>
        <section
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2"
        >
          <ProductCard
            v-for="product in productsList"
            :key="product.id"
            :product="product"
            @view-details="handleViewDetails"
            @add-to-cart="handleAddToCart"
          />
          <div
            v-if="productsList.length === 0 && !pending"
            class="col-span-2 py-10 text-center text-[#797676]"
          >
            Nenhum produto encontrado.
          </div>
        </section>

        <!-- Infinite Scroll Sentinel -->
        <div
          ref="observerTarget"
          class="w-full py-6 flex justify-center items-center h-12"
        >
          <span
            v-if="isLoadingMore"
            class="text-sm text-[#797676] animate-pulse"
            >Carregando mais produtos...</span
          >
        </div>
      </template>
    </main>

    <ProductDetailsModal
      :is-open="isModalOpen"
      :product="selectedProduct"
      @close="isModalOpen = false"
      @add-to-cart="(p, s, qty) => addToCart(p, qty, s)"
    />

    <!-- Floating Cart Bar (padrão iFood/Rappi) -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="totalItems > 0"
        class="fixed bottom-0 left-0 right-0 z-30 p-4 pb-safe"
      >
        <button
          @click="$router.push(`/${route.params.slug}/checkout`)"
          class="w-full max-w-5xl mx-auto flex items-center justify-between px-5 h-14 rounded-2xl shadow-2xl transition-transform active:scale-[0.98]"
          style="background-color: var(--primary); color: #fff"
          aria-label="Ver carrinho"
        >
          <span
            class="flex items-center justify-center w-7 h-7 rounded-lg bg-white/20 font-bold text-sm"
          >
            {{ totalItems }}
          </span>
          <span class="font-semibold text-sm">Ver carrinho</span>
          <span class="font-bold text-sm">{{ formattedSubtotal }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { Product, Category } from "~/types/app";
import { formatCurrency } from "~~/app/utils/currency";

import StoreHeader from "../../features/showcase/components/StoreHeader.vue";
import SearchBar from "../../features/showcase/components/SearchBar.vue";
import CategoryTabs from "../../features/showcase/components/CategoryTabs.vue";
import ProductCard from "../../features/showcase/components/ProductCard.vue";
import ProductDetailsModal from "../../features/showcase/components/ProductDetailsModal.vue";
import HeroBanner from "../../features/showcase/components/HeroBanner.vue";

import { useStore } from "../../features/showcase/composables/useStore";
import { useProducts } from "../../features/showcase/composables/useProducts";
import { useCart } from "../../features/showcase/composables/useCart";
import { useStoreStores } from "../../stores/useStoreStores";

const route = useRoute();

// State
const searchQuery = ref("");
const selectedCategoryId = ref("all");

// Load Data
const { store } = await useStore();
const { productsList, allProducts, loadMore, hasMore, isLoadingMore, pending } =
  await useProducts(searchQuery, selectedCategoryId);

const { totalItems, subtotal, addToCart } = useCart();
const formattedSubtotal = computed(() => formatCurrency(subtotal.value));

const handleViewDetails = (product: Product) => {
  selectedProduct.value = product;
  isModalOpen.value = true;
};

const handleAddToCart = (product: Product) => {
  const hasVariations =
    product.variationOptions &&
    Object.keys(product.variationOptions).length > 0;

  if (hasVariations) {
    selectedProduct.value = product;
    isModalOpen.value = true; // Força a abertura do modal
  } else {
    addToCart(product);
  }
};

const categories = computed(() => {
  const store = useStoreStores().getCategories;
  return [
    { id: "all", name: "Todos" },
    ...store.map((c: Category) => ({
      id: c.id,
      name: c.name,
    })),
  ];
});

const categoriesWithProducts = computed(() => {
  if (!allProducts.value) return [];

  const storeCategories = useStoreStores().getCategories;

  const grouped = storeCategories
    .map((c: Category) => ({
      id: c.id,
      name: c.name,
      products: allProducts.value.filter(
        (p: Product) => p.categoryId === c.id && (p.stock || 0) > 0,
      ),
    }))
    .filter((c) => c.products.length > 0);

  const uncategorized = allProducts.value.filter(
    (p: Product) => !p.categoryId && (p.stock || 0) > 0,
  );
  if (uncategorized.length > 0) {
    grouped.push({
      id: "uncategorized",
      name: "Outros",
      products: uncategorized,
    });
  }

  return grouped;
});

const isModalOpen = ref(false);
const selectedProduct = ref<Product | null>(null);

// Infinite Scroll Observer
const observerTarget = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting && hasMore.value && !isLoadingMore.value) {
        loadMore();
      }
    },
    { rootMargin: "100px" },
  );

  if (observerTarget.value && observer) {
    observer.observe(observerTarget.value);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});

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
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

const themeVars = computed(() => {
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

const canonicalUrl = computed(() =>
  typeof window !== 'undefined' ? `${window.location.origin}/${route.params.slug}` : ''
)

useHead({
  title: store?.name ? `${store.name} - Catálogo` : "Catálogo",
  meta: [
    { name: 'description', content: store?.description ?? `Conheça o cardápio de ${store?.name ?? 'nossa loja'}` },
    { property: 'og:title', content: store?.name ?? 'Catálogo' },
    { property: 'og:description', content: store?.description ?? '' },
    { property: 'og:image', content: store?.logoUrl ?? '' },
    { property: 'og:type', content: 'website' },
  ],
  link: computed(() => {
    const font = store?.themeSettings?.font
      ? getFontFamily(store.themeSettings.font)
      : "Inter";
    return [
      {
        rel: "stylesheet",
        href: `https://fonts.googleapis.com/css2?family=${font.replace(" ", "+")}:wght@400;500;600;700;800&display=swap`,
      },
      { rel: 'canonical', href: canonicalUrl.value },
    ];
  }),
  style: [
    { innerHTML: themeVars.value },
    {
      innerHTML:
        ".hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }",
    },
  ],
});
</script>
