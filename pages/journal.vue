<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Журнал проводок</h2>
      <div class="toolbar">
        <select v-model="source" @change="reload">
          <option value="">Все источники</option>
          <option value="manual">Ручные</option>
          <option value="sales">Продажи</option>
          <option value="purchase">Закупки</option>
          <option value="production">Производство</option>
          <option value="cash">Касса</option>
          <option value="adjust">Корректировки</option>
        </select>
        <button v-if="canAccounting" class="btn sm" @click="openNew">+ Проводка</button>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="!entries.length" class="empty" style="padding:24px">Проводок не найдено.</div>
      <table v-else>
        <thead><tr><th>№</th><th>Дата</th><th>Описание</th><th>Источник</th><th class="num">Сумма</th><th></th></tr></thead>
        <tbody>
          <tr v-for="e in entries" :key="e.id" :class="{ voided: e.reversedById || e.status === 'void' }">
            <td class="muted">{{ e.number }}</td>
            <td>{{ dt(e.date) }}</td>
            <td>{{ e.memo || '—' }}</td>
            <td>{{ srcLabel(e.source) }}</td>
            <td class="num">{{ money(Number(e.totalMinor)) }}</td>
            <td class="num"><button class="btn ghost sm" @click="openView(e)">Открыть</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- View entry lines -->
  <Modal v-if="vw.show" :title="`Проводка ${vw.entry?.number}`" submit-label="Закрыть" @close="vw.show = false" @submit="vw.show = false">
    <div class="muted" style="margin-bottom:8px">{{ dt(vw.entry?.date) }} · {{ vw.entry?.memo || '' }} <span v-if="vw.entry?.reversedById" class="tag">сторнирована</span></div>
    <table class="mini">
      <thead><tr><th>Счёт</th><th class="num">Дебет</th><th class="num">Кредит</th></tr></thead>
      <tbody>
        <tr v-for="(l, i) in vw.entry?.lines" :key="i">
          <td>{{ l.accountCode }} {{ l.accountName }}<div v-if="l.description" class="muted sm">{{ l.description }}</div></td>
          <td class="num">{{ Number(l.debitMinor) ? money(Number(l.debitMinor)) : '' }}</td>
          <td class="num">{{ Number(l.creditMinor) ? money(Number(l.creditMinor)) : '' }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="canAccounting && !vw.entry?.reversedById && vw.entry?.status !== 'void'" style="margin-top:12px">
      <button class="btn ghost sm" @click="reverse(vw.entry.id)">Сторнировать</button>
    </div>
  </Modal>

  <!-- New manual entry -->
  <Modal v-if="nw.show" title="Ручная проводка" submit-label="Провести" @close="nw.show = false" @submit="post">
    <label>Описание</label><input v-model="nw.memo" placeholder="Назначение проводки" />
    <label>Дата</label><input v-model="nw.date" type="date" />
    <table class="mini" style="margin-top:8px">
      <thead><tr><th>Счёт</th><th class="num">Дебет</th><th class="num">Кредит</th><th></th></tr></thead>
      <tbody>
        <tr v-for="(l, i) in nw.lines" :key="i">
          <td><select v-model="l.accountCode"><option value="">— счёт —</option><option v-for="a in chart" :key="a.code" :value="a.code">{{ a.code }} {{ a.name }}</option></select></td>
          <td><input v-model.number="l.debit" type="number" min="0" step="0.01" style="width:110px" /></td>
          <td><input v-model.number="l.credit" type="number" min="0" step="0.01" style="width:110px" /></td>
          <td><button class="btn ghost sm" @click="nw.lines.splice(i, 1)" :disabled="nw.lines.length <= 2">×</button></td>
        </tr>
      </tbody>
    </table>
    <button class="btn ghost sm" style="margin-top:6px" @click="nw.lines.push({ accountCode: '', debit: 0, credit: 0 })">+ Строка</button>
    <div class="hint" style="text-align:left;margin-top:8px" :class="{ neg: !balanced }">Дебет: {{ money(sumD) }} · Кредит: {{ money(sumC) }} {{ balanced ? '✓ сбалансирована' : '— не сходится' }}</div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const entries = ref<any[]>([]); const chart = ref<any[]>([]); const source = ref('');
const canAccounting = computed(() => auth.can('finance.accounting'));
const SRC: Record<string, string> = { manual: 'Ручная', sales: 'Продажи', purchase: 'Закупки', production: 'Производство', cash: 'Касса', adjust: 'Корректировка' };
function srcLabel(s: string) { return SRC[s] || s; }

const vw = reactive<any>({ show: false, entry: null });
const nw = reactive<any>({ show: false, memo: '', date: '', lines: [] as any[] });
const sumD = computed(() => Math.round(nw.lines.reduce((s: number, l: any) => s + (Number(l.debit) || 0) * 100, 0)));
const sumC = computed(() => Math.round(nw.lines.reduce((s: number, l: any) => s + (Number(l.credit) || 0) * 100, 0)));
const balanced = computed(() => sumD.value === sumC.value && sumD.value > 0);

async function reload() {
  const qs = new URLSearchParams({ pageSize: '100', ...(source.value ? { source: source.value } : {}) });
  entries.value = (await auth.api(`/finance/journal?${qs}`)).entries;
}
async function openView(e: any) { vw.entry = (await auth.api(`/finance/journal/${e.id}`)).entry; vw.show = true; }
function openNew() { Object.assign(nw, { show: true, memo: '', date: '', lines: [{ accountCode: '', debit: 0, credit: 0 }, { accountCode: '', debit: 0, credit: 0 }] }); }
async function post() {
  try {
    if (!balanced.value) { toast('Проводка не сбалансирована', true); return; }
    const lines = nw.lines.filter((l: any) => l.accountCode && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
      .map((l: any) => ({ accountCode: l.accountCode, debitMinor: Math.round((Number(l.debit) || 0) * 100), creditMinor: Math.round((Number(l.credit) || 0) * 100) }));
    await auth.api('/finance/journal', { method: 'POST', body: { memo: nw.memo || undefined, date: nw.date || undefined, lines } });
    nw.show = false; toast('Проводка проведена'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function reverse(id: string) {
  try { const r = await auth.api(`/finance/journal/${id}/reverse`, { method: 'POST' }); toast(`Сторно ${r.reversal.number} создано`); vw.show = false; await reload(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  chart.value = (await auth.api('/finance/chart')).accounts.filter((a: any) => a.status === 'active');
  await reload();
});
</script>

<style scoped>
.voided { opacity: .55; text-decoration: line-through; }
.mini { width: 100%; font-size: 13px; }
.sm { font-size: 11px; }
.neg { color: var(--danger, #dc2626); }
.tag { font-size: 11px; background: var(--chip, #fee); padding: 1px 6px; border-radius: 6px; }
</style>
