<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Платежи и поступления</h2>
      <div class="toolbar">
        <select v-model="accountId" @change="reload"><option value="">Все счета</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select>
        <select v-model="direction" @change="reload"><option value="">Все</option><option value="in">Приход</option><option value="out">Расход</option></select>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="!rows.length" class="empty" style="padding:24px">Операций не найдено.</div>
      <table v-else>
        <thead><tr><th>Дата</th><th>№</th><th>Счёт</th><th>Категория</th><th>Контрагент</th><th class="num">Сумма</th></tr></thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td>{{ dt(t.date) }}</td>
            <td class="muted">{{ t.number }}</td>
            <td>{{ t.account?.name }}</td>
            <td>{{ catLabel(t.category) }}</td>
            <td>{{ t.counterparty || '—' }}</td>
            <td class="num" :class="t.direction === 'in' ? 'pos' : 'neg'">{{ t.direction === 'in' ? '+' : '−' }}{{ money(Number(t.amountMinor)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const accounts = ref<any[]>([]); const rows = ref<any[]>([]);
const accountId = ref(''); const direction = ref('');
const ALL_CATS: Record<string, string> = { sale: 'Оплата от клиента', purchase: 'Оплата поставщику', salary: 'Зарплата', tax: 'Налоги', rent: 'Аренда', utility: 'Коммунальные', other: 'Прочее', opening: 'Начальный остаток', refund: 'Возврат' };
function catLabel(c: string) { return ALL_CATS[c] || c; }

async function reload() {
  const qs = new URLSearchParams({ pageSize: '100', ...(accountId.value ? { accountId: accountId.value } : {}), ...(direction.value ? { direction: direction.value } : {}) });
  rows.value = (await auth.api(`/finance/transactions?${qs}`)).transactions;
}
onMounted(async () => {
  accounts.value = (await auth.api('/finance/accounts')).accounts;
  await reload();
});
</script>

<style scoped>
.pos { color: var(--ok, #16a34a); }
.neg { color: var(--danger, #dc2626); }
</style>
