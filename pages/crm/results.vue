<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Итоги сделок</h2>
    </div>
    <div class="panel-body">
      <p class="hint">ℹ️ Здесь видно, чем закончились сделки: кто купил (выиграно) и кто отказался (проиграно) и почему.</p>

      <div class="summary">
        <div class="sum won">✅ Выиграно: <b>{{ won.length }}</b> сделок на сумму <b>{{ money(wonSum) }}</b></div>
        <div class="sum lost">❌ Проиграно: <b>{{ lost.length }}</b> сделок</div>
      </div>

      <h3 class="section">✅ Выигранные — клиент купил</h3>
      <table>
        <thead><tr><th>Название</th><th>Клиент</th><th class="num">Сумма</th></tr></thead>
        <tbody>
          <tr v-for="d in won" :key="d.id"><td><strong>{{ d.title }}</strong></td><td>{{ d.customer || '—' }}</td><td class="num">{{ money(d.amountMinor) }}</td></tr>
          <tr v-if="!won.length"><td colspan="3" class="empty">Пока нет выигранных сделок.</td></tr>
        </tbody>
      </table>

      <h3 class="section">❌ Проигранные — клиент отказался</h3>
      <table>
        <thead><tr><th>Название</th><th>Клиент</th><th class="num">Сумма</th><th>Причина отказа</th></tr></thead>
        <tbody>
          <tr v-for="d in lost" :key="d.id"><td><strong>{{ d.title }}</strong></td><td>{{ d.customer || '—' }}</td><td class="num">{{ money(d.amountMinor) }}</td><td class="reason">{{ d.lostReason || '—' }}</td></tr>
          <tr v-if="!lost.length"><td colspan="4" class="empty">Пока нет проигранных сделок.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const cols = ref<any[]>([]);
const items = (stage: string) => (cols.value.find((c) => c.stage === stage)?.items) || [];
const won = computed(() => items('won'));
const lost = computed(() => items('lost'));
const wonSum = computed(() => won.value.reduce((s: number, d: any) => s + Number(d.amountMinor), 0));

async function load() {
  const f = await auth.api('/crm/funnel');
  cols.value = f.columns;
}
onMounted(load);
</script>

<style scoped>
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 10px 14px; margin: 0 0 14px; font-size: 14px; }
.summary { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
.sum { flex: 1; min-width: 240px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; font-size: 15px; }
.sum.won { background: #f0fdf4; border-color: #bbf7d0; }
.sum.lost { background: #fef2f2; border-color: #fecaca; }
.section { margin: 22px 0 10px; font-size: 15px; }
.reason { color: #dc2626; }
</style>
