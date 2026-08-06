<template>
  <div>
    <div class="panel">
      <div class="panel-head"><h2>Счета на подтверждение (перевод)</h2><span style="color:#64748b;font-size:13px">{{ pending.length }}</span></div>
      <div class="panel-body">
        <table>
          <thead><tr><th>№</th><th>Компания</th><th>Тариф</th><th class="num">Сумма</th><th>Didox</th><th>Действия</th></tr></thead>
          <tbody>
            <tr v-for="i in pending" :key="i.id">
              <td><small>{{ i.number }}</small></td><td>{{ i.tenant }}</td><td>{{ i.plan }}</td>
              <td class="num">{{ money(i.amountMinor, i.currency) }}</td>
              <td><span v-if="i.didoxId">{{ i.didoxId }}</span><span v-else class="tag muted">нет</span></td>
              <td><button class="btn green sm" @click="markPaid(i.id)">Подтвердить оплату</button>
                <button class="btn ghost sm" @click="didox(i.id)">Didox ЭСФ</button></td>
            </tr>
            <tr v-if="!pending.length"><td colspan="6" class="empty">Нет счетов, ожидающих оплаты</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Реквизиты продавца</h2><span class="tag" :class="didoxConfigured ? 'in' : 'muted'">{{ didoxConfigured ? 'Didox подключён' : 'Didox не настроен' }}</span></div>
      <div class="panel-body" style="padding:18px">
        <button class="btn sm" @click="openReq">Редактировать реквизиты</button>
        <span style="color:#64748b;font-size:13px;margin-left:10px">{{ req.sellerName }} · ИНН {{ req.sellerInn || '—' }} · счёт {{ req.account || '—' }}</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Все компании (SaaS)</h2><span style="color:#64748b;font-size:13px">{{ tenants.length }} тенантов</span></div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Компания</th><th>Тариф</th><th>Подписка</th><th>Статус</th><th class="num">Польз.</th><th class="num">Товары</th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in tenants" :key="t.id">
              <td>{{ t.name }}<br><small style="color:#94a3b8">{{ t.slug }}</small></td><td>{{ t.plan }}</td>
              <td><span class="tag" :class="subCls(t.subscriptionStatus)">{{ t.subscriptionStatus }}</span></td>
              <td>{{ t.status }}</td><td class="num">{{ t.users }}</td><td class="num">{{ t.products }}</td>
              <td><button class="btn ghost sm" @click="openManage(t)">Управлять</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="mg.show" :title="`Управление: ${mg.name}`" submit-label="Сохранить" @close="mg.show = false" @submit="submitManage">
      <label>Статус компании</label>
      <select v-model="mg.status"><option value="active">active</option><option value="suspended">suspended</option><option value="cancelled">cancelled</option></select>
      <label>Тариф</label>
      <select v-model="mg.plan"><option value="trial">trial</option><option value="starter">starter</option><option value="business">business</option><option value="enterprise">enterprise</option></select>
      <label>Продлить пробный период (дней)</label><input v-model.number="mg.ext" type="number" min="0" />
    </Modal>

    <Modal v-if="rm.show" title="Реквизиты продавца (на счетах)" submit-label="Сохранить" @close="rm.show = false" @submit="submitReq">
      <label>Наименование</label><input v-model="rm.sellerName" />
      <div class="row2"><div><label>ИНН</label><input v-model="rm.sellerInn" /></div><div><label>МФО</label><input v-model="rm.mfo" /></div></div>
      <label>Адрес</label><input v-model="rm.address" />
      <label>Банк</label><input v-model="rm.bank" />
      <label>Расчётный счёт</label><input v-model="rm.account" />
      <div class="row2"><div><label>Директор</label><input v-model="rm.director" /></div><div><label>НДС %</label><input v-model.number="rm.vatPercent" type="number" min="0" max="100" /></div></div>
      <div class="row2"><div><label>Телефон</label><input v-model="rm.phone" /></div><div><label>Email</label><input v-model="rm.email" /></div></div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const tenants = ref<any[]>([]); const pending = ref<any[]>([]); const req = ref<any>({}); const didoxConfigured = ref(false);
const mg = reactive({ show: false, id: '', name: '', status: 'active', plan: 'trial', ext: 0 });
const rm = reactive<any>({ show: false, sellerName: '', sellerInn: '', mfo: '', address: '', bank: '', account: '', director: '', vatPercent: 0, phone: '', email: '' });

const subCls = (s: string) => s === 'active' ? 'in' : s === 'trialing' ? 'adjust' : 'out';

async function load() {
  const [t, rq, inv] = await Promise.all([auth.api('/superadmin/tenants'), auth.api('/superadmin/requisites'), auth.api('/superadmin/invoices?status=open')]);
  tenants.value = (t as any).tenants; req.value = (rq as any).requisites; didoxConfigured.value = (rq as any).didoxConfigured;
  pending.value = (inv as any).invoices.filter((i: any) => i.method === 'bank_transfer');
}
async function markPaid(id: string) { try { await auth.api(`/superadmin/invoices/${id}/mark-paid`, { method: 'POST' }); toast('Оплата подтверждена — подписка активна'); await load(); } catch (e: any) { toast(e.message, true); } }
async function didox(id: string) { try { const r = await auth.api<any>(`/superadmin/invoices/${id}/didox`, { method: 'POST' }); toast('ЭСФ создана: ' + r.didoxId); await load(); } catch (e: any) { toast(e.message, true); } }
function openManage(t: any) { Object.assign(mg, { show: true, id: t.id, name: t.name, status: t.status, plan: t.plan, ext: 0 }); }
async function submitManage() {
  try {
    const body: any = { status: mg.status, plan: mg.plan }; if (mg.ext > 0) body.extendTrialDays = mg.ext;
    await auth.api(`/superadmin/tenants/${mg.id}`, { method: 'PATCH', body }); mg.show = false; toast('Компания обновлена'); await load();
  } catch (e: any) { toast(e.message, true); }
}
function openReq() { Object.assign(rm, { show: true, ...req.value }); }
async function submitReq() {
  try {
    await auth.api('/superadmin/requisites', { method: 'PATCH', body: { sellerName: rm.sellerName, sellerInn: rm.sellerInn, mfo: rm.mfo, address: rm.address, bank: rm.bank, account: rm.account, director: rm.director, phone: rm.phone, email: rm.email, vatPercent: Number(rm.vatPercent) || 0 } });
    rm.show = false; toast('Реквизиты продавца сохранены'); await load();
  } catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>
