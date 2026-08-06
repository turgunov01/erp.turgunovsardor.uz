<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Производственные заказы</h2>
      <div class="toolbar"><button v-if="canWrite" class="btn sm" @click="openCreate">+ Заказ</button></div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>№</th><th>Продукт</th><th class="num">План</th><th class="num">Готово</th><th>Статус</th><th>Склад</th><th>Действия</th></tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td><small>{{ o.number }}</small></td>
            <td>{{ o.product }}</td>
            <td class="num">{{ num(o.quantity) }}</td>
            <td class="num">{{ num(o.producedQty) }}</td>
            <td><span class="tag" :class="statusCls(o.status)">{{ statusLabel(o.status) }}</span></td>
            <td>{{ whName(o.warehouseId) }}</td>
            <td>
              <button v-if="o.status === 'draft' && canConfirm" class="btn sm" @click="act(o.id, 'confirm')">Подтвердить</button>
              <button v-if="o.status === 'confirmed' && canExec" class="btn sm" @click="openIssue(o)">Списать материалы</button>
              <button v-if="o.status === 'in_progress' && canExec" class="btn green sm" @click="openComplete(o)">Оприходовать</button>
              <button v-if="canWrite && ['draft','confirmed'].includes(o.status)" class="btn ghost sm" @click="act(o.id, 'cancel')">Отмена</button>
            </td>
          </tr>
          <tr v-if="!orders.length"><td colspan="7" class="empty">Заказов нет</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">Всего: {{ meta.total }} · стр. {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← Назад</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">Вперёд →</button>
    </div>
  </div>

  <!-- Create production order -->
  <Modal v-if="c.show" title="Новый производственный заказ" submit-label="Создать" @close="c.show = false" @submit="submitCreate">
    <label>Спецификация (BOM)</label>
    <select v-model="c.bomId"><option value="">— выберите —</option><option v-for="b in boms" :key="b.id" :value="b.id">{{ b.name }} → {{ b.productName }}</option></select>
    <div class="row2" style="margin-top:8px">
      <div><label>Количество к выпуску</label><input v-model.number="c.quantity" type="number" step="0.001" min="0" /></div>
      <div><label>Склад</label><select v-model="c.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
    </div>
    <label style="margin-top:8px">Плановая дата</label><input v-model="c.plannedAt" type="date" />
    <div v-if="selectedBom" class="hint" style="text-align:left;margin-top:8px">
      Потребность материалов на {{ num(c.quantity || 0) }} шт.:
      <ul style="margin:6px 0 0;padding-left:18px">
        <li v-for="it in selectedBom.items" :key="it.id">{{ it.productName }} — {{ num(perOrder(it.quantity)) }}</li>
      </ul>
    </div>
  </Modal>

  <!-- Issue materials -->
  <Modal v-if="s.show" :title="`Списание материалов — ${s.number}`" submit-label="Списать со склада" @close="s.show = false" @submit="submitIssue">
    <label>Склад</label><select v-model="s.warehouseId" @change="checkAvail"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <table style="margin-top:10px;font-size:13px"><thead><tr><th>Материал</th><th class="num">Нужно</th><th class="num">На складе</th><th class="num">Не хватает</th></tr></thead>
      <tbody>
        <tr v-for="l in s.lines" :key="l.productId" :class="{ short: Number(l.short) > 0 }">
          <td>{{ l.productName }}</td><td class="num">{{ num(l.need) }}</td><td class="num">{{ num(l.onHand) }}</td>
          <td class="num">{{ Number(l.short) > 0 ? num(l.short) : '—' }}</td>
        </tr>
      </tbody>
    </table>
    <div class="hint" style="text-align:left;margin-top:6px" :style="{ color: s.ok ? 'var(--ok,#16a34a)' : 'var(--danger,#dc2626)' }">
      {{ s.ok ? '✓ Материалов достаточно' : '✗ Недостаточно материалов на складе' }}
    </div>
  </Modal>

  <!-- Complete / receive finished goods -->
  <Modal v-if="r.show" :title="`Оприходование готовой продукции — ${r.number}`" submit-label="Оприходовать" @close="r.show = false" @submit="submitComplete">
    <div class="row2">
      <div><label>Склад приёмки</label><select v-model="r.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
      <div><label>Количество</label><input v-model.number="r.quantity" type="number" step="0.001" min="0" :max="r.remaining" /></div>
    </div>
    <div class="hint" style="text-align:left;margin-top:6px">Продукт: {{ r.product }} · осталось выпустить: {{ num(r.remaining) }}</div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const orders = ref<any[]>([]); const meta = ref<any>(null); const page = ref(1);
