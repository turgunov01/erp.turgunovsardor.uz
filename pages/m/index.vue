<template>
  <div class="op">
    <!-- Warehouse + pending -->
    <div class="row">
      <select v-model="warehouseId" class="wh" @change="onWh">
        <option value="" disabled>Выберите склад…</option>
        <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
      </select>
      <button v-if="pending > 0" class="pend" @click="sync">⇅ {{ pending }}</button>
    </div>

    <!-- Action -->
    <div class="tabs">
      <button v-for="a in ACTIONS" :key="a.type" class="tab" :class="{ on: type === a.type }" @click="type = a.type">{{ a.label }}</button>
    </div>

    <!-- Scanner -->
    <div class="scan">
      <video v-show="scanning" ref="video" class="video" playsinline muted></video>
      <div v-if="!scanning" class="scan-idle">
        <button class="scan-btn" @click="startScan">📷 Сканировать штрихкод</button>
        <div class="manual">
          <input v-model="manual" placeholder="или введите штрихкод / артикул" @keydown.enter="lookup(manual)" />
          <button class="mini" @click="lookup(manual)">→</button>
        </div>
      </div>
      <button v-else class="stop" @click="stopScan">✕ Остановить</button>
    </div>

    <div v-if="msg" class="msg" :class="msgKind">{{ msg }}</div>

    <!-- Product card -->
    <div v-if="product" class="card">
      <div class="p-name">{{ product.name }}</div>
      <div class="p-sub">{{ product.sku }} · на складе: <b>{{ onHand }}</b> {{ product.unit?.code || '' }}</div>
      <div class="qty">
        <button class="q" @click="qty = Math.max(0, round(qty - step))">−</button>
        <input v-model.number="qty" type="number" inputmode="decimal" />
        <button class="q" @click="qty = round(qty + step)">+</button>
      </div>
      <button class="confirm" :class="type.toLowerCase()" :disabled="busy || qty <= 0" @click="submit">
        {{ ACTIONS.find(a => a.type === type)?.verb }} {{ qty }} {{ product.unit?.code || '' }}
      </button>
      <button class="cancel" @click="reset">Отмена</button>
    </div>

    <!-- Recent -->
    <div v-if="log.length" class="log">
      <div class="log-h">Последние операции</div>
      <div v-for="(l, i) in log" :key="i" class="log-i" :class="l.kind">
        <span>{{ l.text }}</span><span class="log-t">{{ l.queued ? 'оффлайн' : '✓' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { enqueue, countOps, flush } from '~/utils/outbox';
definePageMeta({ layout: 'mobile' });
const auth = useAuth();

const ACTIONS = [
  { type: 'IN', label: 'Приём', verb: 'Оприходовать' },
  { type: 'OUT', label: 'Расход', verb: 'Списать' },
  { type: 'ADJUST', label: 'Инвент.', verb: 'Установить' },
];
const warehouses = ref<any[]>([]);
const warehouseId = ref('');
const type = ref('IN');
const product = ref<any>(null);
const onHand = ref(0);
const qty = ref(1);
const step = 1;
const manual = ref('');
const scanning = ref(false);
const busy = ref(false);
const msg = ref(''); const msgKind = ref('');
const pending = ref(0);
const log = ref<{ text: string; kind: string; queued?: boolean }[]>([]);
const video = ref<HTMLVideoElement | null>(null);
let stream: MediaStream | null = null;
let detector: any = null;
let raf = 0;

const round = (n: number) => Math.round(n * 1000) / 1000;
function flash(text: string, kind = 'ok') { msg.value = text; msgKind.value = kind; setTimeout(() => { if (msg.value === text) msg.value = ''; }, 3000); }

async function loadWh() {
  try { warehouses.value = (await auth.api<any>('/warehouse/warehouses')).warehouses; } catch { warehouses.value = []; }
  warehouseId.value = localStorage.getItem('ttr_m_wh') || warehouses.value[0]?.id || '';
}
function onWh() { localStorage.setItem('ttr_m_wh', warehouseId.value); product.value = null; }

async function refreshOnHand() {
  if (!product.value || !warehouseId.value) return;
  try {
    const d = await auth.api<any>(`/warehouse/stock?warehouseId=${warehouseId.value}&pageSize=500`);
    const row = d.stock.find((s: any) => s.productId === product.value.id);
    onHand.value = row ? Number(row.quantity) : 0;
  } catch { onHand.value = 0; }
}

// ---- Barcode scanning ----
async function startScan() {
  if (!warehouseId.value) { flash('Сначала выберите склад', 'err'); return; }
  if (!('BarcodeDetector' in window)) { flash('Сканер не поддерживается — введите код вручную', 'err'); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    scanning.value = true;
    await nextTick();
    if (video.value) { video.value.srcObject = stream; await video.value.play(); }
    detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'] });
    tick();
  } catch { flash('Нет доступа к камере', 'err'); scanning.value = false; }
}
async function tick() {
  if (!scanning.value || !video.value) return;
  try {
    const codes = await detector.detect(video.value);
    if (codes.length) { const code = codes[0].rawValue; stopScan(); await lookup(code); return; }
  } catch { /* frame not ready */ }
  raf = requestAnimationFrame(tick);
}
function stopScan() {
  scanning.value = false;
  cancelAnimationFrame(raf);
  stream?.getTracks().forEach((t) => t.stop()); stream = null;
}

async function lookup(code: string) {
  const c = (code || '').trim(); if (!c) return;
  manual.value = '';
  try {
    // Try barcode first, then fall back to SKU/name search.
    let p: any = null;
    try { p = (await auth.api<any>(`/catalog/products/by-barcode/${encodeURIComponent(c)}`)).product; } catch { /* not a barcode */ }
    if (!p) { const s = await auth.api<any>(`/catalog/products?search=${encodeURIComponent(c)}&pageSize=1`); p = s.products[0]; }
    if (!p) { flash(`Товар не найден: ${c}`, 'err'); return; }
    product.value = p; qty.value = 1; await refreshOnHand();
    flash(`Найдено: ${p.name}`, 'ok');
  } catch (e: any) { flash('Ошибка поиска: ' + e.message, 'err'); }
}

// ---- Submit (online → API, offline → outbox) ----
async function submit() {
  if (!product.value || !warehouseId.value) return;
  busy.value = true;
  const payload = { warehouseId: warehouseId.value, productId: product.value.id, type: type.value, quantity: qty.value, reason: 'Моб. кладовщик' };
  const label = `${ACTIONS.find(a => a.type === type.value)?.label}: ${product.value.name} ×${qty.value}`;
  try {
    if (!navigator.onLine) throw { offline: true };
    await auth.api('/warehouse/movements', { method: 'POST', body: payload, retry: false });
    log.value.unshift({ text: label, kind: 'ok' });
    flash('Проведено ✓', 'ok');
  } catch (e: any) {
    // Offline or network error → queue; permanent 4xx → surface the error.
    const status = e?.status ?? e?.statusCode;
    if (e?.offline || !status) {
      await enqueue({ kind: 'movement', payload, label });
      pending.value = await countOps();
      log.value.unshift({ text: label, kind: 'queued', queued: true });
      flash('Нет сети — сохранено оффлайн', 'warn');
    } else { flash('Ошибка: ' + (e.message || status), 'err'); busy.value = false; return; }
  }
  busy.value = false; reset(); await refreshOnHand();
}
function reset() { product.value = null; qty.value = 1; }

async function sync() {
  if (!navigator.onLine) { flash('Нет сети', 'err'); return; }
  const r = await flush(async (op) => { await auth.api('/warehouse/movements', { method: 'POST', body: op.payload, retry: false }); });
  pending.value = await countOps();
  flash(`Синхронизировано: ${r.synced}${r.failed ? `, отклонено: ${r.failed}` : ''}`, 'ok');
}

onMounted(async () => {
  await loadWh();
  pending.value = await countOps();
  window.addEventListener('online', sync);
});
onBeforeUnmount(() => { stopScan(); window.removeEventListener('online', sync); });
</script>

<style scoped>
.op { max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
.row { display: flex; gap: 10px; }
.wh { flex: 1; height: 48px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0 14px; font-size: 16px; background: #fff; }
.pend { height: 48px; padding: 0 16px; border: none; border-radius: 12px; background: #f59e0b; color: #fff; font-weight: 700; }
.tabs { display: flex; gap: 8px; }
.tab { flex: 1; height: 46px; border: 1px solid #cbd5e1; background: #fff; border-radius: 12px; font-size: 15px; font-weight: 600; color: #475569; }
.tab.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.scan { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: center; }
.video { width: 100%; max-height: 300px; border-radius: 12px; background: #000; object-fit: cover; }
.scan-btn { width: 100%; height: 90px; border: 2px dashed #93c5fd; background: #eff6ff; color: #2563eb; border-radius: 14px; font-size: 17px; font-weight: 700; }
.manual { display: flex; gap: 8px; margin-top: 12px; }
.manual input { flex: 1; height: 46px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 14px; font-size: 15px; }
.mini, .stop { height: 46px; padding: 0 18px; border: none; border-radius: 10px; background: #2563eb; color: #fff; font-size: 16px; }
.stop { width: 100%; margin-top: 10px; background: #ef4444; }
.msg { padding: 12px 14px; border-radius: 10px; font-size: 14px; font-weight: 600; }
.msg.ok { background: #dcfce7; color: #166534; } .msg.err { background: #fee2e2; color: #991b1b; } .msg.warn { background: #fef3c7; color: #92400e; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; }
.p-name { font-size: 18px; font-weight: 700; } .p-sub { color: #64748b; font-size: 14px; margin-top: 4px; }
.qty { display: flex; gap: 10px; margin: 16px 0; }
.qty input { flex: 1; height: 60px; text-align: center; font-size: 26px; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 12px; }
.q { width: 60px; height: 60px; border: none; border-radius: 12px; background: #e2e8f0; font-size: 28px; }
.confirm { width: 100%; height: 56px; border: none; border-radius: 12px; color: #fff; font-size: 17px; font-weight: 700; }
.confirm.in { background: #16a34a; } .confirm.out { background: #ef4444; } .confirm.adjust { background: #f59e0b; }
.confirm:disabled { opacity: .5; }
.cancel { width: 100%; height: 44px; margin-top: 8px; border: none; background: none; color: #64748b; }
.log { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px; }
.log-h { font-size: 12px; color: #94a3b8; margin-bottom: 8px; }
.log-i { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
.log-i.queued { color: #92400e; } .log-t { color: #16a34a; font-size: 12px; }
</style>
