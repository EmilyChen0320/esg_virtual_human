<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  show: boolean;
  code: string;
  disabled?: boolean;
}>();

defineEmits<{
  close: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div
      class="relative flex w-[90vw] max-w-xl flex-col items-center rounded-lg bg-white p-8 shadow-lg"
    >
      <div class="mb-4 text-center text-[2vw] font-bold">
        {{ t("end-dialog.body") }}<br />
        「<span class="text-[3vw] font-bold text-blue-600">{{ code }}</span
        >」 {{ t("end-dialog.suffix") }}
      </div>
      <button
        class="mt-4 rounded-full bg-blue-600 px-8 py-3 text-[2vw] font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
        :disabled="disabled"
        @click="$emit('close')"
      >
        {{ t("button.end-dialog") }}
      </button>
    </div>
  </div>
</template>
