<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Оборачиваемость и ABC-анализ</h2>
      <div class="toolbar">
        <input v-model="from" type="date" @change="reload" />
        <input v-model="to" type="date" @change="reload" />
      </div>
    </div>
    <div class="panel-body">
      <p class="muted" style="margin:0 0 10px">ABC-классификация по стоимости потребления (расход со склада) за период: <b>A</b> — 80% стоимости, <b>B</b> — следующие 15%, <b>C</b> — остальные. Оборачиваемость приведена к году.</p>
      <div v-if="data" class="abc-cards">
        <div class="abc a"><div class="lbl">Класс A</div><div class="v">{{ data.classes.A.count }} поз.</div><div class="sub">{{ data.classes.A.valuePct }}% стоимости</div></div>
        <div class="abc b"><div class="lbl">Класс B</div><div class="v">{{ data.classes.B.count }} поз.</div><div class="sub">{{ data.classes.B.valuePct }}% стоимости</div></div>
        <div class="abc c"><div class="lbl">Класс C</div><div class="v">{{ data.classes.C.count }} поз.</div><div class="sub">{{ data.classes.C.valuePct }}% стоимости</div></div>
      </div>
    </div>
  </div>

  <div class="panel" style="margin-top:16px" v-if="data">
    <div class="panel-body">
      <table>
        <thead><tr><th>Товар</th><th>Класс</th><th class="num">Расход (кол-во)</th><th class="num">Стоимость расхода</th><th class="num">Доля</th><th class="num">Накопл.</th><th class="num">Склад (стоим.)</th><th class="num">Оборач./год</th><th class="num">Дней запаса</th></tr></thead>
        <tbody>
          <tr v-for="r in data.rows" :key="r.productId">
            <td>{{ r.name }}<br><small class="muted">{{ r.sku }}</small></td>
            <td><span class="badge" :class="r.abcClass.toLowerCase()">{{ r.abcClass }}</span></td>
            <td class="num">{{ num(r.consumedQty) }}</td>
            <td class="num">{{ money(Number(r.consumedValueMinor)) }}</td>
            <td class="num">{{ r.sharePct }}%</td>
            <td class="num muted">{{ r.cumulativePct }}%</td>
            <td class="num">{{ money(Number(r.stockValueMinor)) }}</td>
            <td class="num">{{ r.turnover == null ? '—' : r.turnover.toFixed(2) }}</td>
            <td class="num">{{ r.daysOnHand == null ? '—' : Math.round(r.daysOnHand) }}</td>
          </tr>
          <tr v-if="!data.rows.length"><td colspan="9" class="empty">Нет данных за период</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const data = ref<any>(null);
const today = new Date().toISOString().slice(0, 10);
const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
const from = ref(yearAgo); const to = ref(today);
async function reload() {
  data.value = await auth.api(`/analytics/inventory-analysis?from=${from.value}&to=${to.value}`);
}
onMounted(reload);
</script>

<style scoped>
.abc-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 560px; }
.abc { border-radius: 10px; padding: 12px 14px; border: 1px solid var(--border, #e2e8f0); }
.abc .lbl { font-size: 12px; font-weight: 600; }
.abc .v { font-size: 20px; font-weight: 700; margin-top: 2px; }
.abc .sub { font-size: 12px; color: var(--muted, #64748b); }
.abc.a { background: #ecfdf5; border-color: #a7f3d0; }
.abc.b { background: #eff6ff; border-color: #bfdbfe; }
.abc.c { background: #fef2f2; border-color: #fecaca; }
.badge { font-weight: 700; padding: 2px 9px; border-radius: 8px; }
.badge.a { background: #dcfce7; color: #166534; }
.badge.b { background: #dbeafe; color: #1e40af; }
.badge.c { background: #fee2e2; color: #991b1b; }
</style>
