<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <PinLock v-if="lock.locked" />
    <div :class="['toast', { show: t.show, err: t.err }]">{{ t.msg }}</div>
  </div>
</template>

<script setup lang="ts">
const lock = useLock();
const { state: t } = useToast();

onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    // Lock on plain "L" — but not while typing in a field (so you can still type the letter L).
    if (e.key === 'l' || e.key === 'L' || e.key === 'д' || e.key === 'Д') {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const editable = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (editable || lock.locked) return;
      lock.lockNow();
    }
  };
  window.addEventListener('keydown', onKey);
  // Throttle activity handling (touch() writes the warm-session expiry).
  let last = 0;
  const touch = () => { const now = Date.now(); if (now - last > 5000) { last = now; lock.touch(); } };
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach((ev) =>
    window.addEventListener(ev, touch, { passive: true }));
});
</script>
