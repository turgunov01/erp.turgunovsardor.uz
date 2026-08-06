<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Финансовые отчёты</h2>
      <div class="toolbar">
        <button class="btn ghost sm" :class="{ active: tab === 'tb' }" @click="tab = 'tb'">Оборотно-сальдовая</button>
        <button class="btn ghost sm" :class="{ active: tab === 'pnl' }" @click="tab = 'pnl'">Прибыль и убытки</button>
        <button class="btn ghost sm" :class="{ active: tab === 'val' }" @click="tab = 'val'">Оценка запасов</button>
      </div>
    </div>
    <div class="panel-body">
      <!-- Trial balance -->
      <div v-if="tab === 'tb'">
        <table>
          <thead><tr><th>Код</th><th>Счёт</th><th class="num">Дебет</th><th class="num">Кредит</th></tr></thead>
          <tbody>
            <tr v-for="r in tb.rows" :key="r.code">
              <td>{{ r.code }}</td><td>{{ r.name }}</td>
              <td class="num">{{ Number(r.debitMinor) ? money(Number(r.debitMinor)) : '' }}</td>
              <td class="num">{{ Number(r.creditMinor) ? money(Number(r.creditMinor)) : '' }}</td>
            </tr>
          </tbody>
          <tfoot><tr><td colspan="2"><b>Итого</b> <span :class="tb.balanced ? 'pos' : 'neg'">{{ tb.balanced ? '✓ баланс сходится' : '⚠ дисбаланс' }}</span></td><td class="num"><b>{{ money(Number(tb.totalDebit)) }}</b></td><td class="num"><b>{{ money(Number(tb.totalCredit)) }}</b></td></tr></tfoot>
        </table>
      </div>

      <!-- P&L -->
      <div v-else-if="tab === 'pnl'">
        <h3 class="sec">Доходы</h3>
        <table><tbody>
          <tr v-for="r in pnl.income" :key="r.code"><td>{{ r.code }} {{ r.name }}</td><td class="num">{{ money(Number(r.amountMinor)) }}</td></tr>
          <tr v-if="!pnl.income?.length"><td colspan="2" class="muted">Нет данных</td></tr>
        </tbody></table>
        <h3 class="sec">Расходы</h3>
        <table><tbody>
          <tr v-for="r in pnl.expense" :key="r.code"><td>{{ r.code }} {{ r.name }}</td><td class="num">{{ money(Number(r.amountMinor)) }}</td></tr>
          <tr v-if="!pnl.expense?.length"><td colspan="2" class="muted">Нет данных</td></tr>
        </tbody></table>
        <div class="totals">
          <div>Выручка/доходы: <b>{{ money(Number(pnl.totalIncome)) }}</b></div>
          <div>Расходы: <b>{{ money(Number(pnl.totalExpense)) }}</b></div>
          <div class="net" :class="Number(pnl.netProfitMinor) >= 0 ? 'pos' : 'neg'">Прибыль: <b>{{ money(Number(pnl.netProfitMinor)) }}</b></div>
        </div>
      </div>

      <!-- Inventory valuation -->
      <div v-else>
        <table>
          <thead><tr><th>Товар</th><th>Склад</th><th class="num">Кол-во</th><th class="num">Ср. себ-сть</th><th class="num">Стоимость (ср.)</th><th class="num">Стоимость (FIFO)</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in val.rows" :key="i">
              <td>{{ r.productName }} <small class="muted">{{ r.productSku }}</small></td>
              <td>{{ r.warehouseName }}</td>
              <td class="num">{{ num(r.quantity) }}</td>
              <td class="num">{{ money(Number(r.avgCostMinor)) }}</td>
              <td class="num">{{ money(Number(r.avgValueMinor)) }}</td>
              <td class="num">{{ money(Number(r.fifoValueMinor)) }}</td>
            </tr>
          </tbody>
          <tfoot><tr><td colspan="4"><b>Итого запасов</b></td><td class="num"><b>{{ money(Number(val.totalAvgMinor)) }}</b></td><td class="num"><b>{{ money(Number(val.totalFifoMinor)) }}</b></td></tr></tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const tab = ref<'tb' | 'pnl' | 'val'>('tb');
const tb = ref<any>({ rows: [], totalDebit: 0, totalCredit: 0, balanced: true });
const pnl = ref<any>({ income: [], expense: [], totalIncome: 0, totalExpense: 0, netProfitMinor: 0 });
const val = ref<any>({ rows: [], totalAvgMinor: 0, totalFifoMinor: 0 });

watch(tab, load, { immediate: false });
async function load() {
  if (tab.value === 'tb') tb.value = await auth.api('/finance/reports/trial-balance');
  else if (tab.value === 'pnl') pnl.value = await auth.api('/finance/reports/pnl');
  else val.value = await auth.api('/finance/reports/inventory-valuation');
}
onMounted(load);
</script>

<style scoped>
.btn.active { background: var(--accent, #2563eb); color: #fff; }
.sec { margin: 14px 0 6px; font-size: 14px; }
.totals { margin-top: 14px; display: flex; gap: 24px; flex-wrap: wrap; }
.totals .net b { font-size: 16px; }
.pos { color: var(--ok, #16a34a); }
.neg { color: var(--danger, #dc2626); }
</style>
