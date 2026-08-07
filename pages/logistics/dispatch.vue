<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Диспетчерская</h2>
      <NuxtLink to="/deliveries" class="btn ghost sm">+ Новый рейс</NuxtLink>
    </div>
    <div class="panel-body">
      <p class="hint">ℹ️ Управляйте рейсами по колонкам: <b>Запланированы → В пути → Доставлены</b>. Кнопкой «Отправить в рейс» машина уезжает, «Завершить» — приезжает обратно.</p>

      <div class="board">
        <div v-for="col in COLUMNS" :key="col.key" class="col">
          <div class="col-head" :class="col.key">
            <span>{{ col.label }}</span>
            <span class="cnt">{{ byStatus(col.key).length }}</span>
          </div>
          <div class="cards">
            <div v-for="d in byStatus(col.key)" :key="d.id" class="card">
              <div class="card-top">
                <span class="num">{{ d.number }}</span>
                <span class="cost">{{ money(Number(d.costMinor)) }}</span>
              </div>
              <div class="card-line">🚚 <b>{{ d.vehiclePlate || 'без машины' }}</b></div>
              <div class="card-line">👤 {{ d.driverName || 'без водителя' }}</div>
              <div class="card-line muted">📍 {{ d._count.stops }} точек · {{ d.scheduledDate ? fmtDate(d.scheduledDate) : 'дата не задана' }}</div>
              <div v-if="canWrite" class="card-actions">
                <button v-if="col.key === 'planned'" class="btn sm full" @click="act(d, 'dispatch')">Отправить в рейс →</button>
                <button v-if="col.key === 'in_transit'" class="btn sm full green" @click="act(d, 'complete')">✓ Завершить рейс</button>
                <button v-if="col.key !== 'delivered'" class="btn ghost sm full" @click="act(d, 'cancel')">Отменить</button>
              </div>
            </div>
            <div v-if="!byStatus(col.key).length" class="empty-col">рейсов нет</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const deliveries = ref<any[]>([]);
const canWrite = computed(() => auth.can('logistics.write'));

const COLUMNS = [
  { key: 'planned', label: '🗓️ Запланированы' },
  { key: 'in_transit', label: '🛣️ В пути' },
  { key: 'delivered', label: '✅ Доставлены' },
];
const byStatus = (s: string) => deliveries.value.filter((d) => d.status === s);

async function load() { deliveries.value = (await auth.api('/logistics/deliveries')).deliveries; }
async function act(d: any, action: string) {
  if (action === 'cancel' && !confirm(`Отменить рейс ${d.number}?`)) return;
  try { await auth.api(`/logistics/deliveries/${d.id}/${action}`, { method: 'POST' }); toast('Готово'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>

<style scoped>
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 12px 16px; margin: 0 0 16px; font-size: 14px; }
.board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
@media (max-width: 820px) { .board { grid-template-columns: 1fr; } }
.col { background: #f1f5f9; border-radius: 12px; padding: 12px; min-height: 120px; }
.col-head { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 700; color: #334155; padding: 4px 6px 10px; border-bottom: 2px solid #cbd5e1; }
.col-head.in_transit { border-color: #f59e0b; }
.col-head.delivered { border-color: #16a34a; }
.cnt { background: #e2e8f0; border-radius: 8px; padding: 1px 9px; font-size: 13px; }
.cards { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.num { font-family: ui-monospace, monospace; font-size: 13px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
.cost { font-weight: 700; }
.card-line { font-size: 14px; margin: 4px 0; }
.card-line.muted { color: #64748b; font-size: 13px; }
.card-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.btn.full { width: 100%; justify-content: center; }
.btn.green { background: #16a34a; border-color: #16a34a; color: #fff; }
.btn.green:hover { background: #15803d; }
.empty-col { text-align: center; color: #cbd5e1; padding: 16px; font-size: 13px; border: 1px dashed #cbd5e1; border-radius: 10px; }
</style>
