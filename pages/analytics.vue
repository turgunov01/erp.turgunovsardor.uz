<template>
  <div>
    <div class="panel">
      <div class="panel-head">
        <h2>Аналитика</h2>
        <div class="toolbar">
          <label class="rng">С <input v-model="from" type="date" @change="load" /></label>
          <label class="rng">по <input v-model="to" type="date" @change="load" /></label>
          <button class="btn ghost sm" @click="configuring = !configuring">⚙ Виджеты</button>
        </div>
      </div>
      <div v-if="configuring" class="panel-body cfg">
        <label v-for="w in ALL_WIDGETS" :key="w.key" class="cfg-item">
          <input type="checkbox" :checked="enabled(w.key)" @change="toggle(w.key)" /> {{ w.label }}
        </label>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="kpi-grid">
      <div v-for="w in visibleKpis" :key="w.key" class="kpi-card" :class="w.tone">
        <div class="k-label">{{ w.label }}</div>
        <div class="k-value">{{ w.fmt(kpi) }}</div>
      </div>
    </div>

    <!-- Revenue trend -->
    <div v-if="enabled('revenueChart')" class="panel">
      <div class="panel-head"><h2>Выручка по месяцам</h2></div>
      <div class="panel-body">
        <svg v-if="revenue.length" :viewBox="`0 0 ${chartW} ${chartH}`" class="chart" preserveAspectRatio="none">
          <line v-for="(g,i) in 4" :key="i" :x1="0" :x2="chartW" :y1="chartH*i/4" :y2="chartH*i/4" class="grid" />
          <rect v-for="(p,i) in revenue" :key="i" :x="barX(i)" :y="barY(p.v)" :width="barW" :height="chartH-barY(p.v)" class="bar" />
          <text v-for="(p,i) in revenue" :key="'t'+i" :x="barX(i)+barW/2" :y="chartH-2" text-anchor="middle" class="lbl">{{ p.label.slice(5) }}</text>
        </svg>
        <div v-else class="empty">Нет данных о выручке за период.</div>
      </div>
    </div>

    <!-- Top products -->
    <div v-if="enabled('topProducts')" class="panel">
      <div class="panel-head"><h2>Топ товаров (по отгрузке)</h2></div>
      <div class="panel-body">
        <div v-if="top.length" class="tp">
          <div v-for="(p,i) in top" :key="i" class="tp-row">
            <span class="tp-name">{{ p.name }} <small class="muted">{{ p.sku }}</small></span>
            <span class="tp-bar"><span class="tp-fill" :style="{ width: (Number(p.quantity)/topMax*100)+'%' }"></span></span>
            <span class="tp-val">{{ num(p.quantity) }}</span>
          </div>
        </div>
        <div v-else class="empty">Нет отгрузок за период.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();

const ALL_WIDGETS = [
  { key: 'revenue', label: 'Выручка', tone: 'green', fmt: (k: any) => money(Number(k.revenueMinor)) },
  { key: 'grossProfit', label: 'Валовая прибыль', tone: 'green', fmt: (k: any) => money(Number(k.grossProfitMinor)) },
  { key: 'cash', label: 'Денежные средства', tone: '', fmt: (k: any) => money(Number(k.cashMinor)) },
  { key: 'stockValue', label: 'Стоимость запасов', tone: '', fmt: (k: any) => money(Number(k.stockValueMinor)) },
  { key: 'ar', label: 'Дебиторка', tone: '', fmt: (k: any) => money(Number(k.arMinor)) },
  { key: 'ap', label: 'Кредиторка', tone: 'red', fmt: (k: any) => money(Number(k.apMinor)) },
  { key: 'lowStock', label: 'Ниже минимума', tone: 'amber', fmt: (k: any) => String(k.lowStockCount) },
  { key: 'salesOrders', label: 'Заказы (продажи)', tone: '', fmt: (k: any) => String(k.salesOrders) },
  { key: 'productionDone', label: 'Произв. заказов готово', tone: '', fmt: (k: any) => String(k.productionDone) },
  { key: 'openDeals', label: 'Открытые сделки', tone: '', fmt: (k: any) => `${k.openDeals} · ${money(Number(k.openDealsAmountMinor))}` },
  { key: 'revenueChart', label: 'График выручки', tone: '', fmt: () => '' },
  { key: 'topProducts', label: 'Топ товаров', tone: '', fmt: () => '' },
];
const CHART_KEYS = ['revenueChart', 'topProducts'];
const DEFAULTS = ['revenue', 'grossProfit', 'cash', 'stockValue', 'lowStock', 'openDeals', 'revenueChart', 'topProducts'];

