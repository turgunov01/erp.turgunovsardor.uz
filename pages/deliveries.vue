<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Рейсы и доставка</h2>
      <div class="toolbar">
        <select v-model="status" @change="reload"><option value="">Все</option><option v-for="s in STATUSES" :key="s" :value="s">{{ statusLabel(s) }}</option></select>
        <button v-if="canWrite" class="btn sm" @click="openCreate">+ Рейс</button>
      </div>
    </div>

    <div v-if="sum" class="kpis" style="margin:0 0 12px">
      <div class="kpi"><div class="kpi-label">Транспорт</div><div class="kpi-val">{{ sum.vehicles }}</div><div class="kpi-sub">свободно {{ sum.availableVehicles }}</div></div>
      <div class="kpi"><div class="kpi-label">Запланировано</div><div class="kpi-val">{{ sum.planned }}</div></div>
      <div class="kpi"><div class="kpi-label">В пути</div><div class="kpi-val">{{ sum.inTransit }}</div></div>
      <div class="kpi"><div class="kpi-label">Доставлено</div><div class="kpi-val">{{ sum.delivered }}</div></div>
    </div>

    <div class="panel-body">
      <table>
        <thead><tr><th>№</th><th>ТС</th><th>Водитель</th><th>Дата</th><th class="num">Точек</th><th class="num">Стоимость</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="d in deliveries" :key="d.id">
            <td><small class="muted">{{ d.number }}</small></td>
            <td>{{ d.vehiclePlate || '—' }}</td>
            <td>{{ d.driverName || '—' }}</td>
            <td>{{ d.scheduledDate ? fmtDate(d.scheduledDate) : '—' }}</td>
            <td class="num">{{ d._count.stops }}</td>
            <td class="num">{{ money(Number(d.costMinor)) }}</td>
            <td><span class="tag" :class="d.status">{{ statusLabel(d.status) }}</span></td>
            <td><button class="btn ghost sm" @click="openDetail(d)">Открыть</button></td>
          </tr>
          <tr v-if="!deliveries.length"><td colspan="8" class="empty">Рейсов нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Create -->
  <Modal v-if="c.show" title="Новый рейс" submit-label="Создать" wide @close="c.show = false" @submit="create">
    <div class="row2">
      <div><label>Транспорт</label><select v-model="c.vehicleId"><option value="">—</option><option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.plate }} ({{ v.model }})</option></select></div>
      <div><label>Водитель</label><select v-model="c.driverId"><option value="">—</option><option v-for="dr in drivers" :key="dr.id" :value="dr.id">{{ dr.fullName }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>Дата</label><input v-model="c.scheduledDate" type="date" /></div>
      <div><label>Стоимость рейса (сум)</label><input v-model.number="c.costUzs" type="number" min="0" /></div>
    </div>
    <label>Точки маршрута</label>
    <div v-for="(s, i) in c.stops" :key="i" class="stop-row">
      <input v-model="s.address" placeholder="Адрес" />
      <input v-model="s.customerName" placeholder="Клиент" style="max-width:160px" />
      <button class="x" @click="c.stops.splice(i, 1)">✕</button>
    </div>
    <button class="btn ghost sm" @click="c.stops.push({ address: '', customerName: '' })">+ Точка</button>
  </Modal>

  <!-- Detail -->
  <Modal v-if="d.show" :title="`Рейс ${d.delivery?.number}`" submit-label="Закрыть" wide @close="d.show = false" @submit="d.show = false">
    <div v-if="d.delivery">
      <div class="row2">
        <div><label>Статус</label><div><span class="tag" :class="d.delivery.status">{{ statusLabel(d.delivery.status) }}</span></div></div>
        <div><label>ТС / водитель</label><div>{{ d.delivery.vehiclePlate || '—' }} · {{ d.delivery.driverName || '—' }}</div></div>
      </div>
      <div class="toolbar" style="margin:10px 0" v-if="canWrite">
        <button v-if="d.delivery.status === 'planned'" class="btn sm" @click="act('dispatch')">Отправить в рейс</button>
        <button v-if="d.delivery.status === 'in_transit'" class="btn sm" @click="act('complete')">Завершить рейс</button>
        <button v-if="d.delivery.status === 'planned' || d.delivery.status === 'in_transit'" class="btn ghost sm" @click="act('cancel')">Отменить</button>
      </div>
      <h4 style="margin:12px 0 6px">Маршрут ({{ d.stops.length }})</h4>
      <table v-if="d.stops.length">
        <thead><tr><th>№</th><th>Адрес</th><th>Клиент</th><th>Заказ</th><th>Статус</th><th v-if="canWrite"></th></tr></thead>
        <tbody>
          <tr v-for="(s, i) in d.stops" :key="s.id">
            <td>{{ i + 1 }}</td>
            <td>{{ s.address }}</td>
            <td>{{ s.customerName || '—' }}</td>
            <td><small class="muted">{{ s.salesRef || '—' }}</small></td>
            <td><span class="tag" :class="s.status">{{ stopStatusLabel(s.status) }}</span></td>
            <td v-if="canWrite">
              <select :value="s.status" class="mini" @change="setStop(s, ($event.target as HTMLSelectElement).value)">
                <option value="pending">Ожидает</option><option value="arrived">Прибыл</option><option value="completed">Доставлено</option><option value="failed">Не доставлено</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="muted">Точек нет</div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const deliveries = ref<any[]>([]); const vehicles = ref<any[]>([]); const drivers = ref<any[]>([]); const sum = ref<any>(null);
const status = ref('');
const canWrite = computed(() => auth.can('logistics.write'));

const STATUSES = ['planned', 'in_transit', 'delivered', 'cancelled'];
const STATUS: Record<string, string> = { planned: 'Запланирован', in_transit: 'В пути', delivered: 'Доставлен', cancelled: 'Отменён' };
const STOP: Record<string, string> = { pending: 'Ожидает', arrived: 'Прибыл', completed: 'Доставлено', failed: 'Не доставлено' };
function statusLabel(s: string) { return STATUS[s] || s; }
function stopStatusLabel(s: string) { return STOP[s] || s; }

const c = reactive<any>({ show: false, vehicleId: '', driverId: '', scheduledDate: '', costUzs: 0, stops: [] as any[] });
const d = reactive<any>({ show: false, delivery: null, stops: [] });

async function reload() {
  const qs = status.value ? `?status=${status.value}` : '';
  deliveries.value = (await auth.api(`/logistics/deliveries${qs}`)).deliveries;
  sum.value = await auth.api('/logistics/summary');
}
function openCreate() { Object.assign(c, { show: true, vehicleId: '', driverId: '', scheduledDate: '', costUzs: 0, stops: [{ address: '', customerName: '' }] }); }
async function create() {
  try {
    const stops = c.stops.filter((s: any) => s.address.trim()).map((s: any) => ({ address: s.address, customerName: s.customerName || null }));
    const body: any = { vehicleId: c.vehicleId || null, driverId: c.driverId || null, costMinor: Math.round((Number(c.costUzs) || 0) * 100), stops, ...(c.scheduledDate ? { scheduledDate: c.scheduledDate } : {}) };
    await auth.api('/logistics/deliveries', { method: 'POST', body });
    c.show = false; toast('Рейс создан'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function openDetail(x: any) {
  const r = await auth.api(`/logistics/deliveries/${x.id}`);
  Object.assign(d, { show: true, delivery: r.delivery, stops: r.stops });
}
async function act(action: string) {
  try { const r = await auth.api(`/logistics/deliveries/${d.delivery.id}/${action}`, { method: 'POST' }); d.delivery = r.delivery; toast('Готово'); await reload(); if (action !== 'cancel') { const rr = await auth.api(`/logistics/deliveries/${d.delivery.id}`); d.stops = rr.stops; } }
  catch (e: any) { toast(e.message, true); }
}
async function setStop(s: any, st: string) {
  try { await auth.api(`/logistics/stops/${s.id}`, { method: 'PATCH', body: { status: st } }); const rr = await auth.api(`/logistics/deliveries/${d.delivery.id}`); d.stops = rr.stops; }
  catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  try { const meta = await auth.api('/logistics/meta'); vehicles.value = meta.vehicles; drivers.value = meta.drivers; } catch {}
  await reload();
});
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.planned { background: #e2e8f0; color: #475569; }
.tag.in_transit, .tag.arrived { background: #dbeafe; color: #1e40af; }
.tag.delivered, .tag.completed { background: #dcfce7; color: #166534; }
.tag.cancelled, .tag.failed { background: #fee2e2; color: #991b1b; }
.tag.pending { background: #f1f5f9; color: #475569; }
.stop-row { display: flex; gap: 6px; margin: 6px 0; align-items: center; }
.stop-row input { flex: 1; }
.x { background: none; border: none; color: #94a3b8; cursor: pointer; }
.x:hover { color: #dc2626; }
.mini { font-size: 12px; padding: 2px 4px; }
.kpi-sub { font-size: 12px; color: var(--muted, #64748b); }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
