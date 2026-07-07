<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { usePressReleaseAction } from "../composables/usePressReleaseAction";

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  languageChange: [lang: string];
}>();

const { locale } = useI18n();

function handleToggle() {
  if (props.disabled) {
    return;
  }
  const newLang = locale.value === "zh" ? "en" : "zh";
  emit("languageChange", newLang);
}

const togglePress = usePressReleaseAction(handleToggle, {
  disabled: () => Boolean(props.disabled)
});
</script>

<template>
  <button
    class="lang-toggle"
    :disabled="disabled"
    @pointerdown.stop.prevent="togglePress.onPointerdown"
    @pointerup.stop.prevent="togglePress.onPointerup"
    @pointercancel.stop="togglePress.onPointercancel"
    @pointerleave="togglePress.onPointerleave"
    @click.stop="togglePress.onClick"
  >
    {{ locale === "zh" ? "英文" : "中文" }}
  </button>
</template>

<style scoped>
.lang-toggle {
  width: 240px;
  height: 96px;
  border-radius: 48px;
  background: white;
  border: 5px solid #5a6e78;
  font-size: 48px;
  font-weight: 500;
  color: #5a6e78;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lang-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
