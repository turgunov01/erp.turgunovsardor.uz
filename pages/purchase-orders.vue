<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ t('nav.purchase-orders') }}</h2>
      <div class="toolbar"><button v-if="canWrite" class="btn sm" @click="openCreate">{{ t('po.addBtn') }}</button></div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>{{ t('common.number') }}</th><th>{{ t('po.supplier') }}</th><th>{{ t('common.status') }}</th><th class="num">{{ t('ord.positions') }}</th><th class="num">{{ t('common.amount') }}</th><th>{{ t('po.expected') }}</th><th>{{ t('common.actions') || '' }}</th></tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td><small>{{ o.number }}</small></td><td>{{ o.supplier }}</td>
            <td><span class="tag" :class="statusCls(o.status)">{{ statusLabel(o.status) }}</span></td>
            <td class="num">{{ o.itemCount }}</td><td class="num">{{ money(o.totalMinor) }}</td>
            <td>{{ o.expectedAt ? new Date(o.expectedAt).toLocaleDateString('ru-RU') : '—' }}</td>
            <td>
              <button v-if="o.status === 'draft' && canWrite" class="btn ghost sm" @click="act(o.id, 'send')">{{ t('po.send') }}</button>
              <button v-if="canReceive && ['sent','partially_received','draft'].includes(o.status)" class="btn green sm" @click="openReceive(o)">{{ t('po.receive') }}</button>
              <button v-if="canWrite && o.status !== 'received' && o.status !== 'cancelled'" class="btn ghost sm" @click="act(o.id, 'cancel')">{{ t('po.cancel') }}</button>
            </td>
          </tr>
          <tr v-if="!orders.length"><td colspan="7" class="empty">{{ t('po.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">{{ t('common.total') }}: {{ meta.total }} · {{ t('common.page') }} {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← {{ t('common.back') }}</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">{{ t('common.next') }} →</button>
    </div>
  </div>

  <!-- Create PO -->
  <Modal v-if="c.show" :title="t('po.new')" :submit-label="t('common.create')" @close="c.show = false" @submit="submitCreate">
    <div class="row2">
      <div><label>{{ t('po.supplier') }}</label><select v-model="c.supplierId"><option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option></select></div>
      <div><label>{{ t('po.recvWh') }}</label><select v-model="c.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
    </div>
    <label>{{ t('ord.expectedDate') }}</label><input v-model="c.expectedAt" type="date" />
    <label style="margin-top:8px">{{ t('ord.positions') }}</label>
    <div v-for="(it, i) in c.items" :key="i" class="row-line">
      <select v-model="it.productId"><option value="">— {{ t('ord.item') }} —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
      <input v-model.number="it.quantity" type="number" step="0.001" min="0" :placeholder="t('ord.qtyPh')" style="max-width:90px" />
      <input v-model.number="it.price" type="number" min="0" step="0.01" :placeholder="t('po.priceSum')" style="max-width:110px" :class="{ 'zero-price': it.productId && !Number(it.price) }" :title="it.productId && !Number(it.price) ? t('po.zeroPrice') : ''" />
      <button type="button" class="btn ghost sm" @click="c.items.splice(i, 1)">✕</button>
    </div>
    <button type="button" class="btn ghost sm" @click="c.items.push({ productId: '', quantity: 1, price: 0 })">{{ t('ord.addLine') }}</button>
    <div v-if="hasZeroCreate" class="zero-warn">{{ t('po.zeroWarn') }}</div>
  </Modal>

  <!-- Receive -->
  <Modal v-if="r.show" half :title="`${t('po.receiveTitle')} ${r.number}`" :submit-label="t('po.receiveSubmit')" @close="r.show = false" @submit="submitReceive">
    <label>{{ t('nav.warehouses') }}</label><select v-model="r.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <table style="margin-top:10px;font-size:13px"><thead><tr><th>{{ t('common.product') }}</th><th class="num">{{ t('po.colOrder') }}</th><th class="num">{{ t('po.colReceived') }}</th><th class="num">{{ t('po.colReceive') }}</th></tr></thead>
      <tbody>
        <tr v-for="it in r.items" :key="it.id">
          <td>{{ it.productName }} <span v-if="!Number(it.priceMinor)" class="zero-tag" :title="t('po.zeroPrice')">⚠ {{ t('po.zeroPrice') }}</span></td>
          <td class="num">{{ num(it.quantity) }}</td><td class="num">{{ num(it.receivedQty) }}</td>
          <td class="num"><input v-model.number="it.take" type="number" step="0.001" min="0" :max="remaining(it)" style="max-width:80px" /></td>
        </tr>
      </tbody>
    </table>
    <div v-if="hasZeroReceive" class="zero-warn">{{ t('po.zeroWarn') }}</div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const orders = ref<any[]>([]); const meta = ref<any>(null); const page = ref(1);
const suppliers = ref<any[]>([]); const warehouses = ref<any[]>([]); const products = ref<any[]>([]);
const canWrite = computed(() => auth.can('procurement.write'));
const canReceive = computed(() => auth.can('procurement.receive'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));

const c = reactive<any>({ show: false, supplierId: '', warehouseId: '', expectedAt: '', items: [] as any[] });
const r = reactive<any>({ show: false, id: '', number: '', warehouseId: '', items: [] as any[] });

const statusLabel = (s: string) => t(`st.${s}`) || s;
const statusCls = (s: string) => ({ draft: 'muted', sent: 'adjust', partially_received: 'adjust', received: 'in', cancelled: 'out' } as any)[s] || 'muted';
const remaining = (it: any) => Number(it.quantity) - Number(it.receivedQty);
const hasZeroCreate = computed(() => c.items.some((it: any) => it.productId && !Number(it.price)));
const hasZeroReceive = computed(() => r.items.some((it: any) => !Number(it.priceMinor)));

async function reload(p = 1) {
  page.value = p;
  const res = await auth.api(`/procurement/orders?page=${p}&pageSize=25`);
  orders.value = res.orders; meta.value = res.meta;
}
async function loadRefs() {
  const [s, w, pr] = await Promise.all([auth.api('/procurement/suppliers?pageSize=200'), auth.api('/warehouse/warehouses'), auth.api('/catalog/products?pageSize=200')]);
  suppliers.value = s.suppliers; warehouses.value = w.warehouses; products.value = pr.products;
}
function openCreate() { Object.assign(c, { show: true, supplierId: suppliers.value[0]?.id || '', warehouseId: warehouses.value[0]?.id || '', expectedAt: '', items: [{ productId: '', quantity: 1, price: 0 }] }); }
async function submitCreate() {
  try {
    const items = c.items.filter((i: any) => i.productId && i.quantity > 0).map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity), priceMinor: Math.round((Number(i.price) || 0) * 100) }));
    if (!items.length) { toast(t('so.qtyReq'), true); return; }
    if (hasZeroCreate.value && !confirm(t('po.zeroConfirm'))) return;
    await auth.api('/procurement/orders', { method: 'POST', body: { supplierId: c.supplierId, warehouseId: c.warehouseId || undefined, expectedAt: c.expectedAt || undefined, items } });
    c.show = false; toast(t('so.created')); await reload(1);
  } catch (e: any) { toast(e.message, true); }
}
async function act(id: string, action: string) {
  try { await auth.api(`/procurement/orders/${id}/${action}`, { method: 'POST' }); toast(t('ord.done')); await reload(page.value); }
  catch (e: any) { toast(e.message, true); }
}
async function openReceive(o: any) {
  const res = await auth.api(`/procurement/orders/${o.id}`);
  const items = res.order.items.filter((it: any) => Number(it.quantity) > Number(it.receivedQty)).map((it: any) => ({ ...it, take: Number(it.quantity) - Number(it.receivedQty) }));
  Object.assign(r, { show: true, id: o.id, number: o.number, warehouseId: o.warehouseId || warehouses.value[0]?.id || '', items });
}
async function submitReceive() {
  try {
    const items = r.items.filter((it: any) => it.take > 0).map((it: any) => ({ productId: it.productId, quantity: Number(it.take) }));
    if (!items.length) { toast(t('so.qtyReq'), true); return; }
    if (hasZeroReceive.value && !confirm(t('po.zeroConfirm'))) return;
    await auth.api(`/procurement/orders/${r.id}/receive`, { method: 'POST', body: { warehouseId: r.warehouseId, items } });
    r.show = false; toast(t('po.received2')); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => { await loadRefs(); await reload(1); });
</script>

<style scoped>
.row-line { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.row-line select { flex: 1; }
.zero-price { border-color: #f59e0b !important; background: #fffbeb; }
.zero-warn { margin-top: 10px; padding: 8px 12px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 13px; }
.zero-tag { display: inline-block; margin-left: 6px; font-size: 11px; color: #b45309; background: #fef3c7; border-radius: 6px; padding: 1px 6px; white-space: nowrap; }
</style>
