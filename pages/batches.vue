<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Партии и сроки годности</h2>
      <div class="toolbar">
        <label class="chk"><input v-model="expiringOnly" type="checkbox" @change="reload" /> скоро истекают</label>
        <button v-if="canMove" class="btn sm" @click="openReceive">+ Приём партии</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Партия</th><th>Товар</th><th>Склад</th><th>Годен до</th><th class="num">Кол-во</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>
          <tr v-for="b in batches" :key="b.id" :class="{ warn: isExpiring(b) }">
            <td>{{ b.batchNo }}</td><td>{{ b.productName }} <small class="muted">{{ b.productSku }}</small></td>
            <td>{{ whName(b.warehouseId) }}</td>
            <td>{{ b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('ru-RU') : '—' }}</td>
            <td class="num">{{ num(b.quantity) }}</td>
            <td>
              <span class="st-badge" :class="'st-' + batchState(b)">
                <svg v-if="batchState(b) === 'active'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>
                <svg v-else-if="batchState(b) === 'expiring'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                <svg v-else-if="batchState(b) === 'expired'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>
                {{ batchStateLabel(b) }}
              </span>
            </td>
            <td><button v-if="canMove && b.status === 'active' && Number(b.quantity) > 0" class="btn ghost sm" @click="openConsume(b)">Списать</button></td>
          </tr>
          <tr v-if="!batches.length"><td colspan="7" class="empty">Партий нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel" style="margin-top:16px">
    <div class="panel-head"><h2>Серийные номера</h2><div class="toolbar"><button v-if="canManage" class="btn sm" @click="openSerial">+ Серийный номер</button></div></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Серийный №</th><th>Товар</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>
          <tr v-for="s in serials" :key="s.id">
            <td>{{ s.serial }}</td><td>{{ s.productName }}</td>
            <td><span class="tag" :class="serCls(s.status)">{{ serLabel(s.status) }}</span></td>
            <td>
              <select v-if="canManage" :value="s.status" class="mini" @change="setSerial(s, ($event.target as HTMLSelectElement).value)">
                <option value="in_stock">На складе</option><option value="shipped">Отгружен</option><option value="returned">Возврат</option><option value="scrapped">Списан</option>
              </select>
            </td>
          </tr>
          <tr v-if="!serials.length"><td colspan="4" class="empty">Серийных номеров нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="r.show" title="Приём партии" submit-label="Принять" @close="r.show = false" @submit="submitReceive">
    <div class="row2">
      <div><label>Товар</label><select v-model="r.productId"><option value="">— товар —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select></div>
      <div><label>Склад</label><select v-model="r.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>№ партии</label><input v-model="r.batchNo" placeholder="напр. L-2026-07" /></div>
      <div><label>Годен до</label><input v-model="r.expiryDate" type="date" /></div>
    </div>
    <label>Количество</label><input v-model.number="r.quantity" type="number" step="0.001" min="0" />
  </Modal>

  <Modal v-if="cs.show" :title="`Списание партии ${cs.batchNo}`" submit-label="Списать" @close="cs.show = false" @submit="submitConsume">
    <div class="hint" style="text-align:left">В партии: {{ num(cs.available) }}</div>
    <label>Количество</label><input v-model.number="cs.quantity" type="number" step="0.001" min="0" :max="cs.available" />
    <label>Причина</label><input v-model="cs.reason" placeholder="напр. брак / продажа" />
  </Modal>

  <Modal v-if="sn.show" title="Новый серийный номер" submit-label="Зарегистрировать" @close="sn.show = false" @submit="submitSerial">
    <label>Товар</label><select v-model="sn.productId"><option value="">— товар —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    <label>Серийный номер</label><input v-model="sn.serial" placeholder="напр. SN-000123" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const batches = ref<any[]>([]); const serials = ref<any[]>([]); const warehouses = ref<any[]>([]); const products = ref<any[]>([]);
const expiringOnly = ref(false);
const canMove = computed(() => auth.can('warehouse.move'));
const canManage = computed(() => auth.can('warehouse.locations'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));

const r = reactive<any>({ show: false, productId: '', warehouseId: '', batchNo: '', expiryDate: '', quantity: 1 });
const cs = reactive<any>({ show: false, id: '', batchNo: '', available: 0, quantity: 0, reason: '' });
const sn = reactive<any>({ show: false, productId: '', serial: '' });

