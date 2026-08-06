<template>
  <div>
    <div class="hello">
      <h1>Здравствуйте, {{ portal.customer.value?.name }}</h1>
      <p class="muted" v-if="me">{{ me.company.name }} · ваш кабинет заказчика</p>
    </div>

    <div class="cards" v-if="sum">
      <div class="c"><div class="l">Всего заказов</div><div class="v">{{ sum.orders }}</div></div>
      <div class="c"><div class="l">Отгружено</div><div class="v">{{ sum.ordersByStatus.shipped || 0 }}</div></div>
      <div class="c"><div class="l">В работе</div><div class="v">{{ (sum.ordersByStatus.confirmed || 0) + (sum.ordersByStatus.partially_shipped || 0) }}</div></div>
      <div class="c"><div class="l">Предложений</div><div class="v">{{ sum.quotations }}</div></div>
    </div>

    <section class="panel">
      <h2>Мои заказы</h2>
      <table v-if="orders.length">
        <thead><tr><th>№</th><th>Дата</th><th class="num">Позиций</th><th class="num">Сумма</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td>{{ o.number }}</td>
            <td>{{ fmtDate(o.createdAt) }}</td>
            <td class="num">{{ o.itemCount }}</td>
            <td class="num">{{ money(o.totalMinor) }}</td>
            <td><span class="tag" :class="o.status">{{ statusLabel(o.status) }}</span></td>
            <td><button class="link" @click="openOrder(o)">Подробнее</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Заказов пока нет.</p>
    </section>

    <section class="panel">
      <h2>Коммерческие предложения</h2>
      <table v-if="quotations.length">
        <thead><tr><th>№</th><th>Дата</th><th class="num">Сумма</th><th>Действует до</th><th>Статус</th></tr></thead>
        <tbody>
          <tr v-for="q in quotations" :key="q.id">
            <td>{{ q.number }}</td>
            <td>{{ fmtDate(q.createdAt) }}</td>
            <td class="num">{{ money(q.totalMinor) }}</td>
            <td>{{ q.validUntil ? fmtDate(q.validUntil) : '—' }}</td>
            <td><span class="tag" :class="q.status">{{ qStatusLabel(q.status) }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Предложений пока нет.</p>
    </section>

    <div v-if="detail" class="modal-bg" @click.self="detail = null">
      <div class="modal">
        <h3>Заказ {{ detail.number }} <span class="tag" :class="detail.status">{{ statusLabel(detail.status) }}</span></h3>
        <table>
          <thead><tr><th>Товар</th><th class="num">Кол-во</th><th class="num">Цена</th><th class="num">Отгружено</th><th class="num">Сумма</th></tr></thead>
          <tbody>
            <tr v-for="(it, i) in detail.items" :key="i">
              <td>{{ it.productName }}</td>
              <td class="num">{{ it.quantity }}</td>
              <td class="num">{{ money(it.priceMinor) }}</td>
              <td class="num">{{ it.shippedQty }}</td>
              <td class="num">{{ money(it.lineMinor) }}</td>
            </tr>
          </tbody>
          <tfoot><tr><td colspan="4"><b>Итого</b></td><td class="num"><b>{{ money(detail.totalMinor) }}</b></td></tr></tfoot>
        </table>
        <button class="btn ghost" style="margin-top:12px" @click="detail = null">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'portal' });
const portal = usePortal();
const router = useRouter();
const me = ref<any>(null); const sum = ref<any>(null);
const orders = ref<any[]>([]); const quotations = ref<any[]>([]); const detail = ref<any>(null);

const OS: Record<string, string> = { draft: 'Черновик', confirmed: 'Подтверждён', partially_shipped: 'Частично отгружен', shipped: 'Отгружен', cancelled: 'Отменён' };
const QS: Record<string, string> = { draft: 'Черновик', sent: 'Отправлено', accepted: 'Принято', rejected: 'Отклонено', ordered: 'В заказе' };
function statusLabel(s: string) { return OS[s] || s; }
function qStatusLabel(s: string) { return QS[s] || s; }

async function openOrder(o: any) { detail.value = (await portal.api(`/orders/${o.id}`)).order; }

onMounted(async () => {
  if (!portal.isAuthed.value) { router.replace('/portal/login'); return; }
  try {
    [me.value, sum.value] = await Promise.all([portal.api('/me'), portal.api('/summary')]);
    orders.value = (await portal.api('/orders')).orders;
    quotations.value = (await portal.api('/quotations')).quotations;
  } catch { router.replace('/portal/login'); }
});
</script>

<style scoped>
.hello h1 { margin: 0 0 2px; font-size: 22px; }
.muted { color: #64748b; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
@media (max-width: 640px) { .cards { grid-template-columns: 1fr 1fr; } }
.c { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
.c .l { font-size: 12px; color: #64748b; }
.c .v { font-size: 24px; font-weight: 700; margin-top: 2px; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-top: 16px; }
.panel h2 { margin: 0 0 10px; font-size: 16px; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
th.num, td.num { text-align: right; }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.shipped, .tag.accepted { background: #dcfce7; color: #166534; }
.tag.confirmed, .tag.sent, .tag.partially_shipped, .tag.ordered { background: #dbeafe; color: #1e40af; }
.tag.cancelled, .tag.rejected { background: #fee2e2; color: #991b1b; }
.link { background: none; border: none; color: #2563eb; cursor: pointer; }
.modal-bg { position: fixed; inset: 0; background: rgba(2,6,23,.4); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50; }
.modal { background: #fff; border-radius: 12px; padding: 20px; max-width: 620px; width: 100%; max-height: 90vh; overflow-y: auto; }
.btn { border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
.btn.ghost:hover { background: #f1f5f9; }
</style>
