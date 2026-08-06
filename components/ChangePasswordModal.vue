<template>
  <Modal title="Смена пароля" submit-label="Сохранить" @close="$emit('close')" @submit="submit">
    <label>Текущий пароль</label><input v-model="cur" type="password" autocomplete="current-password" />
    <label>Новый пароль</label><input v-model="n1" type="password" placeholder="минимум 8 символов" autocomplete="new-password" />
    <label>Повторите новый пароль</label><input v-model="n2" type="password" autocomplete="new-password" />
    <div class="error">{{ err }}</div>
  </Modal>
</template>

<script setup lang="ts">
const auth = useAuth();
const { toast } = useToast();
const emit = defineEmits(['close']);
const cur = ref(''); const n1 = ref(''); const n2 = ref(''); const err = ref('');
async function submit() {
  err.value = '';
  if (n1.value !== n2.value) { err.value = 'Пароли не совпадают'; return; }
  try {
    await auth.api('/auth/change-password', { method: 'POST', body: { currentPassword: cur.value, newPassword: n1.value } });
    toast('Пароль изменён — войдите заново'); emit('close');
    setTimeout(() => auth.logout(), 900);
  } catch (e: any) { err.value = e.message; }
}
</script>
