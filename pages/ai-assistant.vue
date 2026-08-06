<template>
  <div>
    <!-- Settings (owner / tenant.manage): provider + model + own API key -->
    <div v-if="canManage" class="panel">
      <div class="panel-head">
        <h2>Настройки AI</h2>
        <button class="btn ghost sm" @click="cfgOpen = !cfgOpen">{{ cfgOpen ? 'Свернуть' : 'Настроить' }}</button>
      </div>
      <div v-if="cfgOpen" class="panel-body">
        <div class="row2" style="max-width:560px">
          <div>
            <label>Провайдер</label>
            <select v-model="cfg.provider" @change="onProviderChange">
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
            </select>
          </div>
          <div>
            <label>Модель</label>
            <select v-model="cfg.model">
              <option value="">— по умолчанию —</option>
              <option v-for="m in modelsFor(cfg.provider)" :key="m.id" :value="m.id">{{ m.name }}</option>
              <option v-if="cfg.model && !modelsFor(cfg.provider).some(m=>m.id===cfg.model)" :value="cfg.model">{{ cfg.model }} (своя)</option>
            </select>
            <input v-model="customModel" placeholder="или свой ID модели" style="margin-top:6px" @change="applyCustomModel" />
          </div>
        </div>
        <label style="margin-top:10px">API-ключ {{ cfg.keySet ? '(задан: ' + cfg.keyHint + ')' : '' }}</label>
        <input v-model="apiKeyInput" type="password" :placeholder="cfg.keySet ? 'Оставьте пустым, чтобы не менять' : 'Вставьте свой ключ'" autocomplete="off" />
        <div class="hint">Ключ хранится в зашифрованном виде и не показывается обратно. {{ cfg.usingEnvKey ? 'Сейчас используется серверный ключ из окружения.' : '' }}</div>
        <div class="acts">
          <button class="btn sm" @click="saveCfg">Сохранить</button>
          <button v-if="cfg.keySet" class="btn ghost sm" @click="clearKey">Удалить ключ</button>
          <span v-if="cfgMsg" class="muted">{{ cfgMsg }}</span>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>AI-ассистент</h2>
        <span class="tag" :class="status.enabled ? 'in' : 'muted'">{{ status.enabled ? `${provLabel(status.provider)} · ${status.model}` : 'ключ не задан' }}</span>
      </div>
      <div class="panel-body">
        <div v-if="!status.enabled" class="hint warn">
          AI отключён: не задан API-ключ. {{ canManage ? 'Откройте «Настройки AI» выше, выберите провайдера и модель и вставьте свой ключ.' : 'Обратитесь к администратору, чтобы он задал ключ в настройках AI.' }} Вопросы можно задавать — вернётся подсказка.
        </div>
        <div class="chat">
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <div class="bubble">{{ m.text }}</div>
          </div>
          <div v-if="thinking" class="msg assistant"><div class="bubble muted">Думаю…</div></div>
        </div>
        <div class="ask">
          <input v-model="q" placeholder="Спросите о данных: «Какая выручка?», «Что скоро закончится?»" @keydown.enter="ask" />
          <button class="btn sm" :disabled="thinking || q.trim().length < 2" @click="ask">Спросить</button>
        </div>
        <div class="examples">
          <button v-for="e in EXAMPLES" :key="e" class="chip" @click="q = e; ask()">{{ e }}</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>OCR накладной</h2></div>
      <div class="panel-body">
        <p class="muted" style="margin-top:0">Загрузите фото/скан накладной — AI извлечёт поставщика и позиции (нужен API-ключ).</p>
        <label class="up"><input type="file" accept="image/*" hidden @change="ocr" />📷 Загрузить изображение</label>
        <span v-if="ocrBusy" class="muted"> Распознаём…</span>
        <div v-if="ocrResult" class="ocr-res">
          <div v-if="ocrResult.supplier"><b>Поставщик:</b> {{ ocrResult.supplier }}</div>
          <table v-if="ocrResult.lines?.length">
            <thead><tr><th>Наименование</th><th class="num">Кол-во</th><th class="num">Цена</th></tr></thead>
            <tbody><tr v-for="(l, i) in ocrResult.lines" :key="i"><td>{{ l.name }}</td><td class="num">{{ l.quantity }}</td><td class="num">{{ money(l.priceMinor) }}</td></tr></tbody>
          </table>
          <div v-if="ocrResult.raw" class="muted">{{ ocrResult.raw }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const canManage = computed(() => auth.can('tenant.manage'));
const EXAMPLES = ['Какая выручка за период?', 'Сколько денег на счетах?', 'Что скоро закончится на складе?', 'Топ товаров по продажам?'];
const status = ref<any>({ enabled: false, provider: 'anthropic', model: '' });
const messages = ref<{ role: string; text: string }[]>([]);
const q = ref(''); const thinking = ref(false);
const ocrBusy = ref(false); const ocrResult = ref<any>(null);

// ---- AI settings ----
const cfgOpen = ref(false);
const cfg = ref<any>({ provider: 'anthropic', model: '', keySet: false, keyHint: null, usingEnvKey: false, models: { anthropic: [], openai: [] } });
const apiKeyInput = ref(''); const customModel = ref(''); const cfgMsg = ref('');
const provLabel = (p: string) => (p === 'openai' ? 'OpenAI' : 'Claude');
const modelsFor = (p: string) => cfg.value.models?.[p] || [];
function onProviderChange() { cfg.value.model = ''; }
function applyCustomModel() { if (customModel.value.trim()) { cfg.value.model = customModel.value.trim(); customModel.value = ''; } }
async function loadCfg() { if (!canManage.value) return; cfg.value = await auth.api('/ai/settings'); }
async function saveCfg() {
  applyCustomModel();
  cfgMsg.value = '';
  const body: any = { provider: cfg.value.provider, model: cfg.value.model };
  if (apiKeyInput.value.trim()) body.apiKey = apiKeyInput.value.trim();
  try {
    await auth.api('/ai/settings', { method: 'PATCH', body });
    apiKeyInput.value = ''; toast('Настройки AI сохранены');
    await Promise.all([loadCfg(), loadStatus()]);
  } catch (e: any) { cfgMsg.value = e.message; }
}
async function clearKey() {
  await auth.api('/ai/settings', { method: 'PATCH', body: { apiKey: '' } });
  toast('Ключ удалён'); await Promise.all([loadCfg(), loadStatus()]);
}
async function loadStatus() { try { status.value = await auth.api('/ai/status'); } catch { /* ignore */ } }

async function ask() {
  const question = q.value.trim(); if (question.length < 2 || thinking.value) return;
  messages.value.push({ role: 'user', text: question }); q.value = ''; thinking.value = true;
  try {
    const r = await auth.api<any>('/ai/ask', { method: 'POST', body: { question } });
    messages.value.push({ role: 'assistant', text: r.answer });
  } catch (e: any) { messages.value.push({ role: 'assistant', text: 'Ошибка: ' + e.message }); }
  finally { thinking.value = false; }
}
async function ocr(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
  ocrBusy.value = true; ocrResult.value = null;
  const b64 = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.readAsDataURL(file); });
  try { ocrResult.value = await auth.api('/ai/ocr-invoice', { method: 'POST', body: { imageBase64: b64, mediaType: file.type || 'image/jpeg' } }); }
  catch (err: any) { ocrResult.value = { raw: 'Ошибка: ' + err.message }; }
  finally { ocrBusy.value = false; (e.target as HTMLInputElement).value = ''; }
}
onMounted(async () => { await Promise.all([loadStatus(), loadCfg()]); });
</script>