const kpi = ref<any>({});
const revenue = ref<{ label: string; v: number }[]>([]);
const top = ref<any[]>([]);
const configuring = ref(false);

function monthAgo(n: number) { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); }
const from = ref(monthAgo(6)); const to = ref(new Date().toISOString().slice(0, 10));

// Widget visibility — persisted per browser (a UI preference; no migration needed).
const sel = ref<string[]>([]);
onMounted(() => { try { sel.value = JSON.parse(localStorage.getItem('ttr_dash') || 'null') || DEFAULTS; } catch { sel.value = DEFAULTS; } });
const enabled = (k: string) => sel.value.includes(k);
function toggle(k: string) {
  sel.value = enabled(k) ? sel.value.filter((x) => x !== k) : [...sel.value, k];
  localStorage.setItem('ttr_dash', JSON.stringify(sel.value));
}
const visibleKpis = computed(() => ALL_WIDGETS.filter((w) => !CHART_KEYS.includes(w.key) && enabled(w.key)));

// SVG chart geometry.
const chartW = 720; const chartH = 220;
const revMax = computed(() => Math.max(1, ...revenue.value.map((p) => p.v)));
const barW = computed(() => (revenue.value.length ? Math.min(60, (chartW - 20) / revenue.value.length - 8) : 40));
const barX = (i: number) => 10 + i * ((chartW - 20) / Math.max(1, revenue.value.length));
const barY = (v: number) => chartH - 18 - (v / revMax.value) * (chartH - 30);
const topMax = computed(() => Math.max(1, ...top.value.map((p) => Number(p.quantity))));

async function load() {
  const qs = `from=${from.value}&to=${to.value}`;
  const [k, s] = await Promise.all([auth.api<any>(`/analytics/kpis?${qs}`), auth.api<any>(`/analytics/series?${qs}`)]);
  kpi.value = k;
  revenue.value = s.revenue.map((r: any) => ({ label: r.label, v: Number(r.amountMinor) / 100 }));
  top.value = s.topProducts;
}
onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; }
.rng { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; } .rng input { width: 150px; }
.cfg { display: flex; flex-wrap: wrap; gap: 14px; padding: 16px 18px; }
.cfg-item { font-size: 13px; display: flex; gap: 6px; align-items: center; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px; }
.kpi-card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
.kpi-card.green { border-left: 3px solid #16a34a; } .kpi-card.red { border-left: 3px solid #dc2626; } .kpi-card.amber { border-left: 3px solid #d97706; }
.k-label { color: var(--muted); font-size: 12px; } .k-value { font-size: 22px; font-weight: 700; margin-top: 6px; }
.chart { width: 100%; height: 240px; }
.chart .bar { fill: var(--brand); opacity: .85; } .chart .grid { stroke: #eef2f7; } .chart .lbl { font-size: 10px; fill: #94a3b8; }
.tp { display: flex; flex-direction: column; gap: 8px; }
.tp-row { display: grid; grid-template-columns: 220px 1fr 80px; gap: 12px; align-items: center; font-size: 13px; }
.tp-bar { background: #f1f5f9; border-radius: 6px; height: 14px; overflow: hidden; }
.tp-fill { display: block; height: 100%; background: var(--brand); }
.tp-val { text-align: right; font-weight: 600; }
.empty { color: var(--muted); padding: 12px 0; }
</style>