const whName = (id: string) => warehouses.value.find((w) => w.id === id)?.name || '—';
const statusLabel = (st: string) => ({ active: 'Активна', depleted: 'Израсходована', expired: 'Просрочена' } as any)[st] || st;
const serLabel = (st: string) => ({ in_stock: 'На складе', shipped: 'Отгружен', returned: 'Возврат', scrapped: 'Списан' } as any)[st] || st;
const serCls = (st: string) => ({ in_stock: 'in', shipped: 'adjust', returned: 'muted', scrapped: 'out' } as any)[st] || 'muted';
const isExpiring = (b: any) => b.expiryDate && b.status === 'active' && (new Date(b.expiryDate).getTime() - Date.now()) < 30 * 86400000;
// Derived visual state for the status icon: expired → depleted → expiring-soon → active.
function batchState(b: any) {
  if (b.status === 'expired' || (b.expiryDate && b.status === 'active' && new Date(b.expiryDate).getTime() < Date.now())) return 'expired';
  if (b.status === 'depleted' || Number(b.quantity) <= 0) return 'depleted';
  if (isExpiring(b)) return 'expiring';
  return 'active';
}
const batchStateLabel = (b: any) => ({ active: 'Активна', expiring: 'Скоро истекает', expired: 'Просрочена', depleted: 'Израсходована' } as any)[batchState(b)];

async function reload() {
  const url = expiringOnly.value ? '/inventory/batches/expiring?days=30' : '/inventory/batches';
  const [b, s] = await Promise.all([auth.api(url), auth.api('/inventory/serials')]);
  batches.value = b.batches; serials.value = s.serials;
}
// Auto batch number: L-YYYY-MM for the current month (editable).
function genBatchNo() { const d = new Date(); return `L-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function openReceive() { Object.assign(r, { show: true, productId: '', warehouseId: warehouses.value[0]?.id || '', batchNo: genBatchNo(), expiryDate: '', quantity: 1 }); }
async function submitReceive() {
  try {
    if (!r.productId) { toast('Выберите товар', true); return; }
    await auth.api('/inventory/batches/receive', { method: 'POST', body: { warehouseId: r.warehouseId, productId: r.productId, batchNo: r.batchNo, expiryDate: r.expiryDate || undefined, quantity: Number(r.quantity) } });
    r.show = false; toast('Партия принята на склад'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
function openConsume(b: any) { Object.assign(cs, { show: true, id: b.id, batchNo: b.batchNo, available: Number(b.quantity), quantity: Number(b.quantity), reason: '' }); }
async function submitConsume() {
  try {
    await auth.api(`/inventory/batches/${cs.id}/consume`, { method: 'POST', body: { quantity: Number(cs.quantity), reason: cs.reason || undefined } });
    cs.show = false; toast('Списано со склада'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
function openSerial() { Object.assign(sn, { show: true, productId: '', serial: '' }); }
async function submitSerial() {
  try {
    if (!sn.productId) { toast('Выберите товар', true); return; }
    await auth.api('/inventory/serials', { method: 'POST', body: { productId: sn.productId, serial: sn.serial } });
    sn.show = false; toast('Серийный номер зарегистрирован'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function setSerial(s: any, status: string) {
  try { await auth.api(`/inventory/serials/${s.id}`, { method: 'PATCH', body: { status } }); toast('Статус обновлён'); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  const [w, pr] = await Promise.all([auth.api('/warehouse/warehouses'), auth.api('/catalog/products?pageSize=200')]);
  warehouses.value = w.warehouses; products.value = pr.products;
  await reload();
});
</script>

<style scoped>
.chk { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--muted, #64748b); }
tr.warn td { background: rgba(220, 38, 38, .06); }
.mini { font-size: 12px; padding: 2px 4px; }
.st-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
.st-badge svg { width: 14px; height: 14px; flex-shrink: 0; }
.st-active { background: rgba(16, 185, 129, .12); color: #047857; }
.st-expiring { background: rgba(245, 158, 11, .16); color: #b45309; }
.st-expired { background: rgba(220, 38, 38, .12); color: #b91c1c; }
.st-depleted { background: rgba(100, 116, 139, .14); color: #475569; }
</style>
