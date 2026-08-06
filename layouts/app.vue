<template>
  <div class="shell">
    <div v-if="navOpen" class="nav-backdrop" @click="navOpen = false"></div>
    <aside class="sidebar" :class="{ open: navOpen }" :style="drawerStyle">
      <div class="brand-row"><div class="logo">{{ brandLetter }}</div><div class="brand-name">{{ brandName }}</div>
        <button class="nav-close" @click="navOpen = false" aria-label="Закрыть">✕</button>
      </div>
      <nav class="nav" @click="navOpen = false">
        <template v-for="g in groups" :key="g.id">
          <div v-if="g.label" class="nav-group" :class="{ collapsed: isCollapsed(g.id) }" @click="toggle(g.id)">
            <span>{{ g.label }}</span><span class="chev">{{ isCollapsed(g.id) ? '▸' : '▾' }}</span>
          </div>
          <template v-if="!g.label || !isCollapsed(g.id)">
            <NuxtLink v-for="v in g.views" :key="v.id" :to="v.to" active-class="active" :class="{ 'in-group': !!g.label }">
              <span class="ico">{{ v.ico }}</span>{{ v.label }}
            </NuxtLink>
          </template>
        </template>
      </nav>
    </aside>
    <div class="main">
      <div v-if="banner" :class="['banner', banner.cls]">
        <span v-html="banner.html"></span>
      </div>
      <div class="topbar">
        <button class="hamburger" @click="navOpen = true" aria-label="Меню">☰</button>
        <h1>{{ pageTitle }}</h1>
        <div class="userbox">
          <GlobalSearch v-if="ready" class="topsearch desktop-only" />
          <NotificationsBell v-if="ready" />
          <span class="desktop-only">{{ auth.tenant?.name }}</span>
          <div class="avatar">{{ avatarLetter }}</div>
          <span class="desktop-only">{{ auth.user?.fullName }}</span>
          <LangSwitcher class="desktop-only" />
          <button class="btn ghost sm desktop-only" @click="showSecurity = true">{{ t('topbar.security') }}</button>
          <button class="btn ghost sm desktop-only" @click="showChangePw = true">{{ t('topbar.changePw') }}</button>
          <button class="btn ghost sm desktop-only" @click="lock.lockNow()">{{ t('topbar.lock') }}</button>
          <button class="btn ghost sm desktop-only" @click="auth.logout()">{{ t('topbar.logout') }}</button>
          <div class="user-menu">
            <button class="hamburger" @click="userMenuOpen = !userMenuOpen" aria-label="Аккаунт">⋮</button>
            <template v-if="userMenuOpen">
              <div class="um-back" @click="userMenuOpen = false"></div>
              <div class="um-drop">
                <div class="um-head"><b>{{ auth.user?.fullName }}</b><small>{{ auth.tenant?.name }}</small></div>
                <div class="um-lang"><LangSwitcher /></div>
                <button @click="act(() => showSecurity = true)">🔒 {{ t('topbar.security') }}</button>
                <button @click="act(() => showChangePw = true)">🔑 {{ t('topbar.changePw') }}</button>
                <button @click="act(() => lock.lockNow())">⏻ {{ t('topbar.lock') }}</button>
                <button @click="act(() => auth.logout())">↪ {{ t('topbar.logout') }}</button>
              </div>
            </template>
          </div>
        </div>
      </div>
      <!-- Render the page (which fetches data) only once tokens are decrypted. -->
      <div class="content"><slot v-if="auth.access && auth.booted" /></div>
    </div>

    <SecurityModal v-if="showSecurity" @close="showSecurity = false" />
    <ChangePasswordModal v-if="showChangePw" @close="showChangePw = false" />
  </div>
</template>

<script setup lang="ts">
const auth = useAuth();
const lock = useLock();
const route = useRoute();
const { groups } = useNav();
const notifs = useNotifications();
const realtime = useRealtime();
const { t } = useI18n();
const showSecurity = ref(false);
const showChangePw = ref(false);

// Mobile: off-canvas nav drawer + account menu.
const navOpen = ref(false);
const userMenuOpen = ref(false);
const isMobile = ref(false);
const ready = computed(() => auth.access && auth.booted);
function act(fn: () => void) { userMenuOpen.value = false; fn(); }
watch(() => route.path, () => { navOpen.value = false; userMenuOpen.value = false; });
// Drive the drawer position via inline style on mobile (bulletproof vs CSS cascade).
const drawerStyle = computed(() => (isMobile.value ? { transform: navOpen.value ? 'translateX(0)' : 'translateX(-100%)' } : {}));
onMounted(() => {
  const mq = window.matchMedia('(max-width: 860px)');
  isMobile.value = mq.matches;
  mq.addEventListener('change', (e) => { isMobile.value = e.matches; if (!e.matches) navOpen.value = false; });
});

// Load notifications + open the realtime stream once the session is live; tear the
// stream down on logout/lock so it doesn't reconnect with a dead token.
watch(() => auth.access && auth.booted, (ready) => {
  if (ready) { notifs.load(); realtime.connect(); }
  else realtime.disconnect();
}, { immediate: true });
onBeforeUnmount(() => realtime.disconnect());

// Collapsible nav groups, remembered in localStorage.
const collapsed = ref<Record<string, boolean>>({});
onMounted(() => { try { collapsed.value = JSON.parse(localStorage.getItem('ttr_nav') || '{}'); } catch { collapsed.value = {}; } });
const isCollapsed = (id: string) => !!collapsed.value[id];
function toggle(id: string) {
  collapsed.value = { ...collapsed.value, [id]: !collapsed.value[id] };
  if (import.meta.client) localStorage.setItem('ttr_nav', JSON.stringify(collapsed.value));
}

const brandName = computed(() => auth.tenant?.brandName || 'TTR ONE');
const brandLetter = computed(() => (brandName.value.charAt(0) || 'T').toUpperCase());
const avatarLetter = computed(() => (auth.user?.fullName || '?').charAt(0).toUpperCase());
const viewTitle = useViewTitle();
const pageTitle = computed(() => viewTitle(route.path));

const banner = computed(() => {
  const s = auth.subscription;
  if (!s) return null;
  if (s.status === 'trialing') return { cls: 'trial', html: `🎁 Пробный период: осталось <b>${s.trialDaysLeft ?? 0}</b> дн. ${auth.can('tenant.manage') ? '<a href="/billing" class="banner-link">Оформить подписку</a>' : ''}` };
  if (s.status === 'past_due' || s.status === 'cancelled') return { cls: 'past', html: `⚠ Подписка неактивна — изменения заблокированы. ${auth.can('tenant.manage') ? '<a href="/billing" class="banner-link">Оплатить</a>' : ''}` };
  return null;
});

// Apply white-label accent color when set.
watchEffect(() => {
  if (!import.meta.client) return;
  const c = auth.tenant?.brandColor;
  const root = document.documentElement;
  if (c) { root.style.setProperty('--brand', c); root.style.setProperty('--brand-dark', c); }
  else { root.style.removeProperty('--brand'); root.style.removeProperty('--brand-dark'); }
});

onMounted(async () => {
  // enforce() resumes a valid warm session (no PIN on reload within the grace window),
  // otherwise shows the PIN screen (idle-expired / manual lock / fresh cold load).
  await lock.enforce();
});
</script>
