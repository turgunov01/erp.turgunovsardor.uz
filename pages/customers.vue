<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ t('nav.customers') }}</h2>
      <div class="toolbar">
        <input v-model="search" :placeholder="t('cust.searchPh')" @keydown.enter="reload(1)" />
        <button v-if="canWrite" class="btn sm" @click="openAdd">{{ t('cust.addBtn') }}</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>{{ t('common.code') }}</th><th>{{ t('common.name') }}</th><th>{{ t('cust.inn') }}</th><th>{{ t('common.phone') }}</th><th class="num">{{ t('cust.creditLimit') }}</th><th>{{ t('cust.contacts') }}</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in customers" :key="c.id">
            <td><small>{{ c.code }}</small></td><td>{{ c.name }}</td><td>{{ c.inn || '—' }}</td><td>{{ c.phone || '—' }}</td>
            <td class="num">{{ c.creditLimitMinor ? money(c.creditLimitMinor) : '—' }}</td>
            <td>{{ c.contacts?.length || 0 }}</td>
            <td class="row-actions">
              <button v-if="canWrite" class="btn ghost sm" @click="openEdit(c)">{{ t('common.edit') }}</button>
              <button v-if="canWrite" class="btn ghost sm" @click="openPortal(c)">{{ t('cust.portal') }}</button>
            </td>
          </tr>
          <tr v-if="!customers.length"><td colspan="7" class="empty">{{ t('cust.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">{{ t('common.total') }}: {{ meta.total }} · {{ t('common.page') }} {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← {{ t('common.back') }}</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">{{ t('common.next') }} →</button>
    </div>
  </div>

  <Modal v-if="m.show" half :title="m.id ? 'Изменить клиента' : 'Новый клиент'" submit-label="Сохранить" @close="m.show = false" @submit="submit">
    <div class="row2"><div><label>Код</label><input v-model="m.code" :disabled="!!m.id" /></div><div><label>Рейтинг (0–5)</label><input v-model.number="m.rating" type="number" min="0" max="5" /></div></div>
    <label>Название</label><input v-model="m.name" />
    <div class="row2">
      <div>
        <label>ИНН <small class="muted">(9 цифр)</small></label>
        <div class="with-btn">
          <input :value="m.inn" inputmode="numeric" maxlength="11" placeholder="123 456 789" @input="onInn(($event.target as HTMLInputElement).value)" />
          <button v-if="innDigits.length === 9" type="button" class="btn soft sm" :disabled="lookupBusy" @click="doLookup(true)">{{ lookupBusy ? '…' : '↓ Реестр' }}</button>
        </div>
      </div>
      <div><label>МФО <small class="muted">(5 цифр)</small></label><input :value="m.mfo" inputmode="numeric" maxlength="5" placeholder="00014" @input="m.mfo = maskMfo(($event.target as HTMLInputElement).value)" /></div>
    </div>

    <div v-if="reg.loaded" class="reg">
      <div class="reg-head">Данные из реестра (orginfo.uz)</div>
      <div class="row2">
        <div><label>Юр. название</label><input :value="reg.legalName || '—'" readonly class="ro" /></div>
        <div><label>Статус</label><input :value="reg.statusLabel || '—'" readonly class="ro" /></div>
      </div>
      <div class="row2">
        <div><label>Дата регистрации</label><input :value="reg.foundingDate || '—'" readonly class="ro" /></div>
        <div><label>Уставный фонд</label><input :value="reg.charterCapital || '—'" readonly class="ro" /></div>
      </div>
      <label>Вид деятельности (ОКЭД)</label><input :value="reg.oked || '—'" readonly class="ro" />
    </div>

    <div class="row2">
      <div><label>Телефон</label><input :value="m.phone" inputmode="tel" maxlength="17" placeholder="+998 90 123 45 67" @input="m.phone = maskPhone(($event.target as HTMLInputElement).value)" /></div>
      <div>
        <label>Email</label>
        <div class="email-wrap">
          <input :value="m.email" placeholder="имя" spellcheck="false" autocomplete="off" @input="m.email = ($event.target as HTMLInputElement).value" @keydown="emailKey" />
          <div class="email-ghost" aria-hidden="true"><span class="typed">{{ m.email }}</span><span class="suf">{{ emailSuffix }}</span></div>
        </div>
      </div>
    </div>
    <label>Адрес</label><input v-model="m.address" />
    <div class="row2"><div><label>Банк</label><input v-model="m.bank" /></div><div><label>Расчётный счёт <small class="muted">(20 цифр)</small></label><input :value="m.account" inputmode="numeric" maxlength="24" placeholder="AAAAA BBB K GGGG DDDDDDD" @input="m.account = maskAccount(($event.target as HTMLInputElement).value)" /></div></div>
    <label>Кредитный лимит (сум)</label><input v-model.number="m.creditLimit" type="number" min="0" />
    <label>Заметки</label><input v-model="m.notes" />

    <template v-if="m.id">
      <label style="margin-top:12px">Контакты</label>
      <div v-for="ct in m.contacts" :key="ct.id" class="row-line">
        <span style="flex:1">{{ ct.name }}<small v-if="ct.role"> · {{ ct.role }}</small><small v-if="ct.phone"> · {{ ct.phone }}</small></span>
        <button type="button" class="btn ghost sm" @click="delContact(ct.id)">✕</button>
      </div>
      <div class="row-line">
        <input v-model="nc.name" placeholder="Имя" style="flex:1" />
        <input v-model="nc.role" placeholder="Должность" style="max-width:120px" />
        <input v-model="nc.phone" placeholder="Телефон" style="max-width:130px" />
        <button type="button" class="btn ghost sm" @click="addContact">+</button>
      </div>
    </template>
  </Modal>

  <Modal v-if="pm.show" :title="`Доступ к порталу — ${pm.customerName}`" submit-label="Сохранить доступ" @close="pm.show = false" @submit="savePortal">
    <div v-if="pm.user" class="portal-status">
      <div>Учётная запись: <b>{{ pm.user.email }}</b> <span class="tag" :class="pm.user.status">{{ pm.user.status === 'active' ? 'активна' : 'отключена' }}</span></div>
      <div class="muted" style="font-size:12px">Последний вход: {{ pm.user.lastLoginAt ? dt(pm.user.lastLoginAt) : 'ещё не входил' }}</div>
      <button type="button" class="btn ghost sm" style="margin-top:6px" @click="toggleDisable">{{ pm.user.status === 'active' ? 'Отключить доступ' : 'Включить доступ' }}</button>
    </div>
    <p v-else class="muted">У клиента ещё нет доступа к порталу. Создайте логин ниже.</p>
    <label style="margin-top:10px">Email для входа</label><input v-model="pm.email" type="email" />
    <label>{{ pm.user ? 'Новый пароль (сбросить)' : 'Пароль' }}</label><input v-model="pm.password" type="text" placeholder="минимум 6 символов" />
    <p class="muted" style="font-size:12px;margin-top:8px">Ссылка на портал: <b>/portal/login</b></p>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const customers = ref<any[]>([]); const meta = ref<any>(null); const search = ref(''); const page = ref(1);
const canWrite = computed(() => auth.can('sales.write'));
const blank = () => ({ show: false, id: '', code: '', name: '', inn: '', mfo: '', phone: '', email: '', address: '', bank: '', account: '', notes: '', rating: 0, creditLimit: 0, contacts: [] as any[] });
const m = reactive<any>(blank());
const nc = reactive<any>({ name: '', role: '', phone: '' });
const pm = reactive<any>({ show: false, customerId: '', customerName: '', user: null, email: '', password: '' });

// ---- input masks (same as suppliers) ----
const digits = (v: string) => String(v || '').replace(/\D/g, '');
function group(d: string, sizes: number[]) { const parts: string[] = []; let i = 0; for (const s of sizes) { if (i >= d.length) break; parts.push(d.slice(i, i + s)); i += s; } if (i < d.length) parts.push(d.slice(i)); return parts.join(' '); }
const maskInn = (v: string) => group(digits(v).slice(0, 9), [3, 3, 3]);
const maskMfo = (v: string) => digits(v).slice(0, 5);
const maskAccount = (v: string) => group(digits(v).slice(0, 20), [5, 3, 1, 4, 7]);
function maskPhone(v: string) { let d = digits(v); if (d.startsWith('998')) d = d.slice(3); d = d.slice(0, 9); if (!d) return ''; return '+998 ' + group(d, [2, 3, 2, 2]); }
const innDigits = computed(() => digits(m.inn));
const emailSuffix = computed(() => (m.email && !m.email.includes('@') ? '@gmail.com' : ''));
function emailKey(e: KeyboardEvent) { if ((e.key === 'Tab' || e.key === 'Enter') && emailSuffix.value) { e.preventDefault(); m.email = m.email + emailSuffix.value; } }

// ---- orginfo.uz auto-fill by INN ----
const lookupBusy = ref(false); const lookupInn = ref('');
const reg = reactive<any>({ loaded: false, legalName: '', statusLabel: '', foundingDate: '', oked: '', charterCapital: '' });
function resetReg() { Object.assign(reg, { loaded: false, legalName: '', statusLabel: '', foundingDate: '', oked: '', charterCapital: '' }); lookupInn.value = ''; }
function onInn(v: string) { m.inn = maskInn(v); if (innDigits.value.length === 9 && lookupInn.value !== innDigits.value) doLookup(false); }
async function doLookup(manual: boolean) {
  const inn = innDigits.value;
  if (inn.length !== 9) return;
  lookupInn.value = inn; lookupBusy.value = true;
  try {
    const r = await auth.api(`/procurement/suppliers/lookup?inn=${inn}`);
    if (r.found && r.data) {
      const d = r.data;
      if (d.name) m.name = d.name;
      if (d.address) m.address = d.address;
      if (d.phone) m.phone = maskPhone(d.phone);
      if (d.email) m.email = d.email;
      reg.loaded = true;
      reg.legalName = d.legalName || d.name || '';
      reg.statusLabel = d.statusText || (d.status === 'Active' ? 'Действует' : d.status === 'Inactive' ? 'Не действует' : (d.status || '—'));
      reg.foundingDate = d.foundingDate || '';
      reg.oked = d.oked || '';
      reg.charterCapital = d.charterCapital || '';
      toast('Данные подтянуты с orginfo.uz');
    } else if (manual) { toast('Компания не найдена в реестре', true); }
  } catch { if (manual) toast('Не удалось получить данные', true); }
  finally { lookupBusy.value = false; }
}

async function openPortal(c: any) {
  Object.assign(pm, { show: true, customerId: c.id, customerName: c.name, user: null, email: c.email || '', password: '' });
  try { const r = await auth.api(`/portal/admin/access/${c.id}`); pm.user = r.user; if (r.user) pm.email = r.user.email; }
  catch (e: any) { toast(e.message, true); }
}
async function savePortal() {
  try {
    if (!pm.email || !pm.password) return toast('Укажите email и пароль', true);
    await auth.api(`/portal/admin/access/${pm.customerId}`, { method: 'POST', body: { email: pm.email, password: pm.password } });
    toast('Доступ к порталу сохранён'); pm.show = false;
  } catch (e: any) { toast(e.message, true); }
}
async function toggleDisable() {
  try { const r = await auth.api(`/portal/admin/access/${pm.customerId}/disable`, { method: 'POST' }); pm.user = { ...pm.user, status: r.status }; toast('Статус обновлён'); }
  catch (e: any) { toast(e.message, true); }
}

async function reload(p = 1) {
  page.value = p;
  const r = await auth.api(`/sales/customers?page=${p}&pageSize=25${search.value ? '&search=' + encodeURIComponent(search.value) : ''}`);
  customers.value = r.customers; meta.value = r.meta;
}
function openAdd() { resetReg(); Object.assign(m, blank(), { show: true }); }
function openEdit(c: any) { resetReg(); Object.assign(m, blank(), { ...c, show: true, inn: maskInn(c.inn || ''), mfo: maskMfo(c.mfo || ''), account: maskAccount(c.account || ''), phone: c.phone || '', creditLimit: (c.creditLimitMinor || 0) / 100, contacts: c.contacts || [] }); }
async function submit() {
  const innD = digits(m.inn), mfoD = digits(m.mfo), accD = digits(m.account);
  if (innD && innD.length !== 9) { toast('ИНН должен содержать 9 цифр', true); return; }
  if (mfoD && mfoD.length !== 5) { toast('МФО должен содержать 5 цифр', true); return; }
  if (accD && accD.length !== 20) { toast('Расчётный счёт должен содержать ровно 20 цифр', true); return; }
  if (m.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)) { toast('Некорректный email', true); return; }
  try {
    const body: any = { name: m.name, inn: innD || undefined, mfo: mfoD || undefined, phone: m.phone || undefined, email: m.email || undefined, address: m.address || undefined, bank: m.bank || undefined, account: accD || undefined, notes: m.notes || undefined, rating: Number(m.rating) || 0, creditLimitMinor: Math.round((Number(m.creditLimit) || 0) * 100) };
    if (m.id) await auth.api(`/sales/customers/${m.id}`, { method: 'PATCH', body });
    else await auth.api('/sales/customers', { method: 'POST', body: { ...body, code: m.code } });
    m.show = false; toast('Сохранено'); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
async function addContact() {
  if (!nc.name) return;
  try {
    const r = await auth.api(`/sales/customers/${m.id}/contacts`, { method: 'POST', body: { name: nc.name, role: nc.role || undefined, phone: nc.phone || undefined } });
    m.contacts.push(r.contact); Object.assign(nc, { name: '', role: '', phone: '' }); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
async function delContact(cid: string) {
  try { await auth.api(`/sales/customers/${m.id}/contacts/${cid}`, { method: 'DELETE' }); m.contacts = m.contacts.filter((x: any) => x.id !== cid); await reload(page.value); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(() => reload(1));
</script>

<style scoped>
.row-line { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.row-actions { display: flex; gap: 6px; }
.portal-status { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.active { background: #dcfce7; color: #166534; }
.tag.disabled { background: #fee2e2; color: #991b1b; }
.with-btn { display: flex; gap: 8px; align-items: stretch; }
.with-btn input { flex: 1; }
.with-btn .btn { white-space: nowrap; align-self: center; }
.reg { margin: 6px 0 4px; padding: 10px 12px; border: 1px dashed var(--line, #e2e8f0); border-radius: 10px; background: #f8fafc; }
.reg-head { font-size: 12px; font-weight: 600; color: var(--muted, #64748b); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
.ro { background: #fff; color: var(--muted, #64748b); cursor: not-allowed; }
.email-wrap { position: relative; }
.email-wrap input { position: relative; background: transparent; width: 100%; }
.email-ghost { position: absolute; inset: 0; padding: 10px 12px; font: inherit; white-space: pre; pointer-events: none; display: flex; align-items: center; }
.email-ghost .typed { visibility: hidden; }
.email-ghost .suf { color: #94a3b8; }
</style>
