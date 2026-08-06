<template>
  <div class="wrap">
    <div class="card">
      <h1>Клиентский портал</h1>
      <p class="muted">Войдите, чтобы видеть свои заказы и их статусы.</p>
      <form @submit.prevent="submit">
        <label>Email</label>
        <input v-model="email" type="email" placeholder="you@company.com" autocomplete="username" />
        <label>Пароль</label>
        <input v-model="password" type="password" autocomplete="current-password" />
        <label class="muted small">Организация (slug) — если email используется в нескольких</label>
        <input v-model="tenantSlug" placeholder="напр. demo-factory" />
        <p v-if="error" class="err">{{ error }}</p>
        <button class="btn primary" :disabled="busy" type="submit">{{ busy ? 'Вход…' : 'Войти' }}</button>
      </form>
      <p class="demo muted">Демо: client@tashkent-retail.com / Client123!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });
const portal = usePortal();
const router = useRouter();
const email = ref(''); const password = ref(''); const tenantSlug = ref('');
const busy = ref(false); const error = ref('');

onMounted(() => { if (portal.isAuthed.value) router.replace('/portal'); });

async function submit() {
  busy.value = true; error.value = '';
  try { await portal.login(email.value.trim(), password.value, tenantSlug.value.trim() || undefined); router.push('/portal'); }
  catch (e: any) { error.value = e.message; }
  finally { busy.value = false; }
}
</script>

<style scoped>
.wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #eef2ff, #f8fafc); padding: 20px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px; width: 100%; max-width: 380px; box-shadow: 0 10px 30px rgba(2, 6, 23, .06); }
h1 { margin: 0 0 4px; font-size: 20px; }
.muted { color: #64748b; }
.small { font-size: 12px; }
label { display: block; font-size: 12px; color: #475569; margin-top: 12px; margin-bottom: 4px; }
input { width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; }
.btn { width: 100%; margin-top: 16px; padding: 11px; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; }
.btn.primary { background: #2563eb; color: #fff; }
.btn:disabled { opacity: .6; }
.err { color: #dc2626; font-size: 13px; margin-top: 10px; }
.demo { font-size: 12px; text-align: center; margin-top: 16px; }
</style>
