<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="submit">
      <div class="brand-row"><div class="logo">T</div><div class="brand-name">TTR&nbsp;ONE</div></div>
      <div class="login-sub" v-html="subHtml"></div>
      <label>Ваше имя</label>
      <input v-model="fullName" placeholder="Иван Иванов" />
      <label>Пароль</label>
      <input v-model="password" type="password" placeholder="минимум 8 символов" autocomplete="new-password" />
      <button class="btn block" type="submit">Принять приглашение</button>
      <div class="error">{{ error }}</div>
      <div class="hint"><NuxtLink to="/login" class="link">Войти в другой аккаунт</NuxtLink></div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const auth = useAuth();
const route = useRoute();
const token = String(route.query.invite || route.query.token || '');
const fullName = ref(''); const password = ref('');
const error = ref('');
const subHtml = ref('Приглашение в компанию');

onMounted(async () => {
  if (!token) { subHtml.value = 'Ссылка-приглашение недействительна'; return; }
  try {
    const r: any = await auth.api(`/auth/invite?token=${encodeURIComponent(token)}`, { retry: false });
    subHtml.value = r.valid ? `Приглашение в <b>${r.tenant}</b> для <b>${r.email}</b>` : 'Приглашение недействительно или истекло';
  } catch { subHtml.value = 'Не удалось загрузить приглашение'; }
});

async function submit() {
  error.value = '';
  try {
    await auth.acceptInvite(token, fullName.value.trim(), password.value);
    await navigateTo('/dashboard');
  } catch (e: any) { error.value = e.message; }
}
</script>
