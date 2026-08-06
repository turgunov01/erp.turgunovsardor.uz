<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Планирование потребности (MRP)</h2>
      <div class="toolbar">
        <label class="chk"><input v-model="includeMinStock" type="checkbox" /> Учитывать мин. остатки</label>
        <button v-if="canWrite" class="btn sm" @click="runMrp">Рассчитать потребность</button>
      </div>
    </div>
    <div class="panel-body">
      <p class="muted" style="margin:0 0 8px">Считает нетто-потребность в материалах: спрос производственных заказов + пополнение до мин. остатка − наличие на складе − уже заказано у поставщиков. Дефицит можно одной кнопкой превратить в заявку на закупку.</p>
    </div>
  </div>

  <div v-if="run" class="panel" style="margin-top:16px">
    <div class="panel-head">
      <h3>Расчёт {{ run.number }} <span class="tag" :class="run.status">{{ run.status === 'applied' ? 'Заявка создана' : 'Черновик' }}</span></h3>
      <div class="toolbar">
        <span class="muted">Дефицит: {{ shortageCount }} поз.</span>
        <button v-if="canWrite && run.status !== 'applied' && shortageCount" class="btn sm" @click="apply">Создать заявку на закупку</button>
        <NuxtLink v-if="run.requestNumber" class="btn ghost sm" to="/purchase-requests">Заявка {{ run.requestNumber }} →</NuxtLink>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Материал</th><th class="num">Спрос</th><th class="num">До мин.</th><th class="num">На складе</th><th class="num">В заказах</th><th class="num">Дефицит</th><th class="num">К заказу</th></tr></thead>
        <tbody>
          <tr v-for="l in lines" :key="l.id || l.productId" :class="{ short: Number(l.suggestedQty) > 0 }">
            <td>{{ l.productName }}<br><small class="muted">{{ l.productSku }}</small></td>
            <td class="num">{{ num(l.demandQty) }}</td>
            <td class="num">{{ num(l.minTopUpQty) }}</td>
            <td class="num">{{ num(l.onHandQty) }}</td>
            <td class="num">{{ num(l.onOrderQty) }}</td>
            <td class="num" :class="Number(l.netQty) > 0 ? 'neg' : ''">{{ num(l.netQty) }}</td>
            <td class="num"><b v-if="Number(l.suggestedQty) > 0">{{ num(l.suggestedQty) }}</b><span v-else class="muted">—</span></td>
          </tr>
          <tr v-if="!lines.length"><td colspan="7" class="empty">Потребности нет — всё обеспечено.</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel" style="margin-top:16px">
    <div class="panel-head"><h3>История расчётов</h3></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>№</th><th>Дата</th><th class="num">Позиций</th><th>Мин. остатки</th><th>Статус</th><th>Заявка</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in runs" :key="r.id">
            <td><small class="muted">{{ r.number }}</small></td>
            <td>{{ dt(r.createdAt) }}</td>
            <td class="num">{{ r._count.lines }}</td>
            <td>{{ r.includeMinStock ? 'да' : 'нет' }}</td>
            <td><span class="tag" :class="r.status">{{ r.status === 'applied' ? 'Заявка создана' : 'Черновик' }}</span></td>
            <td>{{ r.requestNumber || '—' }}</td>
            <td class="row-actions">
              <button class="btn ghost sm" @click="openRun(r)">Открыть</button>
              <button v-if="canWrite && r.status !== 'applied'" class="btn ghost sm" @click="delRun(r)">✕</button>
            </td>
          </tr>
          <tr v-if="!runs.length"><td colspan="7" class="empty">Расчётов ещё не было</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const includeMinStock = ref(true);
const run = ref<any>(null); const lines = ref<any[]>([]); const runs = ref<any[]>([]);
const canWrite = computed(() => auth.can('procurement.write'));
const shortageCount = computed(() => lines.value.filter((l) => Number(l.suggestedQty) > 0).length);

async function loadRuns() { runs.value = (await auth.api('/mrp/runs')).runs; }
async function runMrp() {
  try {
    const r = await auth.api('/mrp/runs', { method: 'POST', body: { includeMinStock: includeMinStock.value } });
    run.value = r.run; lines.value = r.lines; toast(`Расчёт ${r.run.number} готов`); await loadRuns();
  } catch (e: any) { toast(e.message, true); }
}
async function openRun(r: any) {
  const d = await auth.api(`/mrp/runs/${r.id}`);
  run.value = d.run; lines.value = d.lines;
}
async function apply() {
  if (!confirm('Создать заявку на закупку по дефицитным позициям?')) return;
  try {
    const r = await auth.api(`/mrp/runs/${run.value.id}/apply`, { method: 'POST' });
    toast(`Создана заявка ${r.requestNumber} (${r.itemCount} поз.)`);
    run.value = { ...run.value, status: 'applied', requestNumber: r.requestNumber };
    await loadRuns();
  } catch (e: any) { toast(e.message, true); }
}
async function delRun(r: any) {
  if (!confirm('Удалить расчёт?')) return;
  try { await auth.api(`/mrp/runs/${r.id}`, { method: 'DELETE' }); if (run.value?.id === r.id) { run.value = null; lines.value = []; } await loadRuns(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(loadRuns);
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.draft { background: #e2e8f0; color: #475569; }
.tag.applied { background: #dcfce7; color: #166534; }
.neg { color: var(--danger, #dc2626); }
tr.short { background: #fff7ed; }
.row-actions { display: flex; gap: 6px; }
.chk { display: flex; align-items: center; gap: 6px; font-size: 13px; }
</style>
