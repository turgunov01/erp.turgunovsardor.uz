<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Вебхуки</h2>
      <div class="toolbar">
        <a class="btn ghost sm" :href="docsUrl" target="_blank" rel="noopener">Документация ↗</a>
        <button v-if="canManage" class="btn sm" @click="openCreate()">+ Вебхук</button>
      </div>
    </div>
    <div class="panel-body">
      <p class="lead">
        TTR ONE будет отправлять <b>POST</b> на ваш URL при событиях. Каждая доставка подписана заголовком
        <code>X-TTR-Signature: sha256=…</code> (HMAC от тела запроса вашим секретом). Неуспешные доставки повторяются с задержкой.
      </p>
      <table>
        <thead><tr><th>URL</th><th>События</th><th>Секрет</th><th>Последняя доставка</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="w in webhooks" :key="w.id" :class="{ off: !w.active }">
            <td class="url">{{ w.url }}</td>
            <td><span v-if="w.events.includes('*')" class="tag in">все события</span><template v-else><span v-for="e in w.events" :key="e" class="tag muted ev">{{ evLabel(e) }}</span></template></td>
            <td><button class="btn ghost sm" @click="copy(w.secret)">{{ copiedId === w.id ? 'Скопировано ✓' : 'Копировать' }}</button></td>
            <td>{{ w.lastAt ? new Date(w.lastAt).toLocaleString('ru-RU') : '—' }}<div v-if="w.lastError" class="err">{{ w.lastError }}</div></td>
            <td>
              <span class="tag" :class="!w.active ? 'muted' : (w.lastStatus && w.lastStatus >= 200 && w.lastStatus < 300 ? 'in' : (w.lastStatus === null ? 'muted' : 'out'))">
                {{ !w.active ? 'Выключен' : (w.lastStatus ? ('HTTP ' + w.lastStatus) : 'Активен') }}
              </span>
            </td>
            <td v-if="canManage" class="nowrap">
              <button class="btn soft sm" :disabled="!w.active" @click="test(w)">Тест</button>
              <button class="btn ghost sm" @click="openCreate(w)">Изм.</button>
              <button class="btn ghost sm danger" @click="remove(w)">Удал.</button>
            </td>
          </tr>
          <tr v-if="!webhooks.length"><td colspan="6" class="empty">Вебхуков пока нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="m.show" half :title="m.id ? 'Изменить вебхук' : 'Новый вебхук'" submit-label="Сохранить" @close="m.show = false" @submit="submit">
    <label>URL (куда слать POST)</label><input v-model="m.url" placeholder="https://example.com/hooks/ttr" />
    <label style="margin-top:8px">События</label>
    <label class="chk"><input v-model="m.all" type="checkbox" /> Все события (*)</label>
    <div v-if="!m.all" class="ev-grid">
      <label v-for="e in allEvents" :key="e" class="chk"><input v-model="m.events" type="checkbox" :value="e" /> {{ evLabel(e) }} <code>{{ e }}</code></label>
    </div>
    <label class="chk" style="margin-top:10px"><input v-model="m.active" type="checkbox" /> Активен</label>
  </Modal>

  <Modal v-if="reveal.show" half title="Вебхук создан" submit-label="Готово" @close="reveal.show = false" @submit="reveal.show = false">
    <div class="warn-box">Сохраните секрет для проверки подписи. Он также доступен в списке (кнопка «Копировать»).</div>
    <label>Секрет для подписи (HMAC-SHA256)</label>
    <div class="secret-row"><input :value="reveal.secret" readonly class="mono" /><button type="button" class="btn sm" @click="copy(reveal.secret, 'reveal')">{{ copiedId === 'reveal' ? '✓' : 'Копировать' }}</button></div>
    <label style="margin-top:10px">Проверка подписи (пример, Node.js)</label>
    <pre class="code">const sig = crypto.createHmac('sha256', SECRET)
  .update(rawBody).digest('hex');
