<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ t('nav.suppliers') }}</h2>
      <div class="toolbar">
        <input v-model="search" :placeholder="t('sup.searchPh')" @keydown.enter="reload(1)" />
        <button v-if="canWrite" class="btn sm" @click="openAdd">{{ t('sup.addBtn') }}</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>{{ t('common.code') }}</th><th>{{ t('common.name') }}</th><th>{{ t('sup.inn') }}</th><th>{{ t('common.phone') }}</th><th>{{ t('sup.rating') }}</th><th></th></tr></thead>
        <tbody>
          <tr v-for="s in suppliers" :key="s.id">
            <td><small>{{ s.code }}</small></td><td>{{ s.name }}</td><td>{{ fmtInn(s.inn) || '—' }}</td><td>{{ s.phone || '—' }}</td>
            <td>{{ '★'.repeat(s.rating) }}<span style="color:#e2e8f0">{{ '★'.repeat(5 - s.rating) }}</span></td>
            <td><button v-if="canWrite" class="btn ghost sm" @click="openEdit(s)">{{ t('common.edit') }}</button></td>
          </tr>
          <tr v-if="!suppliers.length"><td colspan="6" class="empty">{{ t('sup.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">{{ t('common.total') }}: {{ meta.total }} · {{ t('common.page') }} {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← {{ t('common.back') }}</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">{{ t('common.next') }} →</button>
    </div>
  </div>

  <Modal v-if="m.show" half :title="m.id ? 'Изменить поставщика' : 'Новый поставщик'" submit-label="Сохранить" @close="m.show = false" @submit="submit">
    <div class="row2">
      <div><label>Код</label><input v-model="m.code" :disabled="!!m.id" /></div>
      <div><label>Внутр. рейтинг (0–5)</label><input v-model.number="m.rating" type="number" min="0" max="5" /></div>
    </div>
    <label>Название</label><input v-model="m.name" />

    <div class="row2">
      <div>
        <label>ИНН <small class="muted">(9 цифр)</small></label>
        <div class="with-btn">
          <input :value="m.inn" inputmode="numeric" maxlength="11" placeholder="123 456 789" @input="onInn(($event.target as HTMLInputElement).value)" />
          <button v-if="innDigits.length === 9" type="button" class="btn soft sm" :disabled="lookupBusy" @click="doLookup(true)">{{ lookupBusy ? '…' : '↓ Реестр' }}</button>
          <a v-if="innDigits.length === 9" class="btn ghost sm" :href="`https://ihamkor.uz/ru/search?q=${innDigits}`" target="_blank" rel="noopener" title="Открыть карточку налогоплательщика на ihamkor.uz">ihamkor ↗</a>
        </div>
      </div>
      <div><label>МФО <small class="muted">(5 цифр)</small></label><input :value="m.mfo" inputmode="numeric" maxlength="5" placeholder="00014" @input="m.mfo = maskMfo(($event.target as HTMLInputElement).value)" /></div>
    </div>

    <div v-if="reg.loaded" class="reg">
      <div class="reg-head">Данные из реестра (orginfo.uz)</div>
      <div class="row2">
        <div><label>Юр. название</label><input :value="reg.legalName" readonly class="ro" /></div>
        <div><label>Статус</label><input :value="reg.statusLabel" readonly class="ro" /></div>
      </div>
      <div class="row2">
        <div><label>Дата регистрации</label><input :value="reg.foundingDate || '—'" readonly class="ro" /></div>
        <div><label>Источник</label><input value="orginfo.uz" readonly class="ro" /></div>
      </div>
    </div>

    <label>Рейтинг налогоплательщика <small class="muted">(с ihamkor.uz)</small></label>
    <input v-model="m.taxRating" readonly placeholder="— проверьте на ihamkor.uz —" class="ro" />

    <div class="row2">
      <div><label>Телефон</label><input :value="m.phone" inputmode="tel" maxlength="17" placeholder="+998 90 123 45 67" @input="m.phone = maskPhone(($event.target as HTMLInputElement).value)" /></div>
      <div>
        <label>Email</label>
        <div class="email-wrap">
          <input :value="m.email" placeholder="имя" spellcheck="false" autocomplete="off" @input="m.email = ($event.target as HTMLInputElement).value" @keydown="emailKey" />
          <div class="email-ghost" aria-hidden="true"><span class="typed">{{ m.email }}</span><span class="suf">{{ emailSuffix }}</span></div>
        </div>
        <div v-if="emailSuffix" class="hint sm">Tab — подставить <b>{{ emailSuffix }}</b>, или напишите <b>@</b> для своего домена</div>
      </div>
    </div>

    <label>Адрес</label><input v-model="m.address" />
    <div class="row2">
      <div><label>Банк</label><input v-model="m.bank" /></div>
      <div>
        <label>Расчётный счёт <small class="muted">(20 цифр)</small></label>
        <input :value="m.account" inputmode="numeric" maxlength="24" placeholder="AAAAA BBB K GGGG DDDDDDD" @input="m.account = maskAccount(($event.target as HTMLInputElement).value)" />
        <div class="hint sm">Структура: балансовый(5) · валюта(3) · контроль(1) · МФО банка(4) · клиент(7)</div>
      </div>
    </div>
    <label>Заметки</label><input v-model="m.notes" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const suppliers = ref<any[]>([]); const meta = ref<any>(null); const search = ref(''); const page = ref(1);
const canWrite = computed(() => auth.can('procurement.write'));
const m = reactive<any>({ show: false, id: '', code: '', name: '', inn: '', mfo: '', phone: '', email: '', address: '', bank: '', account: '', notes: '', rating: 0, taxRating: '' });

// ---- input masks ----
const digits = (v: string) => String(v || '').replace(/\D/g, '');
function group(d: string, sizes: number[]) {
  const parts: string[] = []; let i = 0;
  for (const s of sizes) { if (i >= d.length) break; parts.push(d.slice(i, i + s)); i += s; }
  if (i < d.length) parts.push(d.slice(i));
  return parts.join(' ');
}
const maskInn = (v: string) => group(digits(v).slice(0, 9), [3, 3, 3]);       // 123 456 789
const maskMfo = (v: string) => digits(v).slice(0, 5);                          // 00014
const maskAccount = (v: string) => group(digits(v).slice(0, 20), [5, 3, 1, 4, 7]); // AAAAA BBB K GGGG DDDDDDD
const fmtInn = (v: string) => (v ? maskInn(v) : '');
function maskPhone(v: string) {
  let d = digits(v);
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(0, 9);
  if (!d) return '';
  return '+998 ' + group(d, [2, 3, 2, 2]);
}
const innDigits = computed(() => digits(m.inn));

// ---- email ghost suffix ----
const emailSuffix = computed(() => (m.email && !m.email.includes('@') ? '@gmail.com' : ''));
function emailKey(e: KeyboardEvent) {
  if ((e.key === 'Tab' || e.key === 'Enter') && emailSuffix.value) {
    e.preventDefault();
    m.email = m.email + emailSuffix.value;
  }
}

// ---- orginfo.uz auto-fill by INN ----
const lookupBusy = ref(false);
const lookupInn = ref('');
const reg = reactive<any>({ loaded: false, legalName: '', statusLabel: '', foundingDate: '' });
function onInn(v: string) {
  m.inn = maskInn(v);
  if (innDigits.value.length === 9 && lookupInn.value !== innDigits.value) doLookup(false);
}
async function doLookup(manual: boolean) {
  const inn = innDigits.value;
  if (inn.length !== 9) return;
  lookupInn.value = inn;
  lookupBusy.value = true;
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
      reg.statusLabel = d.status === 'Active' ? 'Действует' : d.status === 'Inactive' ? 'Не действует' : (d.status || '—');
      reg.foundingDate = d.foundingDate || '';
      toast('Данные подтянуты с orginfo.uz');
    } else if (manual) { toast('Компания не найдена в реестре', true); }
  } catch { if (manual) toast('Не удалось получить данные из реестра', true); }
  finally { lookupBusy.value = false; }
}

async function reload(p = 1) {
  page.value = p;
  const r = await auth.api(`/procurement/suppliers?page=${p}&pageSize=25${search.value ? '&search=' + encodeURIComponent(search.value) : ''}`);
  suppliers.value = r.suppliers; meta.value = r.meta;
}
function resetReg() { reg.loaded = false; reg.legalName = ''; reg.statusLabel = ''; reg.foundingDate = ''; lookupInn.value = ''; }
function openAdd() { resetReg(); Object.assign(m, { show: true, id: '', code: '', name: '', inn: '', mfo: '', phone: '', email: '', address: '', bank: '', account: '', notes: '', rating: 0, taxRating: '' }); }
function openEdit(s: any) {
  resetReg();
  Object.assign(m, { ...s, show: true, inn: maskInn(s.inn || ''), mfo: maskMfo(s.mfo || ''), account: maskAccount(s.account || ''), phone: s.phone || '', taxRating: '' });
}
async function submit() {
  const innD = digits(m.inn), mfoD = digits(m.mfo), accD = digits(m.account);
  if (innD && innD.length !== 9) { toast('ИНН должен содержать 9 цифр', true); return; }
  if (mfoD && mfoD.length !== 5) { toast('МФО должен содержать 5 цифр', true); return; }
  if (accD && accD.length !== 20) { toast('Расчётный счёт должен содержать ровно 20 цифр', true); return; }
  if (m.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)) { toast('Некорректный email', true); return; }
  try {
    const body: any = { name: m.name, inn: innD || undefined, mfo: mfoD || undefined, phone: m.phone || undefined, email: m.email || undefined, address: m.address || undefined, bank: m.bank || undefined, account: accD || undefined, notes: m.notes || undefined, rating: Number(m.rating) || 0 };
    if (m.id) await auth.api(`/procurement/suppliers/${m.id}`, { method: 'PATCH', body });
    else await auth.api('/procurement/suppliers', { method: 'POST', body: { ...body, code: m.code } });
    m.show = false; toast('Сохранено'); await reload(page.value);
  } catch (e: any) { toast(e.message, true); }
}
onMounted(() => reload(1));
</script>

<style scoped>
.ro { background: #f8fafc; color: var(--muted, #64748b); cursor: not-allowed; }
.with-btn { display: flex; gap: 8px; align-items: stretch; }
.with-btn input { flex: 1; }
.with-btn .btn { white-space: nowrap; align-self: center; }
.hint.sm { font-size: 12px; color: var(--muted, #94a3b8); margin-top: 4px; }
.email-wrap { position: relative; }
.email-wrap input { position: relative; background: transparent; width: 100%; }
.email-ghost { position: absolute; inset: 0; padding: 10px 12px; font: inherit; white-space: pre; pointer-events: none; display: flex; align-items: center; }
.email-ghost .typed { visibility: hidden; }
.email-ghost .suf { color: #94a3b8; }
.reg { margin: 6px 0 4px; padding: 10px 12px; border: 1px dashed var(--line, #e2e8f0); border-radius: 10px; background: #f8fafc; }
.reg-head { font-size: 12px; font-weight: 600; color: var(--muted, #64748b); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
</style>
