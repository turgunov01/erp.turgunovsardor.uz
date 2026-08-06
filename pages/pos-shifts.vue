<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Кассовые смены</h2>
      <div class="toolbar">
        <select v-model="status" @change="reload"><option value="">Все</option><option value="open">Открытые</option><option value="closed">Закрытые</option></select>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>№</th><th>Касса</th><th>Открыта</th><th>Закрыта</th><th class="num">Чеков</th><th class="num">Выручка</th><th class="num">Расхождение</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="s in shifts" :key="s.id">
            <td><small class="muted">{{ s.number }}</small></td>
            <td>{{ s.register?.name }}</td>
            <td>{{ dt(s.openedAt) }}</td>
            <td>{{ s.closedAt ? dt(s.closedAt) : '—' }}</td>
            <td class="num">{{ s._count.receipts }}</td>
            <td class="num">{{ money(Number(s.totalSalesMinor)) }}</td>
            <td class="num" :class="varClass(s)">{{ s.cashVarianceMinor == null ? '—' : money(Number(s.cashVarianceMinor)) }}</td>
            <td><span class="tag" :class="s.status">{{ s.status === 'open' ? 'Открыта' : 'Закрыта' }}</span></td>
            <td><button class="btn ghost sm" @click="openDetail(s)">Отчёт</button></td>
          </tr>
          <tr v-if="!shifts.length"><td colspan="9" class="empty">Смен нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="d.show" :title="`Z-отчёт · смена ${d.shift?.number}`" submit-label="Закрыть" wide @close="d.show = false" @submit="d.show = false">
    <div v-if="d.shift">
      <div class="zrows">
        <div><span>Касса</span><b>{{ d.shift.register?.name }}</b></div>
        <div><span>Открыта</span><b>{{ dt(d.shift.openedAt) }}</b></div>
        <div><span>Разменный фонд</span><b>{{ money(Number(d.shift.openingFloatMinor)) }}</b></div>
        <div><span>Продажи наличными</span><b>{{ money(Number(d.shift.cashSalesMinor)) }}</b></div>
        <div><span>Продажи картой</span><b>{{ money(Number(d.shift.cardSalesMinor)) }}</b></div>
        <div><span>Возвраты</span><b>{{ money(Number(d.shift.refundsMinor)) }}</b></div>
        <div><span>Итого выручка</span><b>{{ money(Number(d.shift.totalSalesMinor)) }}</b></div>
        <div class="hl"><span>Ожидается в кассе</span><b>{{ money(Number(d.shift.expectedCashMinor ?? d.report.expectedCashMinor)) }}</b></div>
        <div v-if="d.shift.countedCashMinor != null"><span>Фактически в кассе</span><b>{{ money(Number(d.shift.countedCashMinor)) }}</b></div>
        <div v-if="d.shift.cashVarianceMinor != null" class="hl" :class="varClass(d.shift)"><span>Расхождение</span><b>{{ money(Number(d.shift.cashVarianceMinor)) }}</b></div>
      </div>
      <h4 style="margin:14px 0 6px">Чеки ({{ d.receipts.length }})</h4>
      <table v-if="d.receipts.length"><thead><tr><th>№</th><th>Тип</th><th>Оплата</th><th class="num">Сумма</th><th>Время</th></tr></thead>
        <tbody><tr v-for="r in d.receipts" :key="r.id"><td>{{ r.number }}</td><td>{{ r.type === 'refund' ? 'Возврат' : 'Продажа' }}</td><td>{{ payLabel(r.paymentMethod) }}</td><td class="num">{{ money(Number(r.totalMinor)) }}</td><td>{{ dt(r.createdAt) }}</td></tr></tbody>
      </table>
      <div v-else class="muted">Чеков нет</div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const shifts = ref<any[]>([]); const status = ref('');
const d = reactive<any>({ show: false, shift: null, receipts: [], report: {} });
function payLabel(m: string) { return ({ cash: 'Наличные', card: 'Карта', mixed: 'Смешанно' } as any)[m] || m; }
function varClass(s: any) { const v = Number(s.cashVarianceMinor); return s.cashVarianceMinor == null || v === 0 ? '' : (v > 0 ? 'pos' : 'neg'); }

async function reload() {
  const qs = status.value ? `?status=${status.value}` : '';
  shifts.value = (await auth.api(`/pos/shifts${qs}`)).shifts;
}
async function openDetail(s: any) {
  const r = await auth.api(`/pos/shifts/${s.id}`);
  Object.assign(d, { show: true, shift: r.shift, receipts: r.receipts, report: r.report });
}
onMounted(reload);
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.open { background: #dcfce7; color: #166534; }
.tag.closed { background: #e2e8f0; color: #475569; }
.pos { color: var(--ok, #16a34a); }
.neg { color: var(--danger, #dc2626); }
.zrows { display: flex; flex-direction: column; gap: 6px; }
.zrows > div { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed var(--border, #e2e8f0); }
.zrows .hl { font-size: 16px; border-bottom: none; }
</style>
