<template>
  <div class="modal-bg" @click.self="$emit('close')">
    <div class="modal" :class="{ wide, half }">
      <h3>{{ title }}</h3>
      <div class="body"><slot /></div>
      <div class="foot">
        <button class="btn ghost" @click="$emit('close')">{{ t('common.cancel') }}</button>
        <button class="btn" :disabled="busy" @click="$emit('submit')">{{ submitLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; submitLabel?: string; busy?: boolean; wide?: boolean; half?: boolean }>();
defineEmits(['close', 'submit']);
const { t } = useI18n();
</script>

<style scoped>
/* Constrain height so a long body scrolls inside the modal instead of overflowing the
   viewport; header + footer stay pinned. `wide` widens it for dense content. */
.modal { display: flex; flex-direction: column; max-height: 90vh; }
.modal.wide { max-width: 680px; }
/* half = ~50% of the screen width (for dense tables like the stock-count recount) */
.modal.half { max-width: 900px; width: 50vw; }
@media (max-width: 760px) { .modal.half { width: 94vw; } }
.modal .body { overflow-y: auto; flex: 1; }
</style>
