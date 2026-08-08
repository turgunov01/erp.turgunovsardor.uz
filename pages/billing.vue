<template>
  <div>
    <div class="panel">
      <div class="panel-head"><h2>Текущая подписка</h2><span class="tag" :class="statusTag.cls">{{ statusTag.label }}</span></div>
      <div v-if="sub" class="panel-body" style="padding:18px">
        <div>Тариф: <b>{{ sub.planName }}</b>
          <template v-if="sub.trialDaysLeft != null"> · пробный период: <b>{{ sub.trialDaysLeft }}</b> дн.</template>
          <template v-if="sub.currentPeriodEnd"> · оплачено до {{ new Date(sub.currentPeriodEnd).toLocaleDateString('ru-RU') }}</template>
        </div>
        <table style="margin-top:14px;max-width:420px">
          <thead><tr><th>Ресурс</th><th class="num">Исп.</th><th class="num">Лимит</th></tr></thead>
          <tbody>
            <tr><td>Пользователи</td><td class="num">{{ sub.usage.users }}</td><td class="num">{{ lim(sub.limits.maxUsers) }}</td></tr>
            <tr><td>Склады</td><td class="num">{{ sub.usage.warehouses }}</td><td class="num">{{ lim(sub.limits.maxWarehouses) }}</td></tr>
            <tr><td>Товары</td><td class="num">{{ sub.usage.products }}</td><td class="num">{{ lim(sub.limits.maxProducts) }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Тарифы</h2></div>
      <div class="panel-body" style="padding:18px">
        <div class="plans">
          <div v-for="p in plans" :key="p.key" class="plan" :class="{ featured: p.highlight }">
            <h3>{{ p.name }}</h3>
            <div class="price">{{ priceLabel(p) }}</div>
            <ul style="list-style:none;text-align:left;margin:12px 0;color:#64748b;font-size:14px">
              <li>Пользователей: {{ lim(p.maxUsers) }}</li><li>Складов: {{ lim(p.maxWarehouses) }}</li><li>Товаров: {{ lim(p.maxProducts) }}</li>
            </ul>
            <button v-if="sub && sub.plan === p.key" class="btn ghost sm" disabled>Текущий</button>
            <button v-else-if="canBuy(p)" class="btn sm" @click="startSubscribe(p.key)">Оформить</button>
            <button v-else class="btn ghost sm" disabled>—</button>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Реквизиты для оплаты (продавец)</h2></div>
      <div class="panel-body" style="padding:18px">
        <table style="max-width:640px"><tbody>
          <tr><td style="color:#64748b;width:200px">Наименование</td><td><b>{{ req.sellerName || '—' }}</b></td></tr>
          <tr><td style="color:#64748b">ИНН</td><td>{{ req.sellerInn || '—' }}</td></tr>
          <tr><td style="color:#64748b">Банк</td><td>{{ req.bank || '—' }}</td></tr>
          <tr><td style="color:#64748b">Расчётный счёт</td><td>{{ req.account || '—' }}</td></tr>
          <tr><td style="color:#64748b">МФО</td><td>{{ req.mfo || '—' }}</td></tr>
        </tbody></table>
        <div style="color:#64748b;font-size:13px;margin-top:8px">Оплата по реквизитам — официально, банковским переводом. Доступ активируется после подтверждения оплаты.</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Платёжные реквизиты вашей компании</h2>
        <span class="tag" :class="detailsOk ? 'in' : 'out'">{{ detailsOk ? 'Заполнены' : 'Заполните для счёта' }}</span></div>
      <div class="panel-body" style="padding:18px">
        <button class="btn sm" @click="openDetails">Редактировать реквизиты</button>
        <span style="color:#64748b;font-size:13px;margin-left:10px">{{ details.legalName || 'Юр. название и ИНН нужны для официального счёта' }}</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Счета</h2></div>
      <div class="panel-body">
        <table>
          <thead><tr><th>№</th><th>Дата</th><th>Тариф</th><th>Способ</th><th class="num">Сумма</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            <tr v-for="i in invoices" :key="i.id">
              <td><small>{{ i.number }}</small></td><td>{{ dt(i.createdAt) }}</td><td>{{ i.plan }}</td>
              <td>{{ i.method === 'bank_transfer' ? 'Реквизиты' : 'Карта' }}</td>
              <td class="num">{{ money(i.amountMinor, i.currency) }}</td>
              <td><span class="tag" :class="i.status === 'paid' ? 'in' : 'muted'">{{ i.status === 'paid' ? 'Оплачён' : 'Ожидает' }}</span></td>
              <td><button v-if="i.method === 'bank_transfer'" class="btn ghost sm" @click="openDoc(i.id)">Открыть счёт</button></td>
            </tr>
            <tr v-if="!invoices.length"><td colspan="7" class="empty">Счетов пока нет</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="sm.show" title="Оформление тарифа" submit-label="Далее" @close="sm.show = false" @submit="submitSubscribe">
      <div>Тариф: <b>{{ smPlan?.name || sm.plan }}</b></div>

      <label style="margin-top:12px">Период оплаты</label>
      <div class="cycle">
        <button type="button" :class="{ on: sm.cycle === 'monthly' }" @click="sm.cycle = 'monthly'">Помесячно</button>
        <button type="button" :class="{ on: sm.cycle === 'annual' }" @click="sm.cycle = 'annual'">На год <span class="save">−2 месяца</span></button>
      </div>

      <template v-if="smPlan?.perUserMinor">
        <label style="margin-top:12px">Доп. пользователи <small class="muted">(+{{ money(smPlan.perUserMinor, smPlan.currency) }}/мес за каждого сверх {{ smPlan.maxUsers }})</small></label>
        <input v-model.number="sm.seats" type="number" min="0" max="500" />
      </template>

      <label style="margin-top:12px">Способ оплаты</label>
      <select v-model="sm.method">
        <option value="bank_transfer">По реквизитам — счёт, банковский перевод (официально)</option>
        <option value="card">Картой онлайн</option>
      </select>

      <div class="total">Итого: <b>{{ money(smTotal, smPlan?.currency) }}</b> <span class="muted">/ {{ sm.cycle === 'annual' ? 'год' : 'мес' }}</span></div>
      <div class="hint" style="text-align:left;margin-top:10px">«По реквизитам» — выставим официальный счёт; доступ после подтверждения оплаты. «Картой» — сейчас тестовый режим.</div>
    </Modal>

    <Modal v-if="pm.show" title="Оплата картой (тест)" submit-label="Оплатить" @close="pm.show = false" @submit="submitPay">
      <div class="hint" style="text-align:left;margin:0 0 10px">Тестовая оплата — реальные деньги не списываются.</div>
      <div>К оплате: <b>{{ money(pm.amount) }}</b></div>
      <label style="margin-top:12px">Провайдер</label>
      <select v-model="pm.method"><option value="card">Тестовая карта</option><option value="payme">Payme (скоро)</option><option value="click">Click (скоро)</option></select>
    </Modal>

    <Modal v-if="dm.show" title="Реквизиты компании (для счёта)" submit-label="Сохранить" @close="dm.show = false" @submit="submitDetails">
      <label>Юридическое название</label><input v-model="dm.legalName" />
      <div class="row2"><div><label>ИНН</label><input v-model="dm.inn" /></div><div><label>МФО</label><input v-model="dm.mfo" /></div></div>
      <label>Адрес</label><input v-model="dm.address" />
      <label>Банк</label><input v-model="dm.bank" />
      <label>Расчётный счёт</label><input v-model="dm.account" />
      <div class="row2"><div><label>Директор</label><input v-model="dm.director" /></div><div><label>Телефон</label><input v-model="dm.phone" /></div></div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const cfg = useRuntimeConfig();

const sub = ref<any>(null); const plans = ref<any[]>([]); const invoices = ref<any[]>([]); const req = ref<any>({}); const details = ref<any>({});
const sm = reactive({ show: false, plan: '', method: 'bank_transfer', cycle: 'monthly', seats: 0 });
const pm = reactive({ show: false, invoiceId: '', amount: 0, method: 'card' });
const dm = reactive({ show: false, legalName: '', inn: '', mfo: '', address: '', bank: '', account: '', director: '', phone: '' });

const detailsOk = computed(() => details.value.legalName && details.value.inn);
const statusTag = computed(() => {
  const m: any = { trialing: { cls: 'adjust', label: 'Пробный' }, active: { cls: 'in', label: 'Активна' }, past_due: { cls: 'out', label: 'Не оплачена' }, cancelled: { cls: 'out', label: 'Отменена' } };
  return m[sub.value?.status] || { cls: 'muted', label: sub.value?.status || '' };
});
const lim = (v: number | null) => v === null ? '∞' : v;
const priceLabel = (p: any) => p.priceMinor === null ? 'по запросу' : (p.priceMinor === 0 ? 'бесплатно' : money(p.priceMinor, p.currency) + '/мес');
const PAID = ['starter', 'business', 'production'];
const canBuy = (p: any) => auth.can('tenant.manage') && PAID.includes(p.key);
// Live total for the subscribe modal: (base + seats×perUser) × (10 if annual, else 1).
const smPlan = computed(() => plans.value.find((p) => p.key === sm.plan) || null);
const smTotal = computed(() => {
  const p = smPlan.value; if (!p) return 0;
  const monthly = (p.priceMinor || 0) + (Number(sm.seats) || 0) * (p.perUserMinor || 0);
  return monthly * (sm.cycle === 'annual' ? 10 : 1);
});

async function load() {
  const [s, pl, inv, rq, det] = await Promise.all([
    auth.api('/billing/subscription'), auth.api('/billing/plans'), auth.api('/billing/invoices'),
    auth.api('/billing/requisites'), auth.api('/billing/details'),
  ]);
  sub.value = s; plans.value = (pl as any).plans; invoices.value = (inv as any).invoices; req.value = (rq as any).requisites; details.value = (det as any).details;
  auth.subscription = s;
}
function startSubscribe(plan: string) { sm.plan = plan; sm.method = 'bank_transfer'; sm.cycle = 'monthly'; sm.seats = 0; sm.show = true; }
async function submitSubscribe() {
  try {
    const { invoice } = await auth.api<any>('/billing/subscribe', { method: 'POST', body: { plan: sm.plan, method: sm.method, cycle: sm.cycle, seats: Number(sm.seats) || 0 } });
    sm.show = false;
    if (sm.method === 'bank_transfer') { toast('Счёт создан'); await load(); setTimeout(() => openDoc(invoice.id), 100); }
    else { pm.invoiceId = invoice.id; pm.amount = invoice.amountMinor; pm.method = 'card'; pm.show = true; }
  } catch (e: any) { toast(e.message, true); }
}
async function submitPay() {
  try { await auth.api('/billing/pay', { method: 'POST', body: { invoiceId: pm.invoiceId, method: pm.method } }); pm.show = false; toast('Оплата прошла — подписка активна'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
function openDetails() { Object.assign(dm, { show: true, ...details.value }); }
async function submitDetails() {
  try {
    await auth.api('/billing/details', { method: 'PATCH', body: { legalName: dm.legalName || null, inn: dm.inn || null, mfo: dm.mfo || null, address: dm.address || null, bank: dm.bank || null, account: dm.account || null, director: dm.director || null, phone: dm.phone || null } });
    dm.show = false; toast('Реквизиты сохранены'); await load();
  } catch (e: any) { toast(e.message, true); }
}
async function openDoc(id: string) {
  try {
    const res = await fetch(`${cfg.public.apiBase}/billing/invoices/${id}/document`, { headers: { Authorization: 'Bearer ' + auth.access } });
    if (!res.ok) { toast('Не удалось открыть счёт', true); return; }
    const html = await res.text();
    const w = window.open('', '_blank');
    if (!w) { toast('Разрешите всплывающие окна', true); return; }
    w.document.open(); w.document.write(html); w.document.close();
  } catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>

<style scoped>
.cycle { display: flex; gap: 8px; }
.cycle button { flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; cursor: pointer; font-size: 14px; font-weight: 600; color: #475569; }
.cycle button.on { border-color: #2563eb; background: #eff6ff; color: #1e40af; }
.cycle .save { display: inline-block; margin-left: 6px; font-size: 11px; color: #16a34a; font-weight: 700; }
.total { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 16px; }
.total b { font-size: 20px; }
</style>
