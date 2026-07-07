<script setup lang="ts">
import EndDialog from "../EndDialog.vue";

defineProps<{
  disableAllButtons: boolean;
  showEndDialogBox: boolean;
}>();

const emit = defineEmits<{
  closeEndDialog: [];
}>();
</script>

<template>
  <div>
    <div @click.stop>
      <EndDialog
        :show="showEndDialogBox"
        code="1234"
        :disabled="disableAllButtons"
        @close="emit('closeEndDialog')"
      />
    </div>
  </div>
</template>

<style scoped>
/* No styles needed for now as it's just a wrapper for EndDialog */
</style>
