<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Заявки на закупку</h2>
      <div class="toolbar"><button v-if="canWrite" class="btn sm" @click="openCreate">+ Заявка</button></div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>№</th><th>Позиции</th><th>Статус</th><th>Создана</th><th>Действия</th></tr></thead>
        <tbody>
          <tr v-for="q in requests" :key="q.id">
            <td><small>{{ q.number }}</small></td>
            <td>{{ q.items.map((i:any) => i.productName + ' ×' + num(i.quantity)).join(', ') }}</td>
            <td><span class="tag" :class="cls(q.status)">{{ label(q.status) }}</span></td>
            <td>{{ dt(q.createdAt) }}</td>
            <td>
              <template v-if="q.status === 'pending' && canApprove">
                <button class="btn green sm" @click="decide(q.id, 'approve')">Согласовать</button>
                <button class="btn red sm" @click="decide(q.id, 'reject')">Отклонить</button>
              </template>
              <button v-if="q.status === 'approved' && canWrite" class="btn sm" @click="openConvert(q)">→ Заказ</button>
            </td>
          </tr>
          <tr v-if="!requests.length"><td colspan="5" class="empty">Заявок нет</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">Всего: {{ meta.total }} · стр. {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← Назад</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">Вперёд →</button>
    </div>
  </div>

  <Modal v-if="c.show" title="Новая заявка на закупку" submit-label="Создать" @close="c.show = false" @submit="submitCreate">
    <label>Комментарий</label><input v-model="c.note" placeholder="напр. для цеха №2" />
    <label style="margin-top:8px">Позиции</label>
    <div v-for="(it, i) in c.items" :key="i" class="row-line">
      <select v-model="it.productId"><option value="">— товар —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
      <input v-model.number="it.quantity" type="number" step="0.001" min="0" placeholder="кол-во" style="max-width:100px" />
      <button type="button" class="btn ghost sm" @click="c.items.splice(i, 1)">✕</button>
    </div>
    <button type="button" class="btn ghost sm" @click="c.items.push({ productId: '', quantity: 1 })">+ строка</button>
  </Modal>

  <Modal v-if="cv.show" :title="`Заявка ${cv.number} → заказ`" submit-label="Создать заказ" @close="cv.show = false" @submit="submitConvert">
    <label>Поставщик</label><select v-model="cv.supplierId"><option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option></select>
    <label>Склад прихода</label><select v-model="cv.warehouseId"><option value="">— выбрать позже —</option><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <div class="hint" style="text-align:left;margin-top:8px">Цены можно задать в заказе после создания.</div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const requests = ref<any[]>([]); const meta = ref<any>(null); const page = ref(1);
const suppliers = ref<any[]>([]); const warehouses = ref<any[]>([]); const products = ref<any[]>([]);
const canWrite = computed(() => auth.can('procurement.write'));
const canApprove = computed(() => auth.can('procurement.approve'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));
const c = reactive<any>({ show: false, note: '', items: [] as any[] });
const cv = reactive<any>({ show: false, id: '', number: '', supplierId: '', warehouseId: '' });

const label = (s: string) => ({ pending: 'На согласовании', approved: 'Согласована', rejected: 'Отклонена', ordered: 'В заказе' } as any)[s] || s;
const cls = (s: string) => ({ pending: 'adjust', approved: 'in', rejected: 'out', ordered: 'muted' } as any)[s] || 'muted';

async function reload(p = 1) {
  page.value = p;
  const res = await auth.api(`/procurement/requests?page=${p}&pageSize=25`);
  requests.value = res.requests; meta.value = res.meta;
}
async function loadRefs() {
  const [s, w, pr] = await Promise.all([auth.api('/procurement/suppliers?pageSize=200'), auth.api('/warehouse/warehouses'), auth.api('/catalog/products?pageSize=200')]);
  suppliers.value = s.suppliers; warehouses.value = w.warehouses; products.value = pr.products;
}
function openCreate() { Object.assign(c, { show: true, note: '', items: [{ productId: '', quantity: 1 }] }); }
async function submitCreate() {
  try {
    const items = c.items.filter((i: any) => i.productId && i.quantity > 0).map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity) }));
    if (!items.length) { toast('Добавьте позицию', true); return; }
    await auth.api('/procurement/requests', { method: 'POST', body: { note: c.note || undefined, items } });
    c.show = false; toast('Заявка создана'); await reload(1);
  } catch (e: any) { toast(e.message, true); }
}
async function decide(id: string, action: string) {
  try { await auth.api(`/procurement/requests/${id}/${action}`, { method: 'POST' }); toast(action === 'approve' ? 'Согласовано' : 'Отклонено'); await reload(page.value); }
  catch (e: any) { toast(e.message, true); }
}
function openConvert(q: any) { Object.assign(cv, { show: true, id: q.id, number: q.number, supplierId: suppliers.value[0]?.id || '', warehouseId: '' }); }
async function submitConvert() {
  try {
    const r = await auth.api(`/procurement/requests/${cv.id}/convert`, { method: 'POST', body: { supplierId: cv.supplierId, warehouseId: cv.warehouseId || undefined } });
    cv.show = false; toast('Создан заказ ' + r.purchaseOrder.number); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => { await loadRefs(); await reload(1); });
</script>

<style scoped>
.row-line { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.row-line select { flex: 1; }
</style>
