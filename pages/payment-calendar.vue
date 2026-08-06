<template>
  <div>
    <div class="panel">
      <div class="panel-head"><h2>Платёжный календарь</h2></div>
      <div class="panel-body">
        <div class="fc-cards">
          <div class="vcard"><div class="vlabel">Остаток сейчас</div><div class="vval">{{ money(Number(fc.openingMinor)) }}</div></div>
          <div class="vcard"><div class="vlabel">Прогноз через {{ fc.horizonDays }} дн.</div><div class="vval" :class="Number(fc.projectedMinor) >= 0 ? 'pos' : 'neg'">{{ money(Number(fc.projectedMinor)) }}</div></div>
          <div class="vcard" v-if="fc.overdueCount"><div class="vlabel">Просрочено</div><div class="vval neg">{{ fc.overdueCount }} · {{ money(Number(fc.overdueMinor)) }}</div></div>
        </div>
        <table v-if="fc.rows?.length" class="fc">
          <thead><tr><th>Дата</th><th class="num">Поступления</th><th class="num">Списания</th><th class="num">Прогноз остатка</th></tr></thead>
          <tbody>
            <tr v-for="r in fc.rows" :key="r.date">
              <td>{{ r.date }}</td>
              <td class="num pos">{{ Number(r.inMinor) ? money(Number(r.inMinor)) : '' }}</td>
              <td class="num neg">{{ Number(r.outMinor) ? money(Number(r.outMinor)) : '' }}</td>
              <td class="num"><b>{{ money(Number(r.runningMinor)) }}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Запланированные платежи</h2></div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Срок</th><th>Назначение</th><th>Контрагент</th><th class="num">Сумма</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            <tr v-for="i in items" :key="i.id" :class="{ overdue: isOverdue(i) }">
              <td>{{ fmtDate(i.dueDate) }}</td>
              <td><span class="dir" :class="i.direction">{{ i.direction === 'in' ? '▲' : '▼' }}</span> {{ i.title }}</td>
              <td>{{ i.counterparty || '—' }}</td>
              <td class="num" :class="i.direction === 'in' ? 'pos' : 'neg'">{{ money(Number(i.amountMinor)) }}</td>
              <td><span class="tag" :class="i.status === 'paid' ? 'in' : i.status === 'cancelled' ? 'muted' : 'out'">{{ statusLabel(i.status) }}</span></td>
              <td class="num">
                <template v-if="i.status === 'planned' && canManage">
                  <button class="btn sm" @click="pay(i)">Оплатить</button>
                  <button class="link-btn" @click="cancel(i)">✕</button>
                </template>
              </td>
            </tr>
            <tr v-if="!items.length"><td colspan="6" class="muted">Нет запланированных платежей</td></tr>
          </tbody>
        </table>

        <div v-if="canManage" class="addrow">
          <select v-model="form.direction"><option value="out">Списание</option><option value="in">Поступление</option></select>
          <input v-model="form.title" placeholder="Назначение" />
          <input v-model="form.counterparty" placeholder="Контрагент" />
          <select v-model="form.category">
            <option value="purchase">Поставщику</option><option value="salary">Зарплата</option><option value="rent">Аренда</option>
            <option value="vat">НДС</option><option value="tax">Налоги</option><option value="utility">Коммуналка</option>
            <option value="sale">От клиента</option><option value="other">Прочее</option>
          </select>
          <input v-model.number="form.amount" type="number" min="0" placeholder="Сумма, сум" />
          <input v-model="form.dueDate" type="date" />
          <button class="btn sm" :disabled="!form.title || !form.amount || !form.dueDate" @click="add">Добавить</button>
        </div>
        <div v-if="err" class="neg" style="margin-top:8px">{{ err }}</div>
      </div>
    </div>

    <!-- Pay modal -->
    <div v-if="paying" class="modal-back" @click.self="paying = null">
      <div class="modal">
        <h3>Оплата: {{ paying.title }}</h3>
        <p class="muted">{{ money(Number(paying.amountMinor)) }} · {{ paying.direction === 'in' ? 'поступление' : 'списание' }}</p>
        <label>Счёт</label>
        <select v-model="payAccountId">
          <option value="" disabled>Выберите счёт…</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }} — {{ money(Number(a.balanceMinor)) }}</option>
        </select>
        <div v-if="payErr" class="neg" style="margin-top:8px">{{ payErr }}</div>
        <div class="modal-actions">
          <button class="btn ghost sm" @click="paying = null">Отмена</button>
          <button class="btn sm" :disabled="!payAccountId || payBusy" @click="confirmPay">Провести</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const canManage = computed(() => auth.can('finance.write'));

