<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Сверка с банком</h2>
      <div class="toolbar">
        <select v-model="accountId" @change="load">
          <option value="" disabled>Счёт…</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>
    </div>
    <div class="panel-body" v-if="accountId">
      <div class="rec-top">
        <div>Сверенный остаток: <b>{{ money(Number(recon.reconciledBalanceMinor)) }}</b></div>
        <div>Остаток в системе: <b>{{ money(Number(recon.bookBalanceMinor)) }}</b></div>
        <label class="rng">Остаток по выписке: <input v-model.number="statementBalance" type="number" placeholder="сум" /></label>
        <div v-if="statementBalance !== null" :class="diffClass">Расхождение: <b>{{ money(diffMinor) }}</b></div>
      </div>

      <table>
        <thead><tr><th style="width:34px"></th><th>Дата</th><th>№</th><th>Назначение</th><th class="num">Сумма</th></tr></thead>
        <tbody>
          <tr v-for="t in recon.unreconciled" :key="t.id">
            <td><input type="checkbox" :value="t.id" v-model="picked" /></td>
            <td>{{ fmtDate(t.date) }}</td>
            <td>{{ t.number }}</td>
            <td>{{ t.note || t.counterparty || t.category }}</td>
            <td class="num" :class="t.direction === 'in' ? 'pos' : 'neg'">{{ t.direction === 'in' ? '+' : '−' }}{{ money(Number(t.amountMinor)) }}</td>
          </tr>
          <tr v-if="!recon.unreconciled?.length"><td colspan="5" class="muted">Все операции сверены ✓</td></tr>
        </tbody>
      </table>

      <div class="actions" v-if="recon.unreconciled?.length && canManage">
        <button class="btn sm" :disabled="!picked.length" @click="reconcile">Отметить сверенными ({{ picked.length }})</button>
      </div>
    </div>
    <div class="panel-body muted" v-else>Выберите счёт для сверки.</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const canManage = computed(() => auth.can('finance.write'));

const accounts = ref<any[]>([]);
const accountId = ref('');
const recon = ref<any>({ reconciledBalanceMinor: 0, bookBalanceMinor: 0, unreconciled: [] });
const picked = ref<string[]>([]);
const statementBalance = ref<number | null>(null);

const diffMinor = computed(() => (statementBalance.value === null ? 0 : Math.round(statementBalance.value * 100) - Number(recon.value.reconciledBalanceMinor)));
const diffClass = computed(() => (diffMinor.value === 0 ? 'pos' : 'neg'));

async function load() {
  picked.value = [];
  if (!accountId.value) return;
  recon.value = await auth.api(`/finance/accounts/${accountId.value}/reconciliation`);
}
async function reconcile() {
  await auth.api(`/finance/accounts/${accountId.value}/reconcile`, { method: 'POST', body: {
    txIds: picked.value, reconciled: true,
    statementBalanceMinor: statementBalance.value !== null ? Math.round(statementBalance.value * 100) : undefined,
  } });
  toast('Операции сверены'); await load();
}
onMounted(async () => {
  const a = await auth.api<any>('/finance/accounts');
  accounts.value = a.accounts.filter((x: any) => x.kind !== 'cash');
  if (accounts.value[0]) { accountId.value = accounts.value[0].id; await load(); }
});
</script>

<style scoped>
.toolbar select { height: 36px; min-width: 220px; }
.rec-top { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.rng { display: flex; gap: 6px; align-items: center; } .rng input { width: 140px; }
.actions { margin-top: 14px; }
.pos { color: #16a34a; } .neg { color: #dc2626; }
</style>
