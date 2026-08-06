<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Отчёт по продажам (POS)</h2>
      <div class="toolbar">
        <input v-model="from" type="date" @change="reload" />
        <input v-model="to" type="date" @change="reload" />
      </div>
    </div>
    <div class="panel-body">
      <div v-if="rep" class="kpis">
        <div class="kpi"><div class="kpi-label">Выручка</div><div class="kpi-val">{{ money(Number(rep.salesMinor)) }}</div><div class="kpi-sub">{{ rep.salesCount }} чек(ов)</div></div>
        <div class="kpi"><div class="kpi-label">Наличными</div><div class="kpi-val">{{ money(Number(rep.cashMinor)) }}</div></div>
        <div class="kpi"><div class="kpi-label">Картой</div><div class="kpi-val">{{ money(Number(rep.cardMinor)) }}</div></div>
        <div class="kpi"><div class="kpi-label">Себестоимость</div><div class="kpi-val">{{ money(Number(rep.cogsMinor)) }}</div></div>
        <div class="kpi"><div class="kpi-label">Валовая прибыль</div><div class="kpi-val" :class="Number(rep.grossProfitMinor) >= 0 ? 'pos' : 'neg'">{{ money(Number(rep.grossProfitMinor)) }}</div></div>
        <div class="kpi"><div class="kpi-label">Возвраты</div><div class="kpi-val">{{ money(Number(rep.refundsMinor)) }}</div><div class="kpi-sub">{{ rep.refundsCount }} шт.</div></div>
      </div>
      <p class="muted" style="margin-top:14px">Данные за выбранный период по всем кассам. Себестоимость и прибыль считаются по проданным товарам.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const rep = ref<any>(null);
const today = new Date().toISOString().slice(0, 10);
const first = new Date(); first.setDate(1);
const from = ref(first.toISOString().slice(0, 10));
const to = ref(today);
async function reload() {
  rep.value = await auth.api(`/pos/reports/sales?from=${from.value}&to=${to.value}`);
}
onMounted(reload);
</script>

<style scoped>
.pos { color: var(--ok, #16a34a); }
.neg { color: var(--danger, #dc2626); }
.kpi-sub { font-size: 12px; color: var(--muted, #64748b); margin-top: 2px; }
</style>
