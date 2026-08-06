<template>
  <div class="bell-wrap">
    <button class="bell" @click="open = !open" title="Уведомления">
      <span class="ic">🔔</span>
      <span v-if="notifs.unreadCount" class="badge">{{ notifs.unreadCount > 9 ? '9+' : notifs.unreadCount }}</span>
    </button>
    <div v-if="open" class="dropdown" @click.stop>
      <div class="dd-head">
        <b>Уведомления</b>
        <button v-if="notifs.unreadCount" class="link" @click="notifs.markAllRead()">Прочитать все</button>
      </div>
      <div class="dd-list">
        <div v-for="n in notifs.items.slice(0, 15)" :key="n.id" class="ni" :class="[n.type, { unread: !n.readAt }]" @click="onClick(n)">
          <div class="ni-dot"></div>
          <div class="ni-body">
            <div class="ni-title">{{ n.title }}</div>
            <div v-if="n.body" class="ni-text">{{ n.body }}</div>
            <div class="ni-time">{{ fmtDate(n.createdAt) }}</div>
          </div>
        </div>
        <div v-if="!notifs.items.length" class="ni empty">Нет уведомлений</div>
      </div>
    </div>
    <div v-if="open" class="backdrop" @click="open = false"></div>
  </div>
</template>

<script setup lang="ts">
const notifs = useNotifications();
const open = ref(false);
onMounted(() => { if (!notifs.loaded) notifs.load(); });
async function onClick(n: any) {
  await notifs.markRead(n.id);
  if (n.refType === 'Document' && n.refId) { open.value = false; await navigateTo('/documents'); }
  else if (n.refType === 'PurchaseRequest') { open.value = false; await navigateTo('/purchase-requests'); }
}
</script>

<style scoped>
.bell-wrap { position: relative; }
.bell { position: relative; background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 6px; }
.badge { position: absolute; top: -2px; right: -2px; background: #dc2626; color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 1px 5px; }
.dropdown { position: absolute; right: 0; top: 40px; width: 340px; max-width: 90vw; background: #fff; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.14); z-index: 60; overflow: hidden; }
.dd-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.dd-list { max-height: 60vh; overflow-y: auto; }
.ni { display: flex; gap: 10px; padding: 11px 14px; border-bottom: 1px solid #f1f5f9; cursor: pointer; }
.ni:hover { background: #f8fafc; }
.ni.empty { justify-content: center; color: var(--muted); cursor: default; }
.ni-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; background: #cbd5e1; flex: none; }
.ni.unread .ni-dot { background: var(--brand); }
.ni.success .ni-dot { background: #16a34a; } .ni.warning .ni-dot { background: #d97706; } .ni.error .ni-dot { background: #dc2626; }
.ni-title { font-size: 13px; font-weight: 600; }
.ni-text { font-size: 12px; color: var(--muted); margin-top: 2px; }
.ni-time { font-size: 11px; color: #94a3b8; margin-top: 3px; }
.backdrop { position: fixed; inset: 0; z-index: 55; }
</style>
