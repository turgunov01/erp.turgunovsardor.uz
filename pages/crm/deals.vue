<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Список сделок</h2>
      <div class="toolbar">
        <input v-model="search" placeholder="Поиск по названию или клиенту…" />
        <select v-model="stageFilter">
          <option value="">Все этапы</option>
          <option v-for="st in stages" :key="st" :value="st">{{ stageLabel(st) }}</option>
        </select>
        <button v-if="canWrite" class="btn sm" @click="openAdd()">+ Новая сделка</button>
      </div>
    </div>
    <div class="panel-body">
      <p class="hint">ℹ️ Это все ваши сделки в виде таблицы. Нажмите «Изменить», чтобы поправить сделку, или «+ Новая сделка», чтобы добавить.</p>
      <table>
        <thead><tr><th>Название</th><th>Клиент</th><th>Этап</th><th class="num">Сумма</th><th class="num">Шанс</th><th>Ожид. закрытие</th><th></th></tr></thead>
        <tbody>
          <tr v-for="d in filtered" :key="d.id">
            <td><strong>{{ d.title }}</strong></td>
            <td>{{ d.customer || '—' }}</td>
            <td><span class="badge" :class="d.stage">{{ stageLabel(d.stage) }}</span><small v-if="d.lostReason" class="lost"> · {{ d.lostReason }}</small></td>
            <td class="num">{{ money(d.amountMinor) }}</td>
            <td class="num">{{ d.probability }}%</td>
            <td>{{ d.expectedCloseAt ? d.expectedCloseAt.slice(0, 10) : '—' }}</td>
            <td class="row-actions"><button v-if="canWrite" class="btn ghost sm" @click="openEdit(d)">Изменить</button></td>
          </tr>
          <tr v-if="!filtered.length"><td colspan="7" class="empty">Сделок нет. Нажмите «+ Новая сделка», чтобы добавить первую.</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="m.show" :title="m.id ? 'Изменить сделку' : 'Новая сделка'" submit-label="Сохранить" @close="m.show = false" @submit="submit">
    <label>Название сделки</label>
    <input v-model="m.title" placeholder="Например: Поставка кабинета клиенту" />
    <div class="row2">
      <div>
        <label>Клиент</label>
        <select v-model="m.customerId"><option value="">— без клиента —</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option></select>
      </div>
      <div>
        <label>Этап</label>
        <select v-model="m.stage"><option v-for="st in stages" :key="st" :value="st">{{ stageLabel(st) }}</option></select>
      </div>
    </div>
    <div class="row2">
      <div><label>Сумма (сум)</label><input v-model.number="m.amount" type="number" min="0" /></div>
      <div><label>Шанс на успех, %</label><input v-model.number="m.probability" type="number" min="0" max="100" /></div>
    </div>
    <label>Когда планируете закрыть</label><input v-model="m.expectedCloseAt" type="date" />
    <label>Заметка</label><input v-model="m.note" />
    <template v-if="m.stage === 'lost'">
      <label>Причина отказа</label>
      <input v-model="m.lostReason" placeholder="Почему клиент отказался?" />
    </template>
    <div v-if="m.id" style="margin-top:12px"><button type="button" class="btn red sm" @click="del">Удалить сделку</button></div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const deals = ref<any[]>([]); const customers = ref<any[]>([]);
const search = ref(''); const stageFilter = ref('');
const canWrite = computed(() => auth.can('crm.write'));
const stages = ['lead', 'qualified', 'proposal', 'won', 'lost'];
const stageLabel = (s: string) => t(`stage.${s}`) || s;
const m = reactive<any>({ show: false, id: '', title: '', customerId: '', stage: 'lead', amount: 0, probability: 0, expectedCloseAt: '', note: '', lostReason: '' });

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return deals.value.filter((d) =>
    (!stageFilter.value || d.stage === stageFilter.value) &&
    (!q || (d.title || '').toLowerCase().includes(q) || (d.customer || '').toLowerCase().includes(q)));
});

async function load() {
  const [d, c] = await Promise.all([auth.api('/crm/deals'), auth.api('/sales/customers?pageSize=200')]);
  deals.value = d.deals; customers.value = c.customers;
}
function openAdd() { Object.assign(m, { show: true, id: '', title: '', customerId: '', stage: 'lead', amount: 0, probability: 0, expectedCloseAt: '', note: '', lostReason: '' }); }
function openEdit(d: any) {
  Object.assign(m, { show: true, id: d.id, title: d.title, customerId: d.customerId || '', stage: d.stage, amount: (d.amountMinor || 0) / 100, probability: d.probability, expectedCloseAt: d.expectedCloseAt ? d.expectedCloseAt.slice(0, 10) : '', note: d.note || '', lostReason: d.lostReason || '' });
}
async function submit() {
  if (!m.title) { toast('Укажите название сделки', true); return; }
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
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 10px 14px; margin: 0 0 14px; font-size: 14px; }
.row-actions { text-align: right; }
.badge { display: inline-block; padding: 2px 9px; border-radius: 10px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569; }
.badge.lead { background: #fef3c7; color: #92400e; }
.badge.qualified { background: #dbeafe; color: #1e40af; }
.badge.proposal { background: #e0e7ff; color: #3730a3; }
.badge.won { background: #dcfce7; color: #166534; }
.badge.lost { background: #fee2e2; color: #991b1b; }
.lost { color: #dc2626; }
</style>
