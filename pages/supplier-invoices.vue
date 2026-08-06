<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Счета поставщиков (3-way match)</h2>
      <div class="toolbar"><button v-if="canWrite" class="btn sm" @click="openCreate">+ Счёт</button></div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>№ счёта</th><th>Поставщик</th><th>Заказ</th><th class="num">Сумма</th><th>Match</th><th>Действия</th></tr></thead>
        <tbody>
          <tr v-for="i in invoices" :key="i.id">
            <td>{{ i.number }}</td><td>{{ i.supplier?.name }}</td><td>{{ i.po?.number || '—' }}</td>
            <td class="num">{{ money(i.amountMinor, i.currency) }}</td>
            <td><span class="tag" :class="cls(i.status)">{{ label(i.status) }}</span>
              <div v-if="i.matchNote" style="font-size:11px;color:#94a3b8;max-width:260px">{{ i.matchNote }}</div></td>
            <td>
              <button v-if="canWrite && i.poId && i.status !== 'paid'" class="btn ghost sm" @click="rematch(i.id)">Пересчитать</button>
              <button v-if="canWrite && i.status === 'matched'" class="btn green sm" @click="pay(i.id)">Оплачено</button>
            </td>
          </tr>
          <tr v-if="!invoices.length"><td colspan="6" class="empty">Счетов нет</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">Всего: {{ meta.total }} · стр. {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← Назад</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">Вперёд →</button>
    </div>
  </div>

  <Modal v-if="c.show" half title="Счёт от поставщика" submit-label="Создать + сверить" @close="c.show = false" @submit="submitCreate">
    <div class="row2">
      <div><label>Поставщик</label><select v-model="c.supplierId" @change="onSupplier"><option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option></select></div>
      <div><label>№ счёта поставщика</label><input v-model="c.number" placeholder="INV-123" /></div>
    </div>

    <div class="reg">
      <div class="reg-head">
        <span>Данные контрагента по ИНН <b v-if="selInn">{{ fmtInn(selInn) }}</b><span v-else class="muted">— не указан</span></span>
        <span v-if="selInn" class="reg-actions">
          <button type="button" class="btn soft sm" :disabled="reg.busy" @click="doReg(true)">{{ reg.busy ? '…' : '↓ Реестр' }}</button>
          <a class="btn ghost sm" :href="`https://ihamkor.uz/ru/search?q=${selInn}`" target="_blank" rel="noopener">ihamkor ↗</a>
        </span>
      </div>
      <div v-if="!selInn" class="hint">У поставщика не указан ИНН — заполните его в карточке поставщика.</div>
      <div v-else-if="reg.busy" class="hint">Загрузка данных из реестра…</div>
      <div v-else-if="reg.loaded" class="reg-grid">
        <div><label>Наименование</label><input :value="reg.d.name || '—'" readonly class="ro" /></div>
        <div><label>Юр. название</label><input :value="reg.d.legalName || '—'" readonly class="ro" /></div>
        <div class="col2"><label>Адрес</label><input :value="reg.d.address || '—'" readonly class="ro" /></div>
        <div><label>Вид деятельности (ОКЭД)</label><input :value="reg.d.oked || '—'" readonly class="ro" /></div>
        <div><label>Уставный фонд</label><input :value="reg.d.charterCapital || '—'" readonly class="ro" /></div>
        <div><label>Статус</label><input :value="reg.d.statusText || statusRu(reg.d.status) || '—'" readonly class="ro" /></div>
        <div><label>Дата регистрации</label><input :value="reg.d.foundingDate || '—'" readonly class="ro" /></div>
        <div><label>Телефон</label><input :value="reg.d.phone || '—'" readonly class="ro" /></div>
        <div><label>Email</label><input :value="reg.d.email || '—'" readonly class="ro" /></div>
      </div>
      <div v-else class="hint">Нажмите «↓ Реестр», чтобы подтянуть открытые данные (orginfo.uz).</div>
    </div>

    <label>Заказ (для 3-way match)</label>
    <select v-model="c.poId"><option value="">— без заказа —</option><option v-for="o in poOptions" :key="o.id" :value="o.id">{{ o.number }} · {{ money(o.totalMinor) }}</option></select>
    <label>Сумма счёта (в сумах)</label><input v-model.number="c.amount" type="number" min="0" step="0.01" />
    <div class="hint" style="text-align:left;margin-top:8px">Сверка: счёт сравнивается с фактически принятым по заказу (matched / расхождение).</div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const invoices = ref<any[]>([]); const meta = ref<any>(null); const page = ref(1);
