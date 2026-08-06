<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Касса — терминал</h2>
      <div class="toolbar">
        <select v-model="registerId" @change="onRegisterChange">
          <option v-for="r in registers" :key="r.id" :value="r.id" :disabled="!r.active">{{ r.name }}</option>
        </select>
        <span v-if="shift" class="tag open">Смена {{ shift.number }}</span>
        <button v-if="shift" class="btn ghost sm" @click="openClose = true">Закрыть смену</button>
      </div>
    </div>
  </div>

  <!-- No open shift → open one -->
  <div v-if="registerId && !shift" class="panel" style="margin-top:16px">
    <div class="panel-body" style="max-width:420px">
      <h3>Смена не открыта</h3>
      <p class="muted">Введите сумму разменного фонда в кассе и откройте смену.</p>
      <label>Разменный фонд (сум)</label>
      <input v-model.number="openFloatUzs" type="number" min="0" />
      <button class="btn" style="margin-top:12px" @click="openShift">Открыть смену</button>
    </div>
  </div>

  <!-- Open shift → till -->
  <div v-if="shift" class="till">
    <div class="panel till-search">
      <div class="panel-head"><h3>Товары</h3></div>
      <div class="panel-body">
        <input ref="searchBox" v-model="search" placeholder="Поиск / SKU / штрихкод — Enter" @keydown.enter="quickAdd" />
        <div class="results">
          <button v-for="p in found" :key="p.id" class="prod" @click="addToCart(p)">
            <span class="prod-name">{{ p.name }}</span>
            <span class="prod-meta"><small class="muted">{{ p.sku }}</small> · {{ money(Number(p.priceMinor)) }}</span>
          </button>
          <div v-if="!found.length" class="muted" style="padding:12px">Начните вводить название или SKU.</div>
        </div>
      </div>
    </div>

    <div class="panel till-cart">
      <div class="panel-head"><h3>Чек</h3><button v-if="cart.length" class="btn ghost sm" @click="cart = []">Очистить</button></div>
      <div class="panel-body">
        <table v-if="cart.length">
          <thead><tr><th>Товар</th><th class="num">Цена</th><th class="num">Кол-во</th><th class="num">Сумма</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(l, i) in cart" :key="l.productId">
              <td>{{ l.name }}</td>
              <td class="num">{{ money(l.unitPriceMinor) }}</td>
              <td class="num"><input v-model.number="l.qty" type="number" min="1" style="width:64px" @input="l.qty = Math.max(1, Number(l.qty) || 1)" /></td>
              <td class="num">{{ money(l.unitPriceMinor * l.qty) }}</td>
              <td><button class="btn ghost sm" @click="cart.splice(i, 1)">✕</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted" style="padding:12px">Чек пуст. Добавьте товары.</div>

        <div class="totals">
          <div><span>Подытог</span><b>{{ money(subtotal) }}</b></div>
          <div><span>Скидка (сум)</span><input v-model.number="discountUzs" type="number" min="0" style="width:120px" /></div>
          <div v-if="vat.enabled"><span>НДС {{ vat.ratePct }}%</span><b>{{ money(vatMinor) }}</b></div>
          <div class="grand"><span>Итого</span><b>{{ money(totalMinor) }}</b></div>
        </div>

        <div class="pay">
          <div class="seg">
            <button v-for="m in ['cash','card','mixed']" :key="m" :class="{ active: method === m }" @click="method = m">{{ payLabel(m) }}</button>
          </div>
          <div v-if="method === 'cash' || method === 'mixed'"><label>Внесено наличными (сум)</label><input v-model.number="tenderedUzs" type="number" min="0" /></div>
          <div v-if="method === 'mixed'"><label>Оплата картой (сум)</label><input v-model.number="cardUzs" type="number" min="0" /></div>
          <div v-if="changeMinor > 0" class="change">Сдача: <b>{{ money(changeMinor) }}</b></div>
          <button class="btn pay-btn" :disabled="!cart.length || busy" @click="checkout">Оплатить {{ money(totalMinor) }}</button>
        </div>

        <div v-if="lastReceipt" class="last">
          <div>✓ Чек <b>{{ lastReceipt.number }}</b> — {{ money(Number(lastReceipt.totalMinor)) }}<span v-if="Number(lastReceipt.changeMinor) > 0"> · сдача {{ money(Number(lastReceipt.changeMinor)) }}</span></div>
          <button class="btn ghost sm" @click="refundLast">Возврат по чеку</button>
        </div>
      </div>
    </div>
  </div>

  <Modal v-if="openClose" title="Закрытие смены" submit-label="Закрыть смену" @close="openClose = false" @submit="closeShift">
    <p class="muted">Ожидается в кассе: <b>{{ money(expectedCash) }}</b> (фонд {{ money(Number(shift?.openingFloatMinor || 0)) }} + наличная выручка).</p>
    <label>Фактически в кассе (сум)</label>
    <input v-model.number="countedUzs" type="number" min="0" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const registers = ref<any[]>([]); const vat = reactive<any>({ enabled: false, ratePct: 12 });
