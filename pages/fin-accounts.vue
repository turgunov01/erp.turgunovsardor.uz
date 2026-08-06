<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Кассы и банковские счета</h2>
      <div class="toolbar">
        <div class="muted">Итого: <b>{{ money(totalMinor) }}</b></div>
        <button v-if="canWrite" class="btn sm" @click="openNew">+ Новый счёт</button>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="!accounts.length" class="empty" style="padding:24px">Пока нет счетов. Создайте кассу или банковский счёт.</div>
      <table v-else>
        <thead><tr><th>Название</th><th>Тип</th><th>Счёт</th><th class="num">Остаток</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in accounts" :key="a.id" :class="{ archived: a.status === 'archived' }">
            <td>{{ a.name }}</td>
            <td>{{ kindLabel(a.kind) }}</td>
            <td class="muted">{{ a.accountNo || '—' }}</td>
            <td class="num">{{ money(Number(a.balanceMinor), a.currency) }}</td>
            <td class="num">
              <button class="btn ghost sm" @click="openTx(a, 'in')">Приход</button>
              <button class="btn ghost sm" @click="openTx(a, 'out')">Расход</button>
              <button class="btn ghost sm" @click="openDetail(a)">Операции</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="nw.show" title="Новый счёт" submit-label="Создать" @close="nw.show = false" @submit="createAccount">
    <label>Название</label><input v-model="nw.name" placeholder="Основная касса" />
    <div class="row2">
      <div><label>Тип</label><select v-model="nw.kind"><option value="cash">Касса</option><option value="bank">Банковский счёт</option><option value="card">Карта</option></select></div>
      <div><label>Валюта</label><input v-model="nw.currency" /></div>
    </div>
    <template v-if="nw.kind !== 'cash'"><label>Номер счёта</label><input v-model="nw.accountNo" placeholder="2020 8000 ..." /></template>
    <label>Начальный остаток</label><input v-model.number="nw.opening" type="number" min="0" step="0.01" />
    <div class="hint" style="text-align:left;margin-top:6px">Начальный остаток отражается проводкой Дт {{ nw.kind === 'cash' ? '1010 Касса' : '1020 Расчётный счёт' }} — Кт 3010 Капитал.</div>
  </Modal>

  <Modal v-if="tx.show" :title="tx.direction === 'in' ? 'Поступление' : 'Расход / платёж'" submit-label="Провести" @close="tx.show = false" @submit="submitTx">
    <div class="muted" style="margin-bottom:8px">Счёт: <b>{{ tx.accountName }}</b> · остаток {{ money(tx.balance) }}</div>
    <label>Категория</label>
    <select v-model="tx.category">
      <option v-for="c in categories(tx.direction)" :key="c.v" :value="c.v">{{ c.l }}</option>
    </select>
    <div class="row2">
      <div><label>Сумма</label><input v-model.number="tx.amount" type="number" min="0" step="0.01" /></div>
      <div><label>Дата</label><input v-model="tx.date" type="date" /></div>
    </div>
    <label>Контрагент</label><input v-model="tx.counterparty" placeholder="Клиент / поставщик" />
    <label>Примечание</label><input v-model="tx.note" />
  </Modal>

  <Modal v-if="dt2.show" :title="`Операции: ${dt2.name}`" submit-label="Закрыть" @close="dt2.show = false" @submit="dt2.show = false">
    <table class="mini">
      <thead><tr><th>Дата</th><th>№</th><th>Категория</th><th class="num">Сумма</th><th class="num">Остаток</th></tr></thead>
      <tbody>
        <tr v-for="t in dt2.rows" :key="t.id">
          <td>{{ dt(t.date) }}</td><td class="muted">{{ t.number }}</td><td>{{ catLabel(t.category) }}</td>
          <td class="num" :class="t.direction === 'in' ? 'pos' : 'neg'">{{ t.direction === 'in' ? '+' : '−' }}{{ money(Number(t.amountMinor)) }}</td>
          <td class="num">{{ money(Number(t.balanceAfter)) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="!dt2.rows.length" class="empty" style="padding:16px">Операций пока нет.</div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const accounts = ref<any[]>([]); const totalMinor = ref(0);
const canWrite = computed(() => auth.can('finance.write'));

const CATS_IN = [{ v: 'sale', l: 'Оплата от клиента' }, { v: 'refund', l: 'Возврат средств' }, { v: 'other', l: 'Прочий доход' }];
const CATS_OUT = [{ v: 'purchase', l: 'Оплата поставщику' }, { v: 'salary', l: 'Зарплата' }, { v: 'tax', l: 'Налоги' }, { v: 'rent', l: 'Аренда' }, { v: 'utility', l: 'Коммунальные' }, { v: 'other', l: 'Прочие расходы' }];
const ALL_CATS: Record<string, string> = { sale: 'Оплата от клиента', purchase: 'Оплата поставщику', salary: 'Зарплата', tax: 'Налоги', rent: 'Аренда', utility: 'Коммунальные', other: 'Прочее', opening: 'Начальный остаток', refund: 'Возврат' };
function categories(dir: string) { return dir === 'in' ? CATS_IN : CATS_OUT; }
function catLabel(c: string) { return ALL_CATS[c] || c; }
function kindLabel(k: string) { return k === 'cash' ? 'Касса' : k === 'bank' ? 'Банк' : 'Карта'; }

const nw = reactive<any>({ show: false, name: '', kind: 'cash', currency: 'UZS', accountNo: '', opening: 0 });
const tx = reactive<any>({ show: false, accountId: '', accountName: '', balance: 0, direction: 'in', category: 'sale', amount: 0, date: '', counterparty: '', note: '' });
const dt2 = reactive<any>({ show: false, name: '', rows: [] });

async function reload() {
  const res = await auth.api('/finance/accounts');
  accounts.value = res.accounts; totalMinor.value = Number(res.totalMinor);
}
function openNew() { Object.assign(nw, { show: true, name: '', kind: 'cash', currency: 'UZS', accountNo: '', opening: 0 }); }
async function createAccount() {
  try {
    if (!nw.name) { toast('Укажите название', true); return; }
    await auth.api('/finance/accounts', { method: 'POST', body: { name: nw.name, kind: nw.kind, currency: nw.currency, accountNo: nw.accountNo || undefined, openingMinor: Math.round((Number(nw.opening) || 0) * 100) } });
    nw.show = false; toast('Счёт создан'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
function openTx(a: any, dir: string) {
  Object.assign(tx, { show: true, accountId: a.id, accountName: a.name, balance: Number(a.balanceMinor), direction: dir, category: dir === 'in' ? 'sale' : 'purchase', amount: 0, date: '', counterparty: '', note: '' });
}
async function submitTx() {
  try {
    if (!tx.amount || tx.amount <= 0) { toast('Укажите сумму', true); return; }
    await auth.api('/finance/transactions', { method: 'POST', body: { accountId: tx.accountId, direction: tx.direction, category: tx.category, amountMinor: Math.round(Number(tx.amount) * 100), date: tx.date || undefined, counterparty: tx.counterparty || undefined, note: tx.note || undefined } });
    tx.show = false; toast('Операция проведена'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function openDetail(a: any) {
  const res = await auth.api(`/finance/accounts/${a.id}`);
  Object.assign(dt2, { show: true, name: a.name, rows: res.transactions });
}
onMounted(reload);
</script>

<style scoped>
.archived { opacity: .5; }
.pos { color: var(--ok, #16a34a); }
.neg { color: var(--danger, #dc2626); }
table.mini { width: 100%; font-size: 13px; }
</style>