const suppliers = ref<any[]>([]); const orders = ref<any[]>([]);
const canWrite = computed(() => auth.can('procurement.write'));
const c = reactive<any>({ show: false, supplierId: '', number: '', poId: '', amount: 0 });
const poOptions = computed(() => orders.value.filter((o) => !c.supplierId || o.supplierId === c.supplierId));

// ---- counterparty registry lookup by INN (orginfo.uz) ----
const reg = reactive<any>({ busy: false, loaded: false, inn: '', d: {} });
const selSupplier = computed(() => suppliers.value.find((s) => s.id === c.supplierId));
const selInn = computed(() => (selSupplier.value?.inn ? String(selSupplier.value.inn).replace(/\D/g, '') : ''));
const fmtInn = (v: string) => String(v || '').replace(/\D/g, '').slice(0, 9).replace(/(\d{3})(\d{0,3})(\d{0,3})/, (_, a, b, cc) => [a, b, cc].filter(Boolean).join(' '));
const statusRu = (s: string) => (s === 'Active' ? 'Действует' : s === 'Inactive' ? 'Не действует' : s || '');
function onSupplier() { c.poId = ''; reg.loaded = false; reg.d = {}; reg.inn = ''; if (selInn.value.length === 9) doReg(false); }
async function doReg(manual: boolean) {
  const inn = selInn.value;
  if (inn.length !== 9) { if (manual) toast('У поставщика нет корректного ИНН', true); return; }
  if (reg.inn === inn && reg.loaded) return;
  reg.inn = inn; reg.busy = true;
  try {
    const r = await auth.api(`/procurement/suppliers/lookup?inn=${inn}`);
    if (r.found && r.data) { reg.d = r.data; reg.loaded = true; }
    else { reg.loaded = false; reg.d = {}; if (manual) toast('Компания не найдена в реестре', true); }
  } catch { if (manual) toast('Не удалось получить данные из реестра', true); }
  finally { reg.busy = false; }
}

const label = (s: string) => ({ open: 'Открыт', matched: 'Совпал', discrepancy: 'Расхождение', paid: 'Оплачён' } as any)[s] || s;
const cls = (s: string) => ({ open: 'muted', matched: 'in', discrepancy: 'out', paid: 'in' } as any)[s] || 'muted';

async function reload(p = 1) {
  page.value = p;
  const res = await auth.api(`/procurement/invoices?page=${p}&pageSize=25`);
  invoices.value = res.invoices; meta.value = res.meta;
}
async function loadRefs() {
  const [s, o] = await Promise.all([auth.api('/procurement/suppliers?pageSize=200'), auth.api('/procurement/orders?pageSize=200')]);
  suppliers.value = s.suppliers; orders.value = o.orders;
}
function openCreate() {
  Object.assign(c, { show: true, supplierId: suppliers.value[0]?.id || '', number: '', poId: '', amount: 0 });
  reg.loaded = false; reg.d = {}; reg.inn = '';
  if (selInn.value.length === 9) doReg(false);
}
async function submitCreate() {
  try {
    const res = await auth.api('/procurement/invoices', { method: 'POST', body: { supplierId: c.supplierId, poId: c.poId || undefined, number: c.number.trim(), amountMinor: Math.round((Number(c.amount) || 0) * 100) } });
    c.show = false;
    toast(res.match.status === 'matched' ? 'Счёт совпал с приходом ✓' : 'Внимание: расхождение по 3-way match', res.match.status !== 'matched');
    await reload(1);
  } catch (e: any) { toast(e.message, true); }
}
async function rematch(id: string) { try { const r = await auth.api(`/procurement/invoices/${id}/match`, { method: 'POST' }); toast('Match: ' + r.match.status); await reload(page.value); } catch (e: any) { toast(e.message, true); } }
async function pay(id: string) { try { await auth.api(`/procurement/invoices/${id}/pay`, { method: 'POST' }); toast('Отмечено оплаченным'); await reload(page.value); } catch (e: any) { toast(e.message, true); } }
onMounted(async () => { await loadRefs(); await reload(1); });
</script>

<style scoped>
.reg { margin: 8px 0; padding: 12px; border: 1px dashed var(--line, #e2e8f0); border-radius: 10px; background: #f8fafc; }
.reg-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; margin-bottom: 8px; flex-wrap: wrap; }
.reg-actions { display: inline-flex; gap: 6px; }
.reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
.reg-grid .col2 { grid-column: 1 / -1; }
.reg-grid label { font-size: 12px; color: var(--muted, #64748b); }
.ro { background: #fff; color: var(--ink, #0f172a); cursor: default; width: 100%; }
@media (max-width: 640px) { .reg-grid { grid-template-columns: 1fr; } }
</style>