const registerId = ref(''); const shift = ref<any>(null);
const openFloatUzs = ref(0);
const search = ref(''); const found = ref<any[]>([]);
const cart = ref<any[]>([]);
const discountUzs = ref(0); const method = ref('cash'); const tenderedUzs = ref(0); const cardUzs = ref(0);
const busy = ref(false); const lastReceipt = ref<any>(null);
const openClose = ref(false); const countedUzs = ref(0);
const searchBox = ref<any>(null);

const subtotal = computed(() => cart.value.reduce((s, l) => s + l.unitPriceMinor * l.qty, 0));
const netMinor = computed(() => Math.max(0, subtotal.value - Math.round((Number(discountUzs.value) || 0) * 100)));
const vatMinor = computed(() => vat.enabled ? Math.round(netMinor.value * vat.ratePct / 100) : 0);
const totalMinor = computed(() => netMinor.value + vatMinor.value);
const tenderedMinor = computed(() => Math.round((Number(tenderedUzs.value) || 0) * 100));
const cardMinor = computed(() => Math.round((Number(cardUzs.value) || 0) * 100));
const changeMinor = computed(() => {
  if (method.value === 'card') return 0;
  const cashNeeded = method.value === 'mixed' ? Math.max(0, totalMinor.value - cardMinor.value) : totalMinor.value;
  return Math.max(0, tenderedMinor.value - cashNeeded);
});
const expectedCash = computed(() => Number(shift.value?.openingFloatMinor || 0) + Number(shift.value?.cashSalesMinor || 0));

function payLabel(m: string) { return ({ cash: 'Наличные', card: 'Карта', mixed: 'Смешанно' } as any)[m]; }

async function loadRegisters() {
  const d = await auth.api('/pos/registers');
  registers.value = d.registers; Object.assign(vat, d.vat);
  if (!registerId.value && registers.value.length) registerId.value = (registers.value.find((r) => r.active) || registers.value[0]).id;
}
async function loadShift() {
  if (!registerId.value) { shift.value = null; return; }
  shift.value = (await auth.api(`/pos/shifts/current?registerId=${registerId.value}`)).shift;
}
async function onRegisterChange() { cart.value = []; lastReceipt.value = null; await loadShift(); }
async function openShift() {
  try { await auth.api('/pos/shifts/open', { method: 'POST', body: { registerId: registerId.value, openingFloatMinor: Math.round((Number(openFloatUzs.value) || 0) * 100) } }); toast('Смена открыта'); await loadShift(); }
  catch (e: any) { toast(e.message, true); }
}
async function closeShift() {
  try { const r = await auth.api(`/pos/shifts/${shift.value.id}/close`, { method: 'POST', body: { countedCashMinor: Math.round((Number(countedUzs.value) || 0) * 100) } }); openClose.value = false; const v = Number(r.shift.cashVarianceMinor); toast(`Смена закрыта. Расхождение: ${money(v)}`, v !== 0); shift.value = null; cart.value = []; }
  catch (e: any) { toast(e.message, true); }
}

