<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ t('nav.sales-orders') }}</h2>
      <div class="toolbar"><button v-if="canWrite" class="btn sm" @click="openCreate">{{ t('so.addBtn') }}</button></div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>{{ t('common.number') }}</th><th>{{ t('common.customer') }}</th><th>{{ t('common.status') }}</th><th class="num">{{ t('ord.positions') }}</th><th class="num">{{ t('common.amount') }}</th><th>{{ t('so.shipCol') }}</th><th>{{ t('common.actions') || '' }}</th></tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td><small>{{ o.number }}</small></td><td>{{ o.customer }}</td>
            <td><span class="tag" :class="statusCls(o.status)">{{ statusLabel(o.status) }}</span></td>
            <td class="num">{{ o.itemCount }}</td><td class="num">{{ money(o.totalMinor) }}</td>
            <td>{{ o.expectedAt ? new Date(o.expectedAt).toLocaleDateString('ru-RU') : '—' }}</td>
            <td>
              <button v-if="o.status === 'draft' && canConfirm" class="btn sm" @click="act(o.id, 'confirm')">{{ t('so.confirm') }}</button>
              <button v-if="['confirmed','partially_shipped'].includes(o.status) && canConfirm" class="btn ghost sm" @click="act(o.id, 'reserve')">{{ t('so.reserve') }}</button>
              <button v-if="canShip && ['confirmed','partially_shipped'].includes(o.status)" class="btn green sm" @click="openShip(o)">{{ t('so.ship') }}</button>
              <button v-if="canShip && ['partially_shipped','shipped'].includes(o.status)" class="btn ghost sm" @click="openReturn(o)">{{ t('so.return') }}</button>
              <button v-if="canWrite && !['shipped','cancelled'].includes(o.status)" class="btn ghost sm" @click="act(o.id, 'cancel')">{{ t('so.cancel') }}</button>
            </td>
          </tr>
          <tr v-if="!orders.length"><td colspan="7" class="empty">{{ t('so.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">{{ t('common.total') }}: {{ meta.total }} · {{ t('common.page') }} {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← {{ t('common.back') }}</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">{{ t('common.next') }} →</button>
    </div>
  </div>

  <!-- Create SO -->
  <Modal v-if="c.show" half :title="t('so.new')" :submit-label="t('common.create')" @close="c.show = false" @submit="submitCreate">
    <div class="row2">
      <div><label>{{ t('common.customer') }}</label><select v-model="c.customerId"><option v-for="cu in customers" :key="cu.id" :value="cu.id">{{ cu.name }}</option></select></div>
      <div><label>{{ t('ord.shipWh') }}</label><select v-model="c.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>{{ t('ord.expectedDate') }}</label><input v-model="c.expectedAt" type="date" /></div>
      <div><label>{{ t('so.orderDiscount') }}</label><input v-model.number="c.discountPct" type="number" min="0" max="100" /></div>
    </div>
    <label style="margin-top:8px">{{ t('ord.positions') }}</label>
    <div v-for="(it, i) in c.items" :key="i" class="row-line">
      <select v-model="it.productId" @change="applyPrice(it)"><option value="">— {{ t('ord.item') }} —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
      <input v-model.number="it.quantity" type="number" step="0.001" min="0" :placeholder="t('ord.qtyPh')" style="max-width:80px" />
      <input v-model.number="it.price" type="number" min="0" step="0.01" :placeholder="t('ord.pricePh')" style="max-width:100px" />
      <input v-model.number="it.discountPct" type="number" min="0" max="100" placeholder="%" style="max-width:55px" :title="t('ord.discount')" />
      <button type="button" class="btn ghost sm" @click="c.items.splice(i, 1)">✕</button>
    </div>
    <button type="button" class="btn ghost sm" @click="c.items.push({ productId: '', quantity: 1, price: 0, discountPct: 0 })">{{ t('ord.addLine') }}</button>
    <div class="hint" style="text-align:left;margin-top:8px">{{ t('ord.subtotal') }}: {{ money(previewTotal) }}</div>
  </Modal>

  <!-- Ship -->
  <Modal v-if="s.show" half :title="`${t('so.shipTitle')} ${s.number}`" :submit-label="t('so.ship')" @close="s.show = false" @submit="submitShip">
    <label>{{ t('nav.warehouses') }}</label><select v-model="s.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <table style="margin-top:10px;font-size:13px"><thead><tr><th>{{ t('common.product') }}</th><th class="num">{{ t('so.colOrder') }}</th><th class="num">{{ t('so.colShipped') }}</th><th class="num">{{ t('so.colShip') }}</th></tr></thead>
      <tbody>
        <tr v-for="it in s.items" :key="it.id">
          <td>{{ it.productName }}</td>
          <td class="num">{{ num(it.quantity) }}</td><td class="num">{{ num(it.shippedQty) }}</td>
          <td class="num"><input v-model.number="it.take" type="number" step="0.001" min="0" :max="remaining(it)" style="max-width:80px" /></td>
        </tr>
      </tbody>
    </table>
  </Modal>

  <!-- Return -->
  <Modal v-if="r.show" half :title="`${t('so.returnTitle')} ${r.number}`" :submit-label="t('so.returnSubmit')" @close="r.show = false" @submit="submitReturn">
    <label>{{ t('so.recvWh') }}</label><select v-model="r.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <label>{{ t('so.reason') }}</label><input v-model="r.reason" :placeholder="t('so.reasonPh')" />
    <table style="margin-top:10px;font-size:13px"><thead><tr><th>{{ t('common.product') }}</th><th class="num">{{ t('so.colShipped') }}</th><th class="num">{{ t('so.colReturn') }}</th></tr></thead>
      <tbody>
        <tr v-for="it in r.items" :key="it.id">
          <td>{{ it.productName }}</td><td class="num">{{ num(it.shippedQty) }}</td>
          <td class="num"><input v-model.number="it.take" type="number" step="0.001" min="0" :max="Number(it.shippedQty)" style="max-width:80px" /></td>
        </tr>
      </tbody>
    </table>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const orders = ref<any[]>([]); const meta = ref<any>(null); const page = ref(1);
const customers = ref<any[]>([]); const warehouses = ref<any[]>([]); const products = ref<any[]>([]); const priceLists = ref<any[]>([]);
const canWrite = computed(() => auth.can('sales.write'));
const canConfirm = computed(() => auth.can('sales.confirm'));
const canShip = computed(() => auth.can('sales.ship'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));

const c = reactive<any>({ show: false, customerId: '', warehouseId: '', expectedAt: '', discountPct: 0, items: [] as any[] });
const s = reactive<any>({ show: false, id: '', number: '', warehouseId: '', items: [] as any[] });
const r = reactive<any>({ show: false, id: '', number: '', warehouseId: '', reason: '', items: [] as any[] });

const statusLabel = (st: string) => t(`st.${st}`) || st;
const statusCls = (st: string) => ({ draft: 'muted', confirmed: 'adjust', partially_shipped: 'adjust', shipped: 'in', cancelled: 'out' } as any)[st] || 'muted';
const remaining = (it: any) => Number(it.quantity) - Number(it.shippedQty);
const previewTotal = computed(() => {
  const sub = c.items.reduce((sum: number, it: any) => sum + Math.round((Number(it.price) || 0) * 100 * (1 - (Number(it.discountPct) || 0) / 100)) * (Number(it.quantity) || 0), 0);
  return Math.round(sub * (1 - (Number(c.discountPct) || 0) / 100));
});

function defaultPrice(productId: string): number {
  const dl = priceLists.value.find((l: any) => l.isDefault) || priceLists.value[0];
  const item = dl?.items?.find((x: any) => x.productId === productId);
  if (item) return item.priceMinor / 100;
  const p = products.value.find((x: any) => x.id === productId);
  return p?.priceMinor != null ? p.priceMinor / 100 : 0;
}
function applyPrice(it: any) { if (it.productId && !it.price) it.price = defaultPrice(it.productId); }

async function reload(p = 1) {
  page.value = p;
  const res = await auth.api(`/sales/orders?page=${p}&pageSize=25`);
  orders.value = res.orders; meta.value = res.meta;
}
async function loadRefs() {
  const [cu, w, pr, pl] = await Promise.all([auth.api('/sales/customers?pageSize=200'), auth.api('/warehouse/warehouses'), auth.api('/catalog/products?pageSize=200'), auth.api('/sales/price-lists')]);
  customers.value = cu.customers; warehouses.value = w.warehouses; products.value = pr.products; priceLists.value = pl.priceLists;
}
function openCreate() { Object.assign(c, { show: true, customerId: customers.value[0]?.id || '', warehouseId: warehouses.value[0]?.id || '', expectedAt: '', discountPct: 0, items: [{ productId: '', quantity: 1, price: 0, discountPct: 0 }] }); }
async function submitCreate() {
  try {
    const items = c.items.filter((i: any) => i.productId && i.quantity > 0).map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity), priceMinor: Math.round((Number(i.price) || 0) * 100), discountPct: Number(i.discountPct) || 0 }));
    if (!items.length) { toast(t('so.qtyReq'), true); return; }
    await auth.api('/sales/orders', { method: 'POST', body: { customerId: c.customerId, warehouseId: c.warehouseId || undefined, expectedAt: c.expectedAt || undefined, discountPct: Number(c.discountPct) || 0, items } });
    c.show = false; toast(t('so.created')); await reload(1);
  } catch (e: any) { toast(e.message, true); }
}
async function act(id: string, action: string) {
  try { await auth.api(`/sales/orders/${id}/${action}`, { method: 'POST' }); toast(t('ord.done')); await reload(page.value); }
  catch (e: any) { toast(e.message, true); }
}
async function openShip(o: any) {
  const res = await auth.api(`/sales/orders/${o.id}`);
  const items = res.order.items.filter((it: any) => Number(it.quantity) > Number(it.shippedQty)).map((it: any) => ({ ...it, take: Number(it.quantity) - Number(it.shippedQty) }));
  Object.assign(s, { show: true, id: o.id, number: o.number, warehouseId: o.warehouseId || warehouses.value[0]?.id || '', items });
}
async function submitShip() {
  try {
    const items = s.items.filter((it: any) => it.take > 0).map((it: any) => ({ productId: it.productId, quantity: Number(it.take) }));
    if (!items.length) { toast(t('so.qtyReq'), true); return; }
    await auth.api(`/sales/orders/${s.id}/ship`, { method: 'POST', body: { warehouseId: s.warehouseId, items } });
    s.show = false; toast(t('so.shipped2')); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
async function openReturn(o: any) {
  const res = await auth.api(`/sales/orders/${o.id}`);
  const items = res.order.items.filter((it: any) => Number(it.shippedQty) > 0).map((it: any) => ({ ...it, take: 0 }));
  if (!items.length) { toast(t('so.nothingReturn'), true); return; }
  Object.assign(r, { show: true, id: o.id, number: o.number, warehouseId: o.warehouseId || warehouses.value[0]?.id || '', reason: '', items });
}
async function submitReturn() {
  try {
    const items = r.items.filter((it: any) => it.take > 0).map((it: any) => ({ productId: it.productId, quantity: Number(it.take) }));
    if (!items.length) { toast(t('so.qtyReq'), true); return; }
    await auth.api('/sales/returns', { method: 'POST', body: { soId: r.id, warehouseId: r.warehouseId, reason: r.reason || undefined, items } });
    r.show = false; toast(t('so.returned')); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => { await loadRefs(); await reload(1); });
</script>

<style scoped>
.row-line { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.row-line select { flex: 1; }
</style>
