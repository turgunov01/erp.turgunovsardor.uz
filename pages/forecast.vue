<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Прогноз спроса</h2>
      <div class="toolbar">
        <label class="rng">Анализ, дней <input v-model.number="lookback" type="number" min="7" @change="load" /></label>
        <label class="rng">Горизонт, дней <input v-model.number="horizon" type="number" min="7" @change="load" /></label>
      </div>
    </div>
    <div class="panel-body">
      <p class="muted" style="margin-top:0">Расчёт по фактическому расходу за {{ data.lookbackDays }} дн. → прогноз на {{ data.horizonDays }} дн. (без AI, локальная статистика).</p>
      <table>
        <thead><tr><th>Товар</th><th class="num">Расход/день</th><th class="num">Прогноз спроса</th><th class="num">Остаток</th><th class="num">Хватит на, дней</th><th class="num">Рекоменд. заказ</th></tr></thead>
        <tbody>
          <tr v-for="r in data.rows" :key="r.productId" :class="{ warn: r.suggestReorder > 0 }">
            <td>{{ r.name }} <small class="muted">{{ r.sku }}</small></td>
            <td class="num">{{ r.avgPerDay }}</td>
            <td class="num">{{ r.projectedDemand }}</td>
            <td class="num">{{ r.onHand }}</td>
            <td class="num" :class="{ neg: r.daysOfCover !== null && r.daysOfCover < data.horizonDays }">{{ r.daysOfCover ?? '—' }}</td>
            <td class="num"><b v-if="r.suggestReorder > 0" class="neg">{{ r.suggestReorder }}</b><span v-else>—</span></td>
          </tr>
          <tr v-if="!data.rows.length"><td colspan="6" class="muted">Недостаточно данных о расходе.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const lookback = ref(90); const horizon = ref(30);
const data = ref<any>({ lookbackDays: 90, horizonDays: 30, rows: [] });
async function load() { data.value = await auth.api(`/analytics/forecast?lookback=${lookback.value}&horizon=${horizon.value}`); }
onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; }
.rng { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; } .rng input { width: 70px; }
tr.warn td { background: #fffbeb; }
.neg { color: #dc2626; }
</style>
