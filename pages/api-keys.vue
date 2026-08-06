<template>
  <div class="panel">
    <div class="panel-head">
      <h2>API-ключи для разработчиков</h2>
      <div class="toolbar">
        <a class="btn ghost sm" :href="docsUrl" target="_blank" rel="noopener">Документация ↗</a>
        <button v-if="canManage" class="btn sm" @click="openCreate">+ Создать ключ</button>
      </div>
    </div>
    <div class="panel-body">
      <p class="lead">
        Ключи дают вашему приложению доступ к REST API TTR ONE. Передавайте ключ в заголовке
        <code>X-API-Key</code> (или <code>Authorization: Bearer …</code>). Базовый URL: <code>{{ apiBase }}</code>.
      </p>
      <table>
        <thead><tr><th>Название</th><th>Ключ</th><th>Доступ</th><th>Последнее использование</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="k in keys" :key="k.id" :class="{ off: k.revokedAt }">
            <td>{{ k.name }}</td>
            <td><code>{{ k.prefix }}…</code></td>
            <td><span class="tag" :class="k.scope === 'full' ? 'out' : 'in'">{{ k.scope === 'full' ? 'Полный' : 'Только чтение' }}</span></td>
            <td>{{ k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('ru-RU') : '—' }}</td>
            <td><span class="tag" :class="k.revokedAt ? 'muted' : 'in'">{{ k.revokedAt ? 'Отозван' : 'Активен' }}</span></td>
            <td><button v-if="canManage && !k.revokedAt" class="btn ghost sm danger" @click="revoke(k)">Отозвать</button></td>
          </tr>
          <tr v-if="!keys.length"><td colspan="6" class="empty">Ключей пока нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Create -->
  <Modal v-if="c.show" title="Новый API-ключ" submit-label="Создать" @close="c.show = false" @submit="submitCreate">
    <label>Название (для чего ключ)</label><input v-model="c.name" placeholder="Интеграция 1С / мобильное приложение…" />
    <label>Уровень доступа</label>
    <select v-model="c.scope">
      <option value="read">Только чтение (все GET-эндпоинты)</option>
      <option value="full">Полный доступ (чтение и запись)</option>
    </select>
    <div class="hint" style="text-align:left;margin-top:8px">Полный доступ позволяет создавать/менять данные — выдавайте его только доверенным интеграциям.</div>
  </Modal>

  <!-- Show secret once -->
  <Modal v-if="reveal.show" half title="Ключ создан — скопируйте его сейчас" submit-label="Готово, я сохранил" @close="reveal.show = false" @submit="reveal.show = false">
    <div class="warn-box">⚠️ Секретный ключ показывается <b>один раз</b>. Скопируйте и храните надёжно — повторно его увидеть нельзя.</div>
    <label>Секретный ключ</label>
    <div class="secret-row">
      <input :value="reveal.secret" readonly class="mono" />
      <button type="button" class="btn sm" @click="copy(reveal.secret)">{{ copied ? 'Скопировано ✓' : 'Копировать' }}</button>
    </div>
    <label style="margin-top:10px">Пример запроса</label>
    <pre class="code">curl {{ apiBase }}/catalog/products \
  -H "X-API-Key: {{ reveal.secret }}"</pre>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const keys = ref<any[]>([]);
const canManage = computed(() => auth.can('tenant.manage'));
const apiBase = computed(() => (useRuntimeConfig().public.apiBase as string));
const docsUrl = computed(() => apiBase.value.replace(/\/api\/v1$/, '') + '/api-docs');
const copied = ref(false);

const c = reactive<any>({ show: false, name: '', scope: 'read' });
const reveal = reactive<any>({ show: false, secret: '' });

async function load() { keys.value = (await auth.api('/api-keys')).keys; }
function openCreate() { Object.assign(c, { show: true, name: '', scope: 'read' }); }
async function submitCreate() {
  if (!c.name.trim()) { toast('Укажите название', true); return; }
  try {
    const r = await auth.api('/api-keys', { method: 'POST', body: { name: c.name.trim(), scope: c.scope } });
    c.show = false;
    Object.assign(reveal, { show: true, secret: r.secret });
    copied.value = false;
    await load();
  } catch (e: any) { toast(e.message, true); }
}
async function revoke(k: any) {
  if (!confirm(`Отозвать ключ «${k.name}»? Приложения с этим ключом потеряют доступ.`)) return;
  try { await auth.api(`/api-keys/${k.id}`, { method: 'DELETE' }); toast('Ключ отозван'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
async function copy(v: string) {
  try { await navigator.clipboard.writeText(v); copied.value = true; setTimeout(() => (copied.value = false), 2000); }
  catch { toast('Скопируйте вручную', true); }
}
onMounted(load);
</script>

<style scoped>
.lead { font-size: 13px; color: var(--muted, #64748b); margin: 0 0 12px; padding: 0 2px; }
.lead code, td code { background: #f1f5f9; padding: 1px 6px; border-radius: 6px; font-size: 12px; }
tr.off td { opacity: .55; }
.btn.danger { color: #dc2626; }
.warn-box { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; padding: 10px 12px; border-radius: 10px; font-size: 13px; margin-bottom: 10px; }
.secret-row { display: flex; gap: 8px; }
.secret-row input { flex: 1; }
.mono { font-family: ui-monospace, monospace; font-size: 13px; }
.code { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 10px; font-size: 12px; overflow-x: auto; white-space: pre; }
</style>
