<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Маршруты и ОТК</h2>
      <div class="toolbar">
        <select v-model="orderId" @change="loadRouting">
          <option value="">— выберите заказ —</option>
          <option v-for="o in orders" :key="o.id" :value="o.id">{{ o.number }} · {{ o.productName }} ({{ statusLabel(o.status) }})</option>
        </select>
      </div>
    </div>
    <div class="panel-body" v-if="routing">
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">План выпуска</div><div class="kpi-val">{{ Number(routing.order.quantity) }}</div></div>
        <div class="kpi"><div class="kpi-label">Выпущено</div><div class="kpi-val">{{ Number(routing.order.producedQty) }}</div></div>
        <div class="kpi"><div class="kpi-label">Брак</div><div class="kpi-val neg">{{ Number(routing.summary.scrapQty) }}</div></div>
        <div class="kpi"><div class="kpi-label">Трудозатраты (операции)</div><div class="kpi-val">{{ money(Number(routing.summary.laborCostMinor)) }}</div></div>
      </div>
    </div>
    <div class="panel-body" v-else><p class="muted">Выберите производственный заказ, чтобы увидеть маршрут и контроль качества.</p></div>
  </div>

  <template v-if="routing">
    <!-- Operations -->
    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Технологический маршрут</h3><button v-if="canWrite" class="btn ghost sm" @click="openOp">+ Операция</button></div>
      <div class="panel-body">
        <table v-if="routing.operations.length">
          <thead><tr><th>№</th><th>Операция</th><th>Рабочий центр</th><th class="num">План, мин</th><th class="num">Факт, мин</th><th class="num">Стоимость</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(op, i) in routing.operations" :key="op.id">
              <td>{{ i + 1 }}</td>
              <td>{{ op.name }}</td>
              <td>{{ op.workCenterName || '—' }}</td>
              <td class="num">{{ op.plannedMinutes }}</td>
              <td class="num">{{ op.actualMinutes ?? '—' }}</td>
              <td class="num">{{ money(Number(op.costMinor)) }}</td>
              <td><span class="tag" :class="op.status">{{ opStatusLabel(op.status) }}</span></td>
              <td class="row-actions">
                <button v-if="canExec && op.status === 'pending'" class="btn ghost sm" @click="startOp(op)">Начать</button>
                <button v-if="canExec && op.status === 'in_progress'" class="btn ghost sm" @click="completeOp(op)">Завершить</button>
                <button v-if="canWrite && op.status !== 'done'" class="btn ghost sm" @click="delOp(op)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted">Операций нет</div>
      </div>
    </div>

    <!-- Quality -->
    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Контроль качества (ОТК)</h3><button v-if="canExec" class="btn sm" @click="openQc">+ Проверка</button></div>
      <div class="panel-body">
        <table v-if="routing.quality.length">
          <thead><tr><th>Дата</th><th class="num">Проверено</th><th class="num">Годно</th><th class="num">Брак</th><th>Результат</th><th>Контролёр</th><th>Примечание</th></tr></thead>
          <tbody>
            <tr v-for="q in routing.quality" :key="q.id">
              <td>{{ fmtDate(q.createdAt) }}</td>
              <td class="num">{{ Number(q.checkedQty) }}</td>
              <td class="num">{{ Number(q.passedQty) }}</td>
              <td class="num neg">{{ Number(q.defectQty) }}</td>
              <td><span class="tag" :class="q.result">{{ qcResultLabel(q.result) }}</span></td>
              <td>{{ q.inspector || '—' }}</td>
              <td>{{ q.note || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted">Проверок не было</div>
      </div>
    </div>
  </template>

  <Modal v-if="op.show" title="Новая операция" submit-label="Добавить" @close="op.show = false" @submit="saveOp">
    <label>Название</label><input v-model="op.name" placeholder="Сварка корпуса" />
    <div class="row2">
      <div><label>Рабочий центр</label><select v-model="op.workCenterId"><option value="">—</option><option v-for="w in centers" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
      <div><label>Плановое время (мин)</label><input v-model.number="op.plannedMinutes" type="number" min="0" /></div>
    </div>
    <p v-if="opCostPreview" class="muted" style="margin-top:6px">Плановая стоимость: {{ money(opCostPreview) }}</p>
  </Modal>

  <Modal v-if="qc.show" title="Проверка ОТК" submit-label="Записать" @close="qc.show = false" @submit="saveQc">
    <div class="row2">
      <div><label>Проверено (шт)</label><input v-model.number="qc.checkedQty" type="number" min="0" /></div>
      <div><label>Брак (шт)</label><input v-model.number="qc.defectQty" type="number" min="0" /></div>
    </div>
    <label>Контролёр</label><input v-model="qc.inspector" />
    <label>Примечание</label><input v-model="qc.note" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const orders = ref<any[]>([]); const centers = ref<any[]>([]);
const orderId = ref(''); const routing = ref<any>(null);
const canWrite = computed(() => auth.can('production.write'));
const canExec = computed(() => auth.can('production.execute'));

const OSTATUS: Record<string, string> = { draft: 'Черновик', confirmed: 'Подтверждён', in_progress: 'В работе', done: 'Завершён', cancelled: 'Отменён' };
const OPSTATUS: Record<string, string> = { pending: 'Ожидает', in_progress: 'В работе', done: 'Готово', skipped: 'Пропущена' };
const QCR: Record<string, string> = { pass: 'Годен', fail: 'Брак', partial: 'Частично' };
function statusLabel(s: string) { return OSTATUS[s] || s; }
function opStatusLabel(s: string) { return OPSTATUS[s] || s; }
function qcResultLabel(s: string) { return QCR[s] || s; }

const op = reactive<any>({ show: false, name: '', workCenterId: '', plannedMinutes: 0 });
const qc = reactive<any>({ show: false, checkedQty: 0, defectQty: 0, inspector: '', note: '' });
const opCostPreview = computed(() => {
  const wc = centers.value.find((w) => w.id === op.workCenterId);
  if (!wc) return 0;
  return Math.round(Number(wc.hourlyCostMinor) * (Number(op.plannedMinutes) || 0) / 60);
});

async function loadOrders() { orders.value = (await auth.api('/production/orders?pageSize=100')).orders; }
async function loadRouting() {
  if (!orderId.value) { routing.value = null; return; }
  routing.value = await auth.api(`/production/orders/${orderId.value}/routing`);
}
function openOp() { Object.assign(op, { show: true, name: '', workCenterId: centers.value[0]?.id || '', plannedMinutes: 60 }); }
async function saveOp() {
  try { await auth.api(`/production/orders/${orderId.value}/operations`, { method: 'POST', body: { name: op.name, workCenterId: op.workCenterId || null, plannedMinutes: Number(op.plannedMinutes) || 0 } }); op.show = false; toast('Операция добавлена'); await loadRouting(); }
  catch (e: any) { toast(e.message, true); }
}
async function startOp(o: any) { try { await auth.api(`/production/operations/${o.id}/start`, { method: 'POST' }); await loadRouting(); } catch (e: any) { toast(e.message, true); } }
async function completeOp(o: any) {
  const actual = Number(prompt('Фактическое время, мин?', String(o.plannedMinutes)) || o.plannedMinutes);
  try { await auth.api(`/production/operations/${o.id}/complete`, { method: 'POST', body: { actualMinutes: actual } }); toast('Операция завершена'); await loadRouting(); }
  catch (e: any) { toast(e.message, true); }
}
async function delOp(o: any) { if (!confirm('Удалить операцию?')) return; try { await auth.api(`/production/operations/${o.id}`, { method: 'DELETE' }); await loadRouting(); } catch (e: any) { toast(e.message, true); } }
function openQc() { Object.assign(qc, { show: true, checkedQty: 0, defectQty: 0, inspector: '', note: '' }); }
async function saveQc() {
  try { await auth.api(`/production/orders/${orderId.value}/quality`, { method: 'POST', body: { checkedQty: Number(qc.checkedQty), defectQty: Number(qc.defectQty) || 0, inspector: qc.inspector || null, note: qc.note || null } }); qc.show = false; toast('Проверка записана'); await loadRouting(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  await loadOrders();
  centers.value = (await auth.api('/production/work-centers')).workCenters;
});
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.done, .tag.pass { background: #dcfce7; color: #166534; }
.tag.in_progress { background: #dbeafe; color: #1e40af; }
.tag.pending { background: #f1f5f9; color: #475569; }
.tag.fail { background: #fee2e2; color: #991b1b; }
.tag.partial { background: #fef9c3; color: #854d0e; }
.neg { color: var(--danger, #dc2626); }
.row-actions { display: flex; gap: 6px; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
