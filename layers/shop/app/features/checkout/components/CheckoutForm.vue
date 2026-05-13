<template>
  <div class="flex flex-col gap-6">
    <!-- Logistics -->
    <fieldset>
      <legend class="text-base font-bold mb-3" style="color: currentColor">Modalidade de Entrega</legend>
      <div class="flex flex-col gap-3" role="radiogroup" aria-label="Modalidade de entrega">
        <label
          class="flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-200"
          :class="modelValue.deliveryMethod === 'home' ? 'bg-[var(--bg-secondary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'"
          :style="modelValue.deliveryMethod === 'home' ? { borderColor: 'var(--primary)' } : {}"
        >
          <input
            type="radio"
            name="logistics"
            value="home"
            :checked="modelValue.deliveryMethod === 'home'"
            @change="updateField('deliveryMethod', 'home')"
            class="sr-only"
          />
          <div class="flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :style="{ color: modelValue.deliveryMethod === 'home' ? 'var(--primary)' : 'var(--text-muted)' }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="font-semibold text-sm" style="color: currentColor">Entrega em Domicílio</span>
            <span class="text-xs" style="color: var(--text-muted)">Receba no seu endereço</span>
          </div>
          <div class="ml-auto flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
            :style="modelValue.deliveryMethod === 'home' ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary)' } : { borderColor: 'var(--border-subtle)' }">
            <div v-if="modelValue.deliveryMethod === 'home'" class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </label>

        <label
          class="flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-200"
          :class="modelValue.deliveryMethod === 'pickup' ? 'bg-[var(--bg-secondary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'"
          :style="modelValue.deliveryMethod === 'pickup' ? { borderColor: 'var(--primary)' } : {}"
        >
          <input
            type="radio"
            name="logistics"
            value="pickup"
            :checked="modelValue.deliveryMethod === 'pickup'"
            @change="updateField('deliveryMethod', 'pickup')"
            class="sr-only"
          />
          <div class="flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :style="{ color: modelValue.deliveryMethod === 'pickup' ? 'var(--primary)' : 'var(--text-muted)' }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="font-semibold text-sm" style="color: currentColor">Retirada no Local</span>
            <span class="text-xs" style="color: var(--text-muted)">Retire diretamente na loja</span>
          </div>
          <div class="ml-auto flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
            :style="modelValue.deliveryMethod === 'pickup' ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary)' } : { borderColor: 'var(--border-subtle)' }">
            <div v-if="modelValue.deliveryMethod === 'pickup'" class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </label>
      </div>
    </fieldset>

    <!-- Personal Info -->
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label for="checkout-firstname" class="text-xs font-semibold" style="color: currentColor">
          Nome <span class="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="checkout-firstname"
          type="text"
          autocomplete="given-name"
          :value="modelValue.firstName"
          @input="updateField('firstName', ($event.target as HTMLInputElement).value)"
          class="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors"
          :class="errors?.firstName ? 'border-red-400 focus:ring-red-300' : 'border-[var(--border-subtle)] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]'"
          style="color: currentColor; background-color: var(--bg-surface)"
          placeholder="João"
          :aria-invalid="!!errors?.firstName"
          :aria-describedby="errors?.firstName ? 'err-firstname' : undefined"
          required
        />
        <p v-if="errors?.firstName" id="err-firstname" class="text-xs text-red-500 mt-0.5" role="alert">{{ errors.firstName }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="checkout-lastname" class="text-xs font-semibold" style="color: currentColor">Sobrenome</label>
        <input
          id="checkout-lastname"
          type="text"
          autocomplete="family-name"
          :value="modelValue.lastName"
          @input="updateField('lastName', ($event.target as HTMLInputElement).value)"
          class="w-full p-3 border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] text-sm transition-colors"
          style="color: currentColor; background-color: var(--bg-surface)"
          placeholder="Silva"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="checkout-whatsapp" class="text-xs font-semibold" style="color: currentColor">
          WhatsApp <span class="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="checkout-whatsapp"
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          :value="modelValue.whatsapp"
          @input="handleWhatsappInput"
          class="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors"
          :class="errors?.whatsapp ? 'border-red-400 focus:ring-red-300' : 'border-[var(--border-subtle)] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]'"
          style="color: currentColor; background-color: var(--bg-surface)"
          placeholder="(00) 00000-0000"
          :aria-invalid="!!errors?.whatsapp"
          :aria-describedby="errors?.whatsapp ? 'err-whatsapp' : undefined"
          required
        />
        <p v-if="errors?.whatsapp" id="err-whatsapp" class="text-xs text-red-500 mt-0.5" role="alert">{{ errors.whatsapp }}</p>
      </div>

      <div class="flex flex-col gap-1.5" v-if="modelValue.deliveryMethod === 'home'">
        <label for="checkout-address" class="text-xs font-semibold" style="color: currentColor">
          Endereço de Entrega <span class="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="checkout-address"
          type="text"
          autocomplete="street-address"
          :value="modelValue.address"
          @input="updateField('address', ($event.target as HTMLInputElement).value)"
          class="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors"
          :class="errors?.address ? 'border-red-400 focus:ring-red-300' : 'border-[var(--border-subtle)] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]'"
          style="color: currentColor; background-color: var(--bg-surface)"
          placeholder="Rua Exemplo, 123, Apto 4"
          :aria-invalid="!!errors?.address"
          :aria-describedby="errors?.address ? 'err-address' : undefined"
          required
        />
        <p v-if="errors?.address" id="err-address" class="text-xs text-red-500 mt-0.5" role="alert">{{ errors.address }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface CheckoutFormState {
  firstName: string;
  lastName: string;
  whatsapp: string;
  address: string;
  deliveryMethod: "home" | "pickup";
}

const props = defineProps<{
  modelValue: CheckoutFormState;
  errors?: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: CheckoutFormState): void;
}>();

const updateField = (field: keyof CheckoutFormState, value: string) => {
  emit("update:modelValue", {
    ...props.modelValue,
    [field]: value,
  });
};

const formatWhatsapp = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const handleWhatsappInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const formatted = formatWhatsapp(input.value);
  input.value = formatted;
  updateField("whatsapp", formatted);
};
</script>
