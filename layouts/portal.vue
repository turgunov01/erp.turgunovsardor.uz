<template>
  <div class="portal">
    <header class="phead">
      <div class="brand">{{ portal.customer.value?.name ? companyName : 'Клиентский портал' }}</div>
      <div class="right">
        <span v-if="portal.customer.value" class="who">{{ portal.customer.value.name }}</span>
        <button class="btn ghost sm" @click="doLogout">Выйти</button>
      </div>
    </header>
    <main class="pbody"><slot /></main>
    <footer class="pfoot">TTR ONE · Клиентский портал</footer>
  </div>
</template>

<script setup lang="ts">
const portal = usePortal();
const companyName = 'Клиентский портал';
const router = useRouter();
function doLogout() { portal.logout(); router.push('/portal/login'); }
</script>

<style scoped>
.portal { min-height: 100vh; display: flex; flex-direction: column; background: #f8fafc; }
.phead { display: flex; justify-content: space-between; align-items: center; padding: 14px 22px; background: #fff; border-bottom: 1px solid #e2e8f0; }
.brand { font-weight: 700; font-size: 17px; }
.right { display: flex; align-items: center; gap: 12px; }
.who { font-size: 13px; color: #64748b; }
.pbody { flex: 1; max-width: 960px; width: 100%; margin: 0 auto; padding: 22px; }
.pfoot { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; }
.btn { border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px; }
.btn.sm { padding: 5px 10px; }
.btn.ghost:hover { background: #f1f5f9; }
</style>
