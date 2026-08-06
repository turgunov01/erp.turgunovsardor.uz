<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ t('nav.deals') }}</h2>
      <div class="toolbar"><button v-if="canWrite" class="btn sm" @click="openAdd()">{{ t('deal.addBtn') }}</button></div>
    </div>
    <div class="panel-body">
      <div class="board">
        <div v-for="col in columns" :key="col.stage" class="col" @dragover.prevent @drop="onDrop(col.stage)">
          <div class="col-head" :class="col.stage">
            <span>{{ stageLabel(col.stage) }}</span>
            <small>{{ col.count }} · {{ money(col.totalMinor) }}</small>
          </div>
          <div class="cards">
            <div v-for="d in col.items" :key="d.id" class="card" :draggable="canWrite" @dragstart="drag = d" @click="openEdit(d)">
              <strong>{{ d.title }}</strong>
              <div class="muted-line">{{ d.customer || t('deal.noCustomer') }}</div>
              <div class="card-foot">
                <span>{{ money(d.amountMinor) }}</span>
                <span class="prob">{{ d.probability }}%</span>
              </div>
              <div v-if="d.lostReason" class="lost">✕ {{ d.lostReason }}</div>
            </div>
            <div v-if="!col.items.length" class="empty-col">—</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Modal v-if="m.show" :title="m.id ? t('deal.one') : t('deal.new')" :submit-label="t('common.save')" @close="m.show = false" @submit="submit">
    <label>{{ t('common.name') }}</label><input v-model="m.title" />
    <div class="row2">
      <div><label>{{ t('common.customer') }}</label><select v-model="m.customerId"><option value="">— {{ t('deal.noCustomer') }} —</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
      <div><label>{{ t('deal.stage') }}</label><select v-model="m.stage"><option v-for="st in stages" :key="st" :value="st">{{ stageLabel(st) }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>{{ t('deal.amount') }}</label><input v-model.number="m.amount" type="number" min="0" /></div>
      <div><label>{{ t('deal.prob') }}</label><input v-model.number="m.probability" type="number" min="0" max="100" /></div>
    </div>
    <label>{{ t('deal.expected') }}</label><input v-model="m.expectedCloseAt" type="date" />
    <label>{{ t('common.note') }}</label><input v-model="m.note" />
    <label v-if="m.stage === 'lost'">{{ t('deal.lostReason') }}</label>
    <input v-if="m.stage === 'lost'" v-model="m.lostReason" :placeholder="t('deal.lostPh')" />
    <div v-if="m.id" style="margin-top:10px"><button type="button" class="btn red sm" @click="del">{{ t('deal.del') }}</button></div>
  </Modal>

  <Modal v-if="lost.show" :title="t('deal.lostReason')" :submit-label="t('deal.lostSubmit')" @close="cancelLost" @submit="confirmLost">
    <label>{{ t('deal.lostQ') }}</label><input v-model="lost.reason" :placeholder="t('deal.lostPh2')" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const columns = ref<any[]>([]); const customers = ref<any[]>([]);
const canWrite = computed(() => auth.can('crm.write'));
const stages = ['lead', 'qualified', 'proposal', 'won', 'lost'];
const drag = ref<any>(null);
const m = reactive<any>({ show: false, id: '', title: '', customerId: '', stage: 'lead', amount: 0, probability: 0, expectedCloseAt: '', note: '', lostReason: '' });
const lost = reactive<any>({ show: false, id: '', reason: '' });

const stageLabel = (s: string) => t(`stage.${s}`) || s;

async function load() {
  const [f, c] = await Promise.all([auth.api('/crm/funnel'), auth.api('/sales/customers?pageSize=200')]);
  columns.value = f.columns; customers.value = c.customers;
}
async function onDrop(stage: string) {
  if (!canWrite.value || !drag.value || drag.value.stage === stage) { drag.value = null; return; }
  const d = drag.value; drag.value = null;
  if (stage === 'lost') { Object.assign(lost, { show: true, id: d.id, reason: '' }); return; }
  await move(d.id, stage);
}
async function move(id: string, stage: string, lostReason?: string) {
  try { await auth.api(`/crm/deals/${id}/move`, { method: 'POST', body: { stage, lostReason } }); await load(); }
  catch (e: any) { toast(e.message, true); }
}
async function confirmLost() {
  if (!lost.reason) { toast(t('deal.reasonReq'), true); return; }
  await move(lost.id, 'lost', lost.reason); lost.show = false;
}
function cancelLost() { lost.show = false; }

function openAdd() { Object.assign(m, { show: true, id: '', title: '', customerId: '', stage: 'lead', amount: 0, probability: 0, expectedCloseAt: '', note: '', lostReason: '' }); }
function openEdit(d: any) {
  Object.assign(m, { show: true, id: d.id, title: d.title, customerId: d.customerId || '', stage: d.stage, amount: (d.amountMinor || 0) / 100, probability: d.probability, expectedCloseAt: d.expectedCloseAt ? d.expectedCloseAt.slice(0, 10) : '', note: d.note || '', lostReason: d.lostReason || '' });
}
async function submit() {
  if (!m.title) { toast('Укажите название', true); return; }
  if (m.stage === 'lost' && !m.lostReason) { toast('Укажите причину отказа', true); return; }
  try {
    const body: any = { title: m.title, customerId: m.customerId || undefined, amountMinor: Math.round((Number(m.amount) || 0) * 100), probability: Number(m.probability) || 0, note: m.note || undefined, expectedCloseAt: m.expectedCloseAt || undefined };
    if (m.id) {
      await auth.api(`/crm/deals/${m.id}`, { method: 'PATCH', body });
      await auth.api(`/crm/deals/${m.id}/move`, { method: 'POST', body: { stage: m.stage, lostReason: m.stage === 'lost' ? m.lostReason : undefined } });
    } else {
      await auth.api('/crm/deals', { method: 'POST', body: { ...body, stage: m.stage } });
    }
    m.show = false; toast('Сохранено'); await load();
  } catch (e: any) { toast(e.message, true); }
}
async function del() {
  try { await auth.api(`/crm/deals/${m.id}`, { method: 'DELETE' }); m.show = false; toast('Удалено'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>

<style scoped>
.board { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; }
.col { flex: 1; min-width: 200px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; }
.col-head { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 6px 8px; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
.col-head small { font-weight: 400; color: #64748b; }
.col-head.won { border-color: #16a34a; } .col-head.lost { border-color: #dc2626; }
.cards { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; min-height: 40px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.card:hover { border-color: #2563eb; }
.card strong { display: block; font-size: 13px; }
.muted-line { color: #94a3b8; font-size: 12px; margin: 2px 0 6px; }
.card-foot { display: flex; justify-content: space-between; font-size: 12px; }
.card-foot .prob { color: #2563eb; }
.lost { margin-top: 6px; font-size: 11px; color: #dc2626; }
.empty-col { text-align: center; color: #cbd5e1; padding: 8px; }
</style>