// сравните с заголовком X-TTR-Signature: sha256=&lt;sig&gt;</pre>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const webhooks = ref<any[]>([]);
const allEvents = ref<string[]>([]);
const canManage = computed(() => auth.can('tenant.manage'));
const apiBase = computed(() => useRuntimeConfig().public.apiBase as string);
const docsUrl = computed(() => apiBase.value.replace(/\/api\/v1$/, '') + '/api-docs');
const copiedId = ref('');

const LABELS: Record<string, string> = {
  'sales.shipped': 'Отгрузка продажи', 'sales.returned': 'Возврат продажи',
  'purchase.received': 'Приёмка закупки', 'production.issued': 'Списание в производство',
  'production.completed': 'Выпуск продукции', 'pos.sale': 'Продажа (касса)',
  'pos.refund': 'Возврат (касса)', 'payroll.accrued': 'Начисление зарплаты',
};
const evLabel = (e: string) => LABELS[e] || e;

const m = reactive<any>({ show: false, id: '', url: '', events: [] as string[], all: true, active: true });
const reveal = reactive<any>({ show: false, secret: '' });

async function load() {
  const [w, e] = await Promise.all([auth.api('/webhooks'), auth.api('/webhooks/events')]);
  webhooks.value = w.webhooks; allEvents.value = e.events;
}
function openCreate(w?: any) {
  if (w) Object.assign(m, { show: true, id: w.id, url: w.url, events: w.events.includes('*') ? [] : [...w.events], all: w.events.includes('*'), active: w.active });
  else Object.assign(m, { show: true, id: '', url: '', events: [], all: true, active: true });
}
async function submit() {
  if (!/^https?:\/\//.test(m.url)) { toast('Укажите корректный URL (https://…)', true); return; }
  const events = m.all ? ['*'] : m.events;
  if (!m.all && !events.length) { toast('Выберите хотя бы одно событие', true); return; }
  try {
    if (m.id) { await auth.api(`/webhooks/${m.id}`, { method: 'PATCH', body: { url: m.url, events, active: m.active } }); toast('Сохранено'); }
    else { const r = await auth.api('/webhooks', { method: 'POST', body: { url: m.url, events, active: m.active } }); Object.assign(reveal, { show: true, secret: r.webhook.secret }); }
    m.show = false; await load();
  } catch (e: any) { toast(e.message, true); }
}
async function remove(w: any) {
  if (!confirm(`Удалить вебхук ${w.url}?`)) return;
  try { await auth.api(`/webhooks/${w.id}`, { method: 'DELETE' }); toast('Удалено'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
async function test(w: any) {
  try { await auth.api(`/webhooks/${w.id}/test`, { method: 'POST' }); toast('Тестовое событие отправлено — проверьте приёмник'); setTimeout(load, 1500); }
  catch (e: any) { toast(e.message, true); }
}
async function copy(v: string, id = '') {
  try { await navigator.clipboard.writeText(v); copiedId.value = id || v; setTimeout(() => (copiedId.value = ''), 2000); }
  catch { toast('Скопируйте вручную', true); }
}
onMounted(load);
</script>

<style scoped>
.lead { font-size: 13px; color: var(--muted, #64748b); margin: 0 0 12px; padding: 0 2px; }
.lead code, td code { background: #f1f5f9; padding: 1px 6px; border-radius: 6px; font-size: 11px; }
.url { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.ev { margin: 0 3px 3px 0; }
.err { font-size: 11px; color: #dc2626; max-width: 220px; }
.nowrap { white-space: nowrap; }
.nowrap .btn + .btn { margin-left: 6px; }
tr.off td { opacity: .55; }
.btn.danger { color: #dc2626; }
.chk { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.ev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin: 6px 0; }
.warn-box { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; padding: 10px 12px; border-radius: 10px; font-size: 13px; margin-bottom: 10px; }
.secret-row { display: flex; gap: 8px; } .secret-row input { flex: 1; }
.mono { font-family: ui-monospace, monospace; font-size: 13px; }
.code { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 10px; font-size: 12px; overflow-x: auto; white-space: pre; }
@media (max-width: 640px) { .ev-grid { grid-template-columns: 1fr; } }
</style>