<style scoped>
.hint.warn { color: #92400e; background: #fef3c7; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 13px; }
.chat { display: flex; flex-direction: column; gap: 10px; min-height: 120px; max-height: 46vh; overflow-y: auto; padding: 6px 0; }
.msg { display: flex; } .msg.user { justify-content: flex-end; }
.bubble { max-width: 78%; padding: 10px 14px; border-radius: 12px; font-size: 14px; white-space: pre-wrap; line-height: 1.45; }
.msg.user .bubble { background: var(--brand); color: #fff; }
.msg.assistant .bubble { background: #f1f5f9; color: var(--ink); }
.ask { display: flex; gap: 8px; margin-top: 12px; }
.ask input { flex: 1; height: 40px; border: 1px solid var(--line); border-radius: 8px; padding: 0 14px; font-size: 14px; }
.examples { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.chip { background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 12px; cursor: pointer; }
.chip:hover { border-color: var(--brand); }
.up { display: inline-flex; align-items: center; gap: 6px; color: var(--brand); cursor: pointer; border: 1px solid var(--line); border-radius: 8px; padding: 8px 14px; font-size: 13px; }
.ocr-res { margin-top: 14px; }
.acts { display: flex; gap: 10px; align-items: center; margin-top: 14px; }
label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 4px; }
select, input[type=password], input:not([type]) { width: 100%; }
</style>
