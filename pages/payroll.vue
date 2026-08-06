<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Расчёт зарплаты</h2>
      <div class="toolbar">
        <button v-if="canPay" class="btn sm" @click="openCreate">+ Новый расчёт</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Период</th><th>Статус</th><th class="num">Сотрудников</th><th class="num">Начислено</th><th class="num">Налог</th><th class="num">К выплате</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in runs" :key="r.id" :class="{ sel: selected?.id === r.id }">
            <td>{{ r.periodCode }}</td>
            <td><span class="tag" :class="r.status">{{ statusLabel(r.status) }}</span></td>
            <td class="num">{{ r._count.items }}</td>
            <td class="num">{{ money(Number(r.totalGrossMinor)) }}</td>
            <td class="num">{{ money(Number(r.totalTaxMinor)) }}</td>
            <td class="num">{{ money(Number(r.totalNetMinor)) }}</td>
            <td><button class="btn ghost sm" @click="open(r)">Открыть</button></td>
          </tr>
          <tr v-if="!runs.length"><td colspan="7" class="empty">Расчётов нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-if="selected" class="panel" style="margin-top:16px">
    <div class="panel-head">
      <h2>Расчёт за {{ selected.periodCode }} · <span class="tag" :class="selected.status">{{ statusLabel(selected.status) }}</span></h2>
      <div class="toolbar">
        <button v-if="canPay && selected.status === 'draft'" class="btn ghost sm" @click="recompute">Пересчитать</button>
        <button v-if="canPay && selected.status === 'draft'" class="btn sm" @click="approve">Утвердить</button>
        <button v-if="canPay && selected.status === 'approved'" class="btn sm" @click="openPay">Выплатить</button>
        <button v-if="canPay && selected.status === 'draft'" class="btn ghost sm" @click="removeRun">Удалить</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Сотрудник</th><th class="num">Оклад</th><th class="num">Дней</th><th class="num">Премия</th><th class="num">Начислено</th><th class="num">Налог (12%)</th><th class="num">Удержания</th><th class="num">К выплате</th><th v-if="selected.status === 'draft'"></th></tr></thead>
        <tbody>
          <tr v-for="it in items" :key="it.id">
            <td>{{ it.employeeName }}</td>
            <td class="num">{{ money(Number(it.baseSalaryMinor)) }}</td>
            <td class="num">{{ it.workedDays }}/{{ it.normDays }}</td>
            <td class="num">{{ money(Number(it.accrualsMinor)) }}</td>
            <td class="num">{{ money(Number(it.grossMinor)) }}</td>
            <td class="num">{{ money(Number(it.taxMinor)) }}</td>
            <td class="num">{{ money(Number(it.deductionsMinor)) }}</td>
            <td class="num"><b>{{ money(Number(it.netMinor)) }}</b></td>
            <td v-if="selected.status === 'draft'"><button class="btn ghost sm" @click="openAdjust(it)">Правка</button></td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td><b>Итого</b></td><td colspan="3"></td>
            <td class="num"><b>{{ money(Number(selected.totalGrossMinor)) }}</b></td>
            <td class="num"><b>{{ money(Number(selected.totalTaxMinor)) }}</b></td>
            <td></td>
            <td class="num"><b>{{ money(Number(selected.totalNetMinor)) }}</b></td>
            <td v-if="selected.status === 'draft'"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <Modal v-if="c.show" title="Новый расчёт зарплаты" submit-label="Рассчитать" @close="c.show = false" @submit="create">
    <div class="row2">
      <div><label>Период</label><input v-model="c.periodCode" type="month" /></div>
      <div><label>Норма рабочих дней</label><input v-model.number="c.normDays" type="number" min="1" max="31" /></div>
    </div>
    <p class="muted" style="margin-top:8px">Будут рассчитаны все работающие сотрудники по окладу и табелю за период. Налог на доходы — 12%.</p>
  </Modal>

  <Modal v-if="a.show" title="Правка строки расчёта" submit-label="Сохранить" @close="a.show = false" @submit="saveAdjust">
    <p><b>{{ a.employeeName }}</b></p>
    <div class="row2">
      <div><label>Отработано дней</label><input v-model.number="a.workedDays" type="number" min="0" max="31" /></div>
      <div><label>Премия (сум)</label><input v-model.number="a.accrualsUzs" type="number" min="0" /></div>
    </div>
    <label>Удержания (сум)</label><input v-model.number="a.deductionsUzs" type="number" min="0" />
  </Modal>

  <Modal v-if="p.show" title="Выплата зарплаты" submit-label="Выплатить" @close="p.show = false" @submit="pay">
    <p>К выплате: <b>{{ money(Number(selected?.totalNetMinor)) }}</b></p>
    <template v-if="accounts.length">
      <label>Счёт списания</label>
      <select v-model="p.accountId"><option v-for="ac in accounts" :key="ac.id" :value="ac.id">{{ ac.name }} — {{ money(Number(ac.balanceMinor)) }}</option></select>
    </template>
    <p v-else class="muted">Модуль «Финансы» выключен — выплата будет отмечена без проводки по кассе.</p>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const runs = ref<any[]>([]); const selected = ref<any>(null); const items = ref<any[]>([]);
