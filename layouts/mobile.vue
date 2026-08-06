<template>
  <div class="m-shell">
    <header class="m-top">
      <div class="m-brand"><span class="m-logo">T</span> TTR ONE</div>
      <div class="m-right">
        <span class="m-net" :class="{ off: !online }">{{ online ? '● online' : '○ offline' }}</span>
        <NuxtLink to="/dashboard" class="m-desk" title="Полная версия">🖥</NuxtLink>
      </div>
    </header>
    <main class="m-main">
      <slot v-if="auth.access && auth.booted" />
      <div v-else class="m-guard">
        <p>Требуется вход.</p>
        <NuxtLink to="/login" class="m-btn">Войти</NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const auth = useAuth();
const lock = useLock();
const online = ref(true);
onMounted(async () => {
  online.value = navigator.onLine;
  window.addEventListener('online', () => (online.value = true));
  window.addEventListener('offline', () => (online.value = false));
  if (!auth.access && !auth.vaultExists) { await navigateTo('/login'); return; }
  await lock.enforce();
});
</script>

<style scoped>
.m-shell { min-height: 100vh; background: #f1f5f9; display: flex; flex-direction: column; }
.m-top { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #0f172a; color: #fff; padding-top: max(12px, env(safe-area-inset-top)); }
.m-brand { font-weight: 700; display: flex; align-items: center; gap: 8px; }
.m-logo { width: 26px; height: 26px; border-radius: 7px; background: #2563eb; display: grid; place-items: center; font-weight: 800; }
.m-right { display: flex; align-items: center; gap: 12px; }
.m-net { font-size: 12px; color: #4ade80; } .m-net.off { color: #f87171; }
.m-desk { color: #cbd5e1; text-decoration: none; font-size: 18px; }
.m-main { flex: 1; padding: 14px; padding-bottom: max(14px, env(safe-area-inset-bottom)); }
.m-guard { text-align: center; padding: 60px 20px; color: #64748b; }
.m-btn { display: inline-block; margin-top: 12px; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; }
</style>
