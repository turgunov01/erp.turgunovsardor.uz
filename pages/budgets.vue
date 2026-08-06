<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Бюджет (план / факт)</h2>
      <div class="toolbar">
        <input v-model="period" type="month" @change="load" />
        <button class="btn ghost sm" @click="load">Обновить</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Счёт</th><th class="num">План</th><th class="num">Факт</th><th class="num">Отклонение</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in report.rows" :key="r.accountCode">
            <td>{{ r.accountCode }} — {{ r.accountName }}</td>
            <td class="num">{{ money(Number(r.plannedMinor)) }}</td>
            <td class="num">{{ money(Number(r.actualMinor)) }}</td>
            <td class="num" :class="Number(r.varianceMinor) < 0 ? 'neg' : 'pos'">{{ money(Number(r.varianceMinor)) }}</td>
            <td class="num"><button v-if="canManage" class="link-btn" @click="remove(r.accountCode)">✕</button></td>
          </tr>
          <tr v-if="!report.rows?.length"><td colspan="5" class="muted">Нет бюджетных статей на этот период</td></tr>
        </tbody>
        <tfoot v-if="report.rows?.length"><tr><td><b>Итого</b></td><td class="num"><b>{{ money(Number(report.totalPlannedMinor)) }}</b></td><td class="num"><b>{{ money(Number(report.totalActualMinor)) }}</b></td><td colspan="2"></td></tr></tfoot>
      </table>

      <div v-if="canManage" class="addrow">
        <select v-model="form.accountCode">
          <option value="" disabled>Счёт…</option>
          <option v-for="a in accounts" :key="a.code" :value="a.code">{{ a.code }} — {{ a.name }}</option>
        </select>
        <input v-model.number="form.planned" type="number" min="0" placeholder="План, сум" />
        <button class="btn sm" :disabled="!form.accountCode || !form.planned" @click="add">Добавить статью</button>
        <span v-if="err" class="neg">{{ err }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const canManage = computed(() => auth.can('finance.accounting'));

const now = new Date();
const period = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
const report = ref<any>({ rows: [], totalPlannedMinor: 0, totalActualMinor: 0 });
const accounts = ref<any[]>([]);
const form = ref<{ accountCode: string; planned: number | null }>({ accountCode: '', planned: null });
const err = ref('');

async function load() {
  report.value = await auth.api(`/finance/reports/budget?periodCode=${period.value}`);
}
async function add() {
  err.value = '';
  try {
    await auth.api('/finance/budgets', { method: 'POST', body: { periodCode: period.value, accountCode: form.value.accountCode, plannedMinor: Math.round((form.value.planned || 0) * 100) } });
    form.value = { accountCode: '', planned: null }; toast('Статья добавлена'); await load();
  } catch (e: any) { err.value = e.message; }
}
async function remove(accountCode: string) {
  const list = await auth.api<any>(`/finance/budgets?periodCode=${period.value}`);
  const b = list.budgets.find((x: any) => x.accountCode === accountCode);
  if (!b) return;
  await auth.api(`/finance/budgets/${b.id}`, { method: 'DELETE' });
  toast('Статья удалена'); await load();
}
onMounted(async () => {
  const c = await auth.api<any>('/finance/chart');
  accounts.value = c.accounts;
  await load();
});
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; }
.addrow { margin-top: 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.addrow select, .addrow input { height: 36px; }
.link-btn { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 14px; }
.pos { color: #16a34a; } .neg { color: #dc2626; }
</style>
