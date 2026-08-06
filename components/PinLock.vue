<template>
  <div class="lock-wrap">
    <div class="lock-card">
      <div class="logo">{{ brandLetter }}</div>
      <h2>{{ title }}</h2>
      <div class="lk-sub">{{ sub }}</div>
      <div class="pin-dots">
        <div v-for="i in dots" :key="i" class="pin-dot" :class="{ on: i <= buf.length }"></div>
      </div>
      <div class="pin-pad">
        <div v-for="k in ['1','2','3','4','5','6','7','8','9']" :key="k" class="pin-key" @click="press(k)">{{ k }}</div>
        <div class="pin-key wide" @click="del">⌫</div>
        <div class="pin-key" @click="press('0')">0</div>
        <div class="pin-key wide" @click="submit">{{ busy ? '…' : '✓' }}</div>
      </div>
      <div class="error">{{ err }}</div>
      <div class="lk-foot"><a href="#" class="link" @click.prevent="exit">Выйти</a><span style="color:#94a3b8">🔒 Зашифровано</span></div>
    </div>
  </div>
</template>

<script lang="ts">
// Module-scoped singleton: the physical-keyboard handler is registered exactly once,
// no matter how many times the component (re)mounts — this is what prevents the
// "digit duplicates on keypress" bug (stacked listeners from HMR/remounts).
// Handlers live on `window` so the single bound listener always sees the current
// instance — survives HMR re-evaluation of this module too.
if (typeof window !== 'undefined' && !(window as any).__ttrPinKeyBound) {
  (window as any).__ttrPinKeyBound = true;
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const h = (window as any).__ttrPinHandlers;
    if (!h || e.repeat) return;
    if (/^[0-9]$/.test(e.key)) h.press(e.key);
    else if (e.key === 'Backspace') h.del();
    else if (e.key === 'Enter') h.submit();
  });
}
</script>

<script setup lang="ts">
const auth = useAuth();
const lock = useLock();

const buf = ref('');
const first = ref('');
const err = ref('');
const attempts = ref(0);
const busy = ref(false);

const brandLetter = computed(() => ((auth.tenant?.brandName || 'T').charAt(0) || 'T').toUpperCase());
const dots = computed(() => Math.max(4, buf.value.length));
const title = computed(() => lock.mode === 'create' ? 'Создайте PIN-код' : lock.mode === 'confirm' ? 'Повторите PIN-код' : 'Введите PIN-код');
const sub = computed(() => lock.mode === 'create' ? 'Он шифрует ваш доступ на этом устройстве' : lock.mode === 'confirm' ? 'Введите те же цифры ещё раз' : (auth.user?.fullName || 'Разблокировка'));

// Universal de-dupe: collapse any duplicate presses that arrive within 40ms of each
// other (stacked listeners, ghost clicks, touch+click). A human tapping a PIN pad is
// always slower than that, so real input is never dropped. This fixes duplication even
// before the page is reloaded, on top of the single-listener binding above.
let lastPressTs = 0;
function press(d: string) {
  if (busy.value) return;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (now - lastPressTs < 40) return;
  lastPressTs = now;
  if (buf.value.length < 8) { buf.value += d; err.value = ''; }
}
function del() { if (!busy.value) buf.value = buf.value.slice(0, -1); }

async function submit() {
  if (busy.value) return;
  if (buf.value.length < 4) { err.value = 'Минимум 4 цифры'; return; }
  if (lock.mode === 'create') { first.value = buf.value; buf.value = ''; lock.mode = 'confirm'; return; }
  if (lock.mode === 'confirm') {
    if (buf.value !== first.value) { buf.value = ''; first.value = ''; lock.mode = 'create'; err.value = 'PIN-коды не совпали — начните заново'; return; }
    busy.value = true;
    try { await auth.createVault(buf.value); lock.unlock(); }
    catch (e: any) { err.value = e.message; }
    finally { busy.value = false; }
    return;
  }
  // enter -> decrypt vault
  busy.value = true;
  try {
    const ok = await auth.unlockVault(buf.value);
    if (ok) { attempts.value = 0; lock.unlock(); }
    else {
      attempts.value++; buf.value = '';
      if (attempts.value >= 5) { await auth.logout(); }
      else err.value = `Неверный PIN (попытка ${attempts.value}/5)`;
    }
  } finally { busy.value = false; }
}
async function exit() { await auth.logout(); }

// Physical-keyboard support. The listener is bound ONCE at module scope and delegates
// to the currently-mounted instance — so remounts (incl. HMR) can never stack listeners
// and double every keypress. `e.repeat` ignores auto-repeat from a held key.
onMounted(() => { (window as any).__ttrPinHandlers = { press, del, submit }; });
onUnmounted(() => { if ((window as any).__ttrPinHandlers && (window as any).__ttrPinHandlers.press === press) (window as any).__ttrPinHandlers = null; });
</script>
