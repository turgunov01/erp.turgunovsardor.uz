<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ t('nav.quotations') }}</h2>
      <div class="toolbar"><button v-if="canWrite" class="btn sm" @click="openCreate">{{ t('quo.addBtn') }}</button></div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>{{ t('common.number') }}</th><th>{{ t('common.customer') }}</th><th>{{ t('ord.positions') }}</th><th class="num">{{ t('common.amount') }}</th><th>{{ t('common.status') }}</th><th>{{ t('ord.validUntil') }}</th><th>{{ t('common.actions') || '' }}</th></tr></thead>
        <tbody>
          <tr v-for="q in quotations" :key="q.id">
            <td><small>{{ q.number }}</small></td><td>{{ q.customer }}</td>
            <td>{{ q.items.map((i:any) => i.productName + ' ×' + num(i.quantity)).join(', ') }}</td>
            <td class="num">{{ money(q.totalMinor) }}</td>
            <td><span class="tag" :class="cls(q.status)">{{ label(q.status) }}</span></td>
            <td>{{ q.validUntil ? new Date(q.validUntil).toLocaleDateString('ru-RU') : '—' }}</td>
            <td>
              <button v-if="q.status === 'draft' && canWrite" class="btn ghost sm" @click="act(q.id, 'send')">{{ t('quo.send') }}</button>
              <template v-if="q.status === 'sent' && canWrite">
                <button class="btn green sm" @click="act(q.id, 'accept')">{{ t('quo.accept') }}</button>
                <button class="btn red sm" @click="act(q.id, 'reject')">{{ t('quo.reject') }}</button>
              </template>
              <button v-if="q.status === 'accepted' && canWrite" class="btn sm" @click="openConvert(q)">{{ t('quo.toOrder') }}</button>
            </td>
          </tr>
          <tr v-if="!quotations.length"><td colspan="7" class="empty">{{ t('quo.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">{{ t('common.total') }}: {{ meta.total }} · {{ t('common.page') }} {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← {{ t('common.back') }}</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">{{ t('common.next') }} →</button>
    </div>
  </div>

  <Modal v-if="c.show" half :title="t('quo.new')" :submit-label="t('common.create')" @close="c.show = false" @submit="submitCreate">
    <div class="row2">
      <div><label>{{ t('common.customer') }}</label><select v-model="c.customerId"><option v-for="cu in customers" :key="cu.id" :value="cu.id">{{ cu.name }}</option></select></div>
      <div><label>{{ t('ord.validUntil') }}</label><input v-model="c.validUntil" type="date" /></div>
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

  <Modal v-if="cv.show" :title="`${cv.number} ${t('quo.toOrder')}`" :submit-label="t('quo.convertSubmit')" @close="cv.show = false" @submit="submitConvert">
    <label>{{ t('ord.shipWh') }}</label><select v-model="cv.warehouseId"><option value="">{{ t('ord.pickLater') }}</option><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <label>{{ t('ord.expectedDate') }}</label><input v-model="cv.expectedAt" type="date" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const quotations = ref<any[]>([]); const meta = ref<any>(null); const page = ref(1);
const customers = ref<any[]>([]); const warehouses = ref<any[]>([]); const products = ref<any[]>([]); const priceLists = ref<any[]>([]);
const canWrite = computed(() => auth.can('sales.write'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));
const c = reactive<any>({ show: false, customerId: '', validUntil: '', items: [] as any[] });
const cv = reactive<any>({ show: false, id: '', number: '', warehouseId: '', expectedAt: '' });

const label = (s: string) => t(`st.${s}`) || s;
const cls = (s: string) => ({ draft: 'muted', sent: 'adjust', accepted: 'in', rejected: 'out', ordered: 'muted' } as any)[s] || 'muted';
const previewTotal = computed(() => c.items.reduce((s: number, it: any) => s + Math.round((Number(it.price) || 0) * 100 * (1 - (Number(it.discountPct) || 0) / 100)) * (Number(it.quantity) || 0), 0));

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
  const res = await auth.api(`/sales/quotations?page=${p}&pageSize=25`);
  quotations.value = res.quotations; meta.value = res.meta;
}
async function loadRefs() {
  const [cu, w, pr, pl] = await Promise.all([auth.api('/sales/customers?pageSize=200'), auth.api('/warehouse/warehouses'), auth.api('/catalog/products?pageSize=200'), auth.api('/sales/price-lists')]);
  customers.value = cu.customers; warehouses.value = w.warehouses; products.value = pr.products; priceLists.value = pl.priceLists;
}
function openCreate() { Object.assign(c, { show: true, customerId: customers.value[0]?.id || '', validUntil: '', items: [{ productId: '', quantity: 1, price: 0, discountPct: 0 }] }); }
async function submitCreate() {
  try {
    const items = c.items.filter((i: any) => i.productId && i.quantity > 0).map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity), priceMinor: Math.round((Number(i.price) || 0) * 100), discountPct: Number(i.discountPct) || 0 }));
    if (!items.length) { toast(t('ord.addItem'), true); return; }
    await auth.api('/sales/quotations', { method: 'POST', body: { customerId: c.customerId, validUntil: c.validUntil || undefined, items } });
    c.show = false; toast(t('quo.created')); await reload(1);
  } catch (e: any) { toast(e.message, true); }
}
async function act(id: string, action: string) {
  try { await auth.api(`/sales/quotations/${id}/${action}`, { method: 'POST' }); toast(t('ord.done')); await reload(page.value); }
  catch (e: any) { toast(e.message, true); }
}
function openConvert(q: any) { Object.assign(cv, { show: true, id: q.id, number: q.number, warehouseId: '', expectedAt: '' }); }
async function submitConvert() {
  try {
    const r = await auth.api(`/sales/quotations/${cv.id}/convert`, { method: 'POST', body: { warehouseId: cv.warehouseId || undefined, expectedAt: cv.expectedAt || undefined } });
    cv.show = false; toast(t('quo.orderCreated') + ' ' + r.salesOrder.number); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => { await loadRefs(); await reload(1); });
</script>

<style scoped>
.row-line { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.row-line select { flex: 1; }
</style>
