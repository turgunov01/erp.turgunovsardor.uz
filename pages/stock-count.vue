<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Инвентаризация</h2>
      <div class="toolbar"><button v-if="canCount" class="btn sm" @click="openCreate">+ Пересчёт</button></div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>№</th><th>Склад</th><th>Статус</th><th class="num">Позиций</th><th>Дата</th><th>Действия</th></tr></thead>
        <tbody>
          <tr v-for="c in counts" :key="c.id">
            <td><small>{{ c.number }}</small></td><td>{{ whName(c.warehouseId) }}</td>
            <td><span class="tag" :class="statusCls(c.status)">{{ statusLabel(c.status) }}</span></td>
            <td class="num">{{ c._count?.items ?? 0 }}</td>
            <td>{{ new Date(c.createdAt).toLocaleDateString('ru-RU') }}</td>
            <td class="nowrap">
              <button class="btn ghost sm" @click="openDetail(c.id)">{{ c.status === 'counting' ? 'Ввести' : 'Смотреть' }}</button>
              <button class="btn soft green sm" title="Скачать Excel" @click="downloadXlsx(c.id, c.number)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M4 19h16" /></svg>
                Excel
              </button>
            </td>
          </tr>
          <tr v-if="!counts.length"><td colspan="6" class="empty">Инвентаризаций нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="c.show" title="Новая инвентаризация" submit-label="Открыть пересчёт" @close="c.show = false" @submit="submitCreate">
    <label>Склад</label><select v-model="c.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <div class="hint" style="text-align:left;margin-top:8px">Будут зафиксированы текущие остатки склада как «системные». Введите фактические — расхождения спишутся/оприходуются при закрытии.</div>
  </Modal>

  <!-- Detail: enter counted quantities -->
  <Modal v-if="d.show" half :title="`Пересчёт ${d.number}`" :submit-label="d.status === 'counting' ? 'Закрыть и провести' : 'Закрыть'" @close="d.show = false" @submit="d.status === 'counting' ? complete() : (d.show = false)">
    <div class="count-scroll">
      <table style="font-size:13px"><thead><tr><th>Товар</th><th class="num">Система</th><th class="num">Факт</th><th class="num">Δ</th></tr></thead>
        <tbody>
          <tr v-for="it in d.items" :key="it.id">
            <td>{{ it.productName }} <small class="muted">{{ it.productSku }}</small></td>
            <td class="num">{{ num(it.systemQty) }}</td>
            <td class="num">
              <input v-if="d.status === 'counting'" v-model.number="it.counted" type="number" step="0.001" min="0" style="max-width:90px" />
              <span v-else>{{ it.countedQty == null ? '—' : num(it.countedQty) }}</span>
            </td>
            <td class="num" :class="varCls(it)">{{ varianceOf(it) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="toolbar" style="margin-top:8px">
      <button v-if="d.status === 'counting'" type="button" class="btn ghost sm" @click="saveCounts">Сохранить факт</button>
      <button type="button" class="btn soft green sm" @click="downloadXlsx(d.id, d.number)">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M4 19h16" /></svg>
        Скачать Excel
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const counts = ref<any[]>([]); const warehouses = ref<any[]>([]);
const canCount = computed(() => auth.can('warehouse.count'));

const c = reactive<any>({ show: false, warehouseId: '' });
const d = reactive<any>({ show: false, id: '', number: '', status: '', items: [] as any[] });

const whName = (id: string) => warehouses.value.find((w) => w.id === id)?.name || '—';
const statusLabel = (st: string) => ({ counting: 'Идёт', completed: 'Проведена', cancelled: 'Отменена' } as any)[st] || st;
const statusCls = (st: string) => ({ counting: 'adjust', completed: 'in', cancelled: 'out' } as any)[st] || 'muted';
const varianceOf = (it: any) => {
  const cv = d.status === 'counting' ? it.counted : it.countedQty;
  if (cv == null || cv === '') return '—';
  const v = Number(cv) - Number(it.systemQty);
  return v > 0 ? `+${num(v)}` : num(v);
};
const varCls = (it: any) => {
  const cv = d.status === 'counting' ? it.counted : it.countedQty;
  if (cv == null || cv === '') return '';
  const v = Number(cv) - Number(it.systemQty);
  return v > 0 ? 'pos' : v < 0 ? 'neg' : '';
};

async function downloadXlsx(id: string, number: string) {
  try {
    const base = useRuntimeConfig().public.apiBase as string;
    const blob = await $fetch<Blob>(`${base}/inventory/counts/${id}/export`, { headers: { Authorization: 'Bearer ' + auth.access }, responseType: 'blob' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${number || 'inventory'}.xlsx`; a.click(); URL.revokeObjectURL(url);
  } catch (e: any) { toast('Не удалось скачать', true); }
}
async function reload() { counts.value = (await auth.api('/inventory/counts')).counts; }
function openCreate() { Object.assign(c, { show: true, warehouseId: warehouses.value[0]?.id || '' }); }
async function submitCreate() {
  try { await auth.api('/inventory/counts', { method: 'POST', body: { warehouseId: c.warehouseId } }); c.show = false; toast('Пересчёт открыт'); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
async function openDetail(id: string) {
  const res = await auth.api(`/inventory/counts/${id}`);
  const items = res.count.items.map((it: any) => ({ ...it, counted: it.countedQty != null ? Number(it.countedQty) : Number(it.systemQty) }));
  Object.assign(d, { show: true, id, number: res.count.number, status: res.count.status, items });
}
async function saveCounts() {
  try {
    const items = d.items.filter((it: any) => it.counted != null && it.counted !== '').map((it: any) => ({ productId: it.productId, countedQty: Number(it.counted) }));
    await auth.api(`/inventory/counts/${d.id}/items`, { method: 'PATCH', body: { items } });
    toast('Факт сохранён');
  } catch (e: any) { toast(e.message, true); }
}
async function complete() {
  try {
    await saveCounts();
    const res = await auth.api(`/inventory/counts/${d.id}/complete`, { method: 'POST' });
    d.show = false; toast(`Проведено, корректировок: ${res.adjusted}`); await reload();
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => { warehouses.value = (await auth.api('/warehouse/warehouses')).warehouses; await reload(); });
</script>

<style scoped>
.count-scroll { max-height: 50vh; overflow-y: auto; }
.nowrap { white-space: nowrap; }
.nowrap .btn + .btn { margin-left: 6px; }
.pos { color: var(--ok, #16a34a); }
.neg { color: var(--danger, #dc2626); }
</style>
