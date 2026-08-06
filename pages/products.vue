<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ t('nav.products') }}</h2>
      <div class="toolbar">
        <input v-model="scan" :placeholder="t('prod.scan')" style="max-width:150px" @keydown.enter="lookup" />
        <input v-model="search" :placeholder="t('prod.searchPh')" @keydown.enter="reload(1)" />
        <button v-if="canWrite" class="btn sm" @click="openAdd">{{ t('prod.addBtn') }}</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>SKU</th><th>{{ t('common.name') }}</th><th>{{ t('prod.category') }}</th><th>{{ t('prod.unit') }}</th><th>{{ t('prod.type') }}</th><th>{{ t('prod.tracking') }}</th><th>{{ t('prod.barcode') }}</th><th class="num">{{ t('common.price') }}</th></tr></thead>
        <tbody>
          <tr v-for="p in products" :key="p.id" :class="{ hl: p.id === highlightId }">
            <td><small>{{ p.sku }}</small></td><td>{{ p.name }}</td>
            <td>{{ p.category?.name || '—' }}</td><td>{{ p.unit?.code || '—' }}</td>
            <td><span class="tag muted">{{ p.type }}</span></td>
            <td>{{ trackLabel(p.tracking) }}</td>
            <td>
              <span v-if="p.barcode"><small>{{ p.barcode }}</small></span>
              <button v-else-if="canWrite" class="btn ghost sm" @click="genBarcode(p)">{{ t('prod.gen') }}</button>
              <span v-else class="muted">—</span>
            </td>
            <td class="num">{{ p.priceMinor == null ? '—' : money(p.priceMinor, p.currency) }}</td>
          </tr>
          <tr v-if="!products.length"><td colspan="8" class="empty">{{ t('prod.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">{{ t('common.total') }}: {{ meta.total }} · {{ t('common.page') }} {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← {{ t('common.back') }}</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">{{ t('common.next') }} →</button>
    </div>
  </div>

  <Modal v-if="add.show" :title="t('prod.new')" :submit-label="t('common.create')" @close="add.show = false" @submit="submitAdd">
    <label>SKU</label>
    <div class="sku-field">
      <input v-model="add.sku" :placeholder="t('prod.skuPh')" />
      <button type="button" class="sku-gen" :title="t('prod.genSku')" :disabled="skuGenerating" @click="generateSku">✨</button>
    </div>
    <label>{{ t('common.name') }}</label><input v-model="add.name" />
    <div class="row2">
      <div><label>{{ t('prod.category') }}</label><select v-model="add.categoryId"><option value="">—</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
      <div><label>{{ t('prod.party') }}</label><input v-model="add.party" :placeholder="t('prod.partyPh')" /></div>
    </div>
    <div class="row2">
      <div><label>{{ t('prod.unit') }}</label><select v-model="add.unitId"><option value="">—</option><option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option></select></div>
      <div><label>{{ t('prod.priceLabel') }}</label><input v-model.number="add.price" type="number" min="0" step="0.01" /></div>
    </div>
    <label>{{ t('prod.trackLabel') }}</label><select v-model="add.tracking"><option value="none">{{ t('prod.trackNone') }}</option><option value="batch">{{ t('prod.trackBatch') }}</option><option value="serial">{{ t('prod.trackSerial') }}</option></select>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const products = ref<any[]>([]); const meta = ref<any>(null); const units = ref<any[]>([]); const categories = ref<any[]>([]);
const search = ref(''); const page = ref(1);
const scan = ref(''); const highlightId = ref('');
const canWrite = computed(() => auth.can('catalog.write'));
const add = reactive({ show: false, sku: '', name: '', unitId: '', categoryId: '', party: '', price: 0, tracking: 'none' });
const skuGenerating = ref(false);
const trackLabel = (tr: string) => ({ none: '—', batch: t('prod.trackBatch'), serial: t('prod.trackSerial') } as any)[tr] || '—';

async function reload(p = page.value) {
  page.value = p;
  const q = `page=${p}&pageSize=25${search.value ? '&search=' + encodeURIComponent(search.value) : ''}`;
  const r = await auth.api('/catalog/products?' + q);
  products.value = r.products; meta.value = r.meta;
}
async function openAdd() {
  if (!units.value.length) { const [u, c] = await Promise.all([auth.api('/catalog/units'), auth.api('/catalog/categories')]); units.value = u.units; categories.value = c.categories; }
  Object.assign(add, { show: true, sku: '', name: '', unitId: '', categoryId: '', party: '', price: 0, tracking: 'none' });
}
// Auto-generate SKU from category code + party. Both are required — otherwise error.
async function generateSku() {
  if (!add.categoryId || !add.party.trim()) { toast(t('prod.skuNeedCatParty'), true); return; }
  skuGenerating.value = true;
  try {
    const r = await auth.api('/catalog/products/generate-sku', { method: 'POST', body: { categoryId: add.categoryId, party: add.party.trim() } });
    add.sku = r.sku; toast(t('prod.skuGenerated'));
  } catch (e: any) { toast(e.message, true); }
  finally { skuGenerating.value = false; }
}
async function submitAdd() {
  try {
    await auth.api('/catalog/products', { method: 'POST', body: { sku: add.sku.trim(), name: add.name.trim(), unitId: add.unitId || undefined, categoryId: add.categoryId || undefined, priceMinor: Math.round((Number(add.price) || 0) * 100), tracking: add.tracking } });
    add.show = false; toast(t('prod.created')); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function genBarcode(p: any) {
  try { const r = await auth.api(`/catalog/products/${p.id}/barcode`, { method: 'POST' }); p.barcode = r.product.barcode; toast(t('prod.barcodeGen')); }
  catch (e: any) { toast(e.message, true); }
}
async function lookup() {
  const code = scan.value.trim();
  if (!code) return;
  try {
    const r = await auth.api(`/catalog/products/by-barcode/${encodeURIComponent(code)}`);
    const found = products.value.find((x) => x.id === r.product.id);
    if (found) { highlightId.value = r.product.id; setTimeout(() => (highlightId.value = ''), 2500); }
    else { search.value = r.product.sku; await reload(1); highlightId.value = r.product.id; }
    toast(`${t('prod.found')}: ${r.product.name}`);
  } catch (e: any) { toast(e.message, true); }
  scan.value = '';
}
onMounted(() => reload(1));
</script>

<style scoped>
tr.hl td { background: rgba(37, 99, 235, .12); transition: background .3s; }
.sku-field { position: relative; display: block; }
.sku-field input { width: 100%; padding-right: 42px; box-sizing: border-box; }
.sku-gen {
  position: absolute; right: 5px; top: 50%; transform: translateY(-50%);
  border: none; background: transparent; cursor: pointer; font-size: 16px; line-height: 1;
  padding: 5px 7px; border-radius: 6px;
}
.sku-gen:hover { background: rgba(37, 99, 235, .14); }
.sku-gen:disabled { opacity: .45; cursor: default; }
</style>