const boms = ref<any[]>([]); const warehouses = ref<any[]>([]);
const canWrite = computed(() => auth.can('production.write'));
const canConfirm = computed(() => auth.can('production.confirm'));
const canExec = computed(() => auth.can('production.execute'));

const c = reactive<any>({ show: false, bomId: '', quantity: 1, warehouseId: '', plannedAt: '' });
const s = reactive<any>({ show: false, id: '', number: '', warehouseId: '', lines: [] as any[], ok: false });
const r = reactive<any>({ show: false, id: '', number: '', product: '', warehouseId: '', quantity: 0, remaining: 0 });

const selectedBom = computed(() => boms.value.find((b) => b.id === c.bomId));
const perOrder = (compQty: number | string) => (Number(compQty) * (Number(c.quantity) || 0)) / (Number(selectedBom.value?.outputQty) || 1);
const whName = (id: string | null) => warehouses.value.find((w) => w.id === id)?.name || '—';
const statusLabel = (st: string) => ({ draft: 'Черновик', confirmed: 'Подтверждён', in_progress: 'В работе', done: 'Готов', cancelled: 'Отменён' } as any)[st] || st;
const statusCls = (st: string) => ({ draft: 'muted', confirmed: 'adjust', in_progress: 'adjust', done: 'in', cancelled: 'out' } as any)[st] || 'muted';

async function reload(p = 1) {
  page.value = p;
  const res = await auth.api(`/production/orders?page=${p}&pageSize=25`);
  orders.value = res.orders; meta.value = res.meta;
}
async function loadRefs() {
  const [b, w] = await Promise.all([auth.api('/production/boms?pageSize=200'), auth.api('/warehouse/warehouses')]);
  boms.value = b.boms; warehouses.value = w.warehouses;
}
function openCreate() { Object.assign(c, { show: true, bomId: boms.value[0]?.id || '', quantity: 1, warehouseId: warehouses.value[0]?.id || '', plannedAt: '' }); }
async function submitCreate() {
  try {
    if (!c.bomId) { toast('Выберите спецификацию', true); return; }
    if (!(Number(c.quantity) > 0)) { toast('Укажите количество', true); return; }
    await auth.api('/production/orders', { method: 'POST', body: { bomId: c.bomId, quantity: Number(c.quantity), warehouseId: c.warehouseId || undefined, plannedAt: c.plannedAt || undefined } });
    c.show = false; toast('Заказ создан'); await reload(1);
  } catch (e: any) { toast(e.message, true); }
}
async function act(id: string, action: string) {
  try { await auth.api(`/production/orders/${id}/${action}`, { method: 'POST' }); toast('Готово'); await reload(page.value); }
  catch (e: any) { toast(e.message, true); }
}
async function openIssue(o: any) {
  Object.assign(s, { show: true, id: o.id, number: o.number, warehouseId: o.warehouseId || warehouses.value[0]?.id || '', lines: [], ok: false });
  await checkAvail();
}
async function checkAvail() {
  try {
    const res = await auth.api(`/production/orders/${s.id}/availability?warehouseId=${s.warehouseId}`);
    s.lines = res.lines; s.ok = res.ok;
  } catch (e: any) { toast(e.message, true); }
}
async function submitIssue() {
  try {
    await auth.api(`/production/orders/${s.id}/issue`, { method: 'POST', body: { warehouseId: s.warehouseId } });
    s.show = false; toast('Материалы списаны в производство'); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
function openComplete(o: any) {
  const remaining = Number(o.quantity) - Number(o.producedQty);
  Object.assign(r, { show: true, id: o.id, number: o.number, product: o.product, warehouseId: o.warehouseId || warehouses.value[0]?.id || '', quantity: remaining, remaining });
}
async function submitComplete() {
  try {
    if (!(Number(r.quantity) > 0)) { toast('Укажите количество', true); return; }
    await auth.api(`/production/orders/${r.id}/complete`, { method: 'POST', body: { warehouseId: r.warehouseId, quantity: Number(r.quantity) } });
    r.show = false; toast('Готовая продукция оприходована'); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => { await loadRefs(); await reload(1); });
</script>

<style scoped>
tr.short td { color: var(--danger, #dc2626); }
</style>
