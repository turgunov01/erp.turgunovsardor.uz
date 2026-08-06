<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Отчёты</h2>
      <div class="toolbar">
        <label class="rng">С <input v-model="from" type="date" @change="load" /></label>
        <label class="rng">по <input v-model="to" type="date" @change="load" /></label>
        <button class="btn ghost sm" @click="download('csv')">Excel (CSV)</button>
        <button class="btn ghost sm" @click="download('xlsx')">XLSX</button>
        <button class="btn ghost sm" @click="printReport">Печать / PDF</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="tabs">
        <button v-for="t in TYPES" :key="t.key" class="btn ghost sm" :class="{ active: type === t.key }" @click="type = t.key; load()">{{ t.label }}</button>
      </div>
      <div id="report-print" ref="printArea">
        <h3 v-if="report" class="rep-title">{{ report.title }} <small class="muted">{{ from }} — {{ to }}</small></h3>
        <table v-if="report">
          <thead><tr><th v-for="c in report.columns" :key="c.key" :class="{ num: isNum(c.key) }">{{ c.label }}</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in report.rows" :key="i">
              <td v-for="c in report.columns" :key="c.key" :class="{ num: isNum(c.key) }">{{ fmtCell(c.key, r[c.key]) }}</td>
            </tr>
            <tr v-if="!report.rows.length"><td :colspan="report.columns.length" class="muted">Нет данных за период</td></tr>
          </tbody>
        </table>
      </div>
      <div class="muted" style="margin-top:8px;font-size:12px">Строк: {{ report?.rows.length || 0 }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const TYPES = [
  { key: 'sales', label: 'Продажи' }, { key: 'purchases', label: 'Закупки' },
  { key: 'stock', label: 'Склад' }, { key: 'production', label: 'Производство' },
];
const type = ref('sales');
function monthAgo(n: number) { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); }
const from = ref(monthAgo(6)); const to = ref(new Date().toISOString().slice(0, 10));
const report = ref<any>(null);
const printArea = ref<HTMLElement | null>(null);

const MONEY_KEYS = ['total', 'value', 'cost'];
const isNum = (k: string) => MONEY_KEYS.includes(k) || ['qty', 'planned', 'produced'].includes(k);
const fmtCell = (k: string, v: any) => (MONEY_KEYS.includes(k) ? money(Number(v)) : v);

async function load() {
  report.value = (await auth.api<any>(`/analytics/reports/${type.value}?from=${from.value}&to=${to.value}`)).report;
}
async function download(format: string) {
  const base = useRuntimeConfig().public.apiBase as string;
  const blob = await $fetch<Blob>(`${base}/analytics/reports/${type.value}/export?format=${format}&from=${from.value}&to=${to.value}`, { headers: { Authorization: 'Bearer ' + auth.access }, responseType: 'blob' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${type.value}.${format}`; a.click(); URL.revokeObjectURL(url);
}
function printReport() {
  const html = printArea.value?.innerHTML || '';
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<html><head><title>${report.value?.title || 'Отчёт'}</title><style>body{font-family:system-ui,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}.num{text-align:right}h3{margin:0 0 12px}</style></head><body>${html}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}
onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.rng { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; } .rng input { width: 148px; }
.tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.btn.active { background: var(--brand); color: #fff; }
.rep-title { margin: 0 0 12px; }
</style>