let searchTimer: any;
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 250); });
async function runSearch() {
  const q = search.value.trim();
  if (!q) { found.value = []; return; }
  const r = await auth.api(`/catalog/products?pageSize=15&search=${encodeURIComponent(q)}`);
  found.value = r.products;
}
async function quickAdd() {
  const q = search.value.trim();
  if (!q) return;
  // Try barcode/SKU exact match first, else take the top search result.
  try { const r = await auth.api(`/catalog/products/by-barcode/${encodeURIComponent(q)}`); if (r.product) { addToCart(r.product); return; } } catch {}
  await runSearch();
  if (found.value.length) addToCart(found.value[0]);
}
function addToCart(p: any) {
  const existing = cart.value.find((l) => l.productId === p.id);
  if (existing) existing.qty += 1;
  else cart.value.push({ productId: p.id, name: p.name, sku: p.sku, unitPriceMinor: Number(p.priceMinor) || 0, qty: 1 });
  search.value = ''; found.value = [];
  searchBox.value?.focus?.();
}
async function checkout() {
  if (!cart.value.length) return;
  busy.value = true;
  try {
    const body: any = {
      registerId: registerId.value, paymentMethod: method.value,
      discountMinor: Math.round((Number(discountUzs.value) || 0) * 100),
      lines: cart.value.map((l) => ({ productId: l.productId, qty: l.qty, unitPriceMinor: l.unitPriceMinor })),
    };
    if (method.value === 'cash' || method.value === 'mixed') body.tenderedMinor = tenderedMinor.value;
    if (method.value === 'mixed') body.cardMinor = cardMinor.value;
    const r = await auth.api('/pos/receipts', { method: 'POST', body });
    lastReceipt.value = r.receipt;
    toast(`Чек ${r.receipt.number} проведён`);
    cart.value = []; discountUzs.value = 0; tenderedUzs.value = 0; cardUzs.value = 0;
    await loadShift();
  } catch (e: any) { toast(e.message, true); }
  finally { busy.value = false; }
}
async function refundLast() {
  if (!lastReceipt.value) return;
  if (!confirm(`Оформить возврат по чеку ${lastReceipt.value.number}?`)) return;
  try { const r = await auth.api(`/pos/receipts/${lastReceipt.value.id}/refund`, { method: 'POST' }); toast(`Возврат ${r.receipt.number} оформлен`); lastReceipt.value = null; await loadShift(); }
  catch (e: any) { toast(e.message, true); }
}

onMounted(async () => { await loadRegisters(); await loadShift(); });
</script>

<style scoped>
.till { display: grid; grid-template-columns: 1fr 1.1fr; gap: 16px; margin-top: 16px; align-items: start; }
@media (max-width: 900px) { .till { grid-template-columns: 1fr; } }
.results { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; max-height: 60vh; overflow-y: auto; }
.prod { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; background: #fff; cursor: pointer; text-align: left; }
.prod:hover { border-color: var(--accent, #2563eb); background: #f8fafc; }
.prod-name { font-weight: 500; }
.totals { margin-top: 14px; border-top: 1px solid var(--border, #e2e8f0); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.totals > div { display: flex; justify-content: space-between; align-items: center; }
.totals .grand { font-size: 18px; border-top: 1px dashed var(--border, #e2e8f0); padding-top: 8px; }
.pay { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.seg { display: flex; gap: 6px; }
.seg button { flex: 1; padding: 8px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; background: #fff; cursor: pointer; }
.seg button.active { background: var(--accent, #2563eb); color: #fff; border-color: var(--accent, #2563eb); }
.pay-btn { padding: 14px; font-size: 16px; }
.change { font-size: 16px; color: var(--ok, #16a34a); }
.last { margin-top: 12px; padding: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.open { background: #dcfce7; color: #166534; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