const accounts = ref<any[]>([]);
const canPay = computed(() => auth.can('hr.payroll'));
const financeOn = computed(() => auth.moduleOn('finance'));

const STATUS: Record<string, string> = { draft: 'Черновик', approved: 'Утверждён', paid: 'Выплачен' };
function statusLabel(s: string) { return STATUS[s] || s; }

const now = new Date();
const c = reactive<any>({ show: false, periodCode: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, normDays: 22 });
const a = reactive<any>({ show: false, id: '', employeeName: '', workedDays: 0, accrualsUzs: 0, deductionsUzs: 0 });
const p = reactive<any>({ show: false, accountId: '' });

async function reload() { runs.value = (await auth.api('/hr/payroll')).runs; }
async function open(r: any) {
  const d = await auth.api(`/hr/payroll/${r.id}`);
  selected.value = d.run; items.value = d.items;
}
function openCreate() { Object.assign(c, { show: true, periodCode: c.periodCode, normDays: 22 }); }
async function create() {
  try { const d = await auth.api('/hr/payroll', { method: 'POST', body: { periodCode: c.periodCode, normDays: c.normDays } }); c.show = false; toast('Рассчитано'); await reload(); await open(d.run); }
  catch (e: any) { toast(e.message, true); }
}
async function recompute() {
  try { await auth.api(`/hr/payroll/${selected.value.id}/recompute`, { method: 'POST' }); toast('Пересчитано'); await open(selected.value); }
  catch (e: any) { toast(e.message, true); }
}
function openAdjust(it: any) { Object.assign(a, { show: true, id: it.id, employeeName: it.employeeName, workedDays: it.workedDays, accrualsUzs: Number(it.accrualsMinor) / 100, deductionsUzs: Number(it.deductionsMinor) / 100 }); }
async function saveAdjust() {
  try {
    const r = await auth.api(`/hr/payroll/${selected.value.id}/items/${a.id}`, { method: 'PATCH', body: { workedDays: a.workedDays, accrualsMinor: Math.round((Number(a.accrualsUzs) || 0) * 100), deductionsMinor: Math.round((Number(a.deductionsUzs) || 0) * 100) } });
    a.show = false; toast('Сохранено'); selected.value = r.run; items.value = r.items; await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function approve() {
  if (!confirm('Утвердить расчёт? Будет создана проводка начисления зарплаты.')) return;
  try { const r = await auth.api(`/hr/payroll/${selected.value.id}/approve`, { method: 'POST' }); toast('Утверждено'); selected.value = r.run; await reload(); }
  catch (e: any) { toast(e.message, true); }
}
async function openPay() {
  if (financeOn.value) { accounts.value = (await auth.api('/finance/accounts')).accounts; p.accountId = accounts.value[0]?.id || ''; }
  else accounts.value = [];
  p.show = true;
}
async function pay() {
  try {
    const body: any = p.accountId ? { accountId: p.accountId } : {};
    const r = await auth.api(`/hr/payroll/${selected.value.id}/pay`, { method: 'POST', body });
    p.show = false; toast('Зарплата выплачена'); selected.value = r.run; await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function removeRun() {
  if (!confirm('Удалить черновик расчёта?')) return;
  try { await auth.api(`/hr/payroll/${selected.value.id}`, { method: 'DELETE' }); toast('Удалено'); selected.value = null; items.value = []; await reload(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(reload);
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.draft { background: #e2e8f0; color: #475569; }
.tag.approved { background: #dbeafe; color: #1e40af; }
.tag.paid { background: #dcfce7; color: #166534; }
tr.sel { background: #f8fafc; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