const items = ref<any[]>([]);
const fc = ref<any>({ openingMinor: 0, projectedMinor: 0, horizonDays: 60, rows: [], overdueCount: 0, overdueMinor: 0 });
const accounts = ref<any[]>([]);
const today = new Date().toISOString().slice(0, 10);
const form = ref<any>({ direction: 'out', title: '', counterparty: '', category: 'purchase', amount: null, dueDate: today });
const err = ref('');
const paying = ref<any>(null); const payAccountId = ref(''); const payErr = ref(''); const payBusy = ref(false);

const statusLabel = (s: string) => ({ planned: 'Запланирован', paid: 'Оплачен', cancelled: 'Отменён' } as any)[s] || s;
const isOverdue = (i: any) => i.status === 'planned' && new Date(i.dueDate) < new Date();

async function load() {
  const [list, forecast, acc] = await Promise.all([
    auth.api<any>('/finance/payment-schedule'),
    auth.api<any>('/finance/reports/cash-forecast?days=60'),
    auth.api<any>('/finance/accounts'),
  ]);
  items.value = list.items; fc.value = forecast; accounts.value = acc.accounts;
}
async function add() {
  err.value = '';
  try {
    await auth.api('/finance/payment-schedule', { method: 'POST', body: {
      direction: form.value.direction, title: form.value.title, counterparty: form.value.counterparty || undefined,
      category: form.value.category, amountMinor: Math.round((form.value.amount || 0) * 100), dueDate: form.value.dueDate,
    } });
    form.value = { direction: 'out', title: '', counterparty: '', category: 'purchase', amount: null, dueDate: today };
    toast('Платёж добавлен'); await load();
  } catch (e: any) { err.value = e.message; }
}
async function cancel(i: any) {
  await auth.api(`/finance/payment-schedule/${i.id}`, { method: 'DELETE' });
  toast('Платёж удалён'); await load();
}
function pay(i: any) { paying.value = i; payAccountId.value = i.accountId || (accounts.value[0]?.id ?? ''); payErr.value = ''; }
async function confirmPay() {
  payBusy.value = true; payErr.value = '';
  try {
    await auth.api(`/finance/payment-schedule/${paying.value.id}/pay`, { method: 'POST', body: { accountId: payAccountId.value } });
    toast('Платёж проведён'); paying.value = null; await load();
  } catch (e: any) { payErr.value = e.message; } finally { payBusy.value = false; }
}
onMounted(load);
</script>

<style scoped>
.fc-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 16px; }
.vcard { border: 1px solid var(--line); border-radius: 12px; padding: 14px; background: #fff; }
.vlabel { color: var(--muted); font-size: 13px; } .vval { font-size: 20px; font-weight: 700; margin-top: 4px; }
table.fc { margin-top: 4px; }
.addrow { margin-top: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.addrow input, .addrow select { height: 36px; }
.dir.in { color: #16a34a; } .dir.out { color: #dc2626; }
tr.overdue td { background: #fef2f2; }
.link-btn { background: none; border: none; color: #dc2626; cursor: pointer; margin-left: 6px; }
.pos { color: #16a34a; } .neg { color: #dc2626; }
.modal-back { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; z-index: 50; }
.modal { background: #fff; border-radius: 14px; padding: 22px; width: 380px; max-width: 92vw; }
.modal h3 { margin: 0 0 4px; }
.modal select { width: 100%; height: 38px; margin-top: 4px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
</style>
