<template>
  <div>
    <div class="panel">
      <div class="panel-head">
        <h2>Документооборот</h2>
        <div class="toolbar">
          <button class="btn ghost sm" :class="{ active: tab === 'docs' }" @click="tab = 'docs'">Документы</button>
          <button class="btn ghost sm" :class="{ active: tab === 'tpl' }" @click="tab = 'tpl'">Шаблоны</button>
          <button v-if="tab === 'docs' && canWrite" class="btn sm" @click="openCreate">+ Документ</button>
          <button v-if="tab === 'tpl' && canWrite" class="btn sm" @click="openTemplate()">+ Шаблон</button>
        </div>
      </div>

      <!-- Documents -->
      <div v-if="tab === 'docs'" class="panel-body">
        <table>
          <thead><tr><th>№</th><th>Название</th><th>Тип</th><th>Версия</th><th>Согласование</th><th>Статус</th></tr></thead>
          <tbody>
            <tr v-for="d in docs" :key="d.id" class="clickable" @click="openDoc(d.id)">
              <td>{{ d.number }}</td><td>{{ d.title }}</td><td>{{ kindLabel(d.kind) }}</td>
              <td>v{{ d.currentVersion }}</td>
              <td>{{ d._count?.approvals || 0 }}</td>
              <td><span class="tag" :class="statusCls(d.status)">{{ statusLabel(d.status) }}</span></td>
            </tr>
            <tr v-if="!docs.length"><td colspan="6" class="muted">Нет документов</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Templates -->
      <div v-else class="panel-body">
        <table>
          <thead><tr><th>Код</th><th>Название</th><th>Тип</th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in templates" :key="t.id">
              <td>{{ t.code }}</td><td>{{ t.name }}</td><td>{{ kindLabel(t.kind) }}</td>
              <td class="num"><button class="link" @click="openTemplate(t)">изменить</button></td>
            </tr>
            <tr v-if="!templates.length"><td colspan="4" class="muted">Нет шаблонов</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create document modal -->
    <div v-if="creating" class="modal-back" @click.self="creating = false">
      <div class="modal wide">
        <h3>Новый документ</h3>
        <label>Название</label><input v-model="cForm.title" placeholder="Договор №…" />
        <label>Шаблон</label>
        <select v-model="cForm.templateId" @change="onTemplatePick">
          <option value="">Без шаблона (свободный текст)</option>
          <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <template v-if="cForm.templateId">
          <div class="fields">
            <div v-for="f in templateFields" :key="f" class="fld"><label>{{ f }}</label><input v-model="cForm.fields[f]" /></div>
          </div>
        </template>
        <template v-else>
          <div class="ed-head">
            <label style="margin:10px 0 4px">Текст документа</label>
            <label class="up-docx"><input type="file" accept=".docx" hidden @change="importDocx" />⬆ Загрузить Word (.docx)</label>
          </div>
          <div v-if="importing" class="muted" style="font-size:12px">Разбираем .docx…</div>
          <RichEditor v-model="cForm.body" />
        </template>
        <div v-if="cErr" class="neg">{{ cErr }}</div>
        <div class="modal-actions">
          <button class="btn ghost sm" @click="creating = false">Отмена</button>
          <button class="btn sm" :disabled="!cForm.title" @click="createDoc">Создать</button>
        </div>
      </div>
    </div>

    <!-- Template editor modal -->
    <div v-if="editingTpl" class="modal-back" @click.self="editingTpl = null">
      <div class="modal wide">
        <h3>{{ editingTpl.id ? 'Шаблон' : 'Новый шаблон' }}</h3>
        <div class="row2">
          <div><label>Код</label><input v-model="editingTpl.code" :disabled="!!editingTpl.id" placeholder="CONTRACT" /></div>
          <div><label>Тип</label><select v-model="editingTpl.kind"><option value="generic">Общий</option><option value="contract">Договор</option><option value="invoice">Счёт</option><option value="act">Акт</option><option value="order">Заказ</option></select></div>
        </div>
        <label>Название</label><input v-model="editingTpl.name" />
        <label>Текст (плейсхолдеры: <code v-pre>{{поле}}</code>)</label>
        <textarea v-model="editingTpl.body" rows="8"></textarea>
        <div v-if="tErr" class="neg">{{ tErr }}</div>
        <div class="modal-actions">
          <button class="btn ghost sm" @click="editingTpl = null">Отмена</button>
          <button class="btn sm" @click="saveTemplate">Сохранить</button>
        </div>
      </div>
    </div>

    <!-- Document detail modal -->
    <div v-if="doc" class="modal-back" @click.self="doc = null">
      <div class="modal wide">
        <div class="doc-head">
          <div><h3>{{ doc.title }}</h3><div class="muted">{{ doc.number }} · <span class="tag" :class="statusCls(doc.status)">{{ statusLabel(doc.status) }}</span> · v{{ doc.currentVersion }}</div></div>
          <button class="link" @click="doc = null">✕</button>
        </div>

        <div class="doc-body" :class="{ plain: !isHtml(currentBody) }" v-html="currentBody"></div>

        <!-- Approvals -->
        <div v-if="doc.approvals?.length" class="section">
          <b>Маршрут согласования</b>
          <div v-for="a in doc.approvals" :key="a.id" class="appr" :class="a.status">
            <span class="seq">{{ a.seq }}</span>
            <span class="who">{{ a.approverName }}</span>
            <span class="tag" :class="a.status === 'approved' ? 'in' : a.status === 'rejected' ? 'out' : 'muted'">{{ apprLabel(a.status) }}</span>
            <span v-if="a.actedAt" class="sig">✍ {{ fmtDate(a.actedAt) }}</span>
            <span v-if="a.comment" class="cmt">{{ a.comment }}</span>
          </div>
        </div>

        <!-- Attachments -->
        <div class="section">
          <b>Вложения</b>
          <div v-for="f in attachments" :key="f.id" class="att">
            <span>📎 {{ f.filename }} <small class="muted">{{ (f.sizeBytes/1024).toFixed(0) }} КБ</small></span>
            <span><button class="link" @click="download(f)">скачать</button> <button class="link neg" @click="delFile(f)">✕</button></span>
          </div>
          <label class="up"><input type="file" @change="upload" hidden />+ загрузить файл</label>
        </div>

        <!-- Actions -->
        <div class="modal-actions wrap">
          <template v-if="['draft','rejected'].includes(doc.status) && canWrite">
            <button class="btn ghost sm" @click="openEdit">✎ Редактировать</button>
            <select v-model="submitApprovers" multiple class="appr-select">
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
            </select>
            <button class="btn sm" :disabled="!submitApprovers.length" @click="submit">На согласование</button>
          </template>
          <template v-if="doc.status === 'pending' && isMyTurn">
            <button class="btn sm green" @click="approve">✍ Согласовать</button>
            <input v-model="rejectComment" placeholder="Причина отклонения" class="rej-in" />
            <button class="btn sm red" :disabled="!rejectComment" @click="reject">Отклонить</button>
          </template>
          <button v-if="!['approved','cancelled'].includes(doc.status) && canWrite" class="btn ghost sm" @click="cancelDoc">Отменить</button>
        </div>
      </div>
    </div>

    <!-- Edit (new version) modal -->
    <div v-if="editing" class="modal-back" @click.self="editing = false">
      <div class="modal wide">
        <div class="ed-head">
          <h3>Редактирование: {{ doc?.title }}</h3>
          <label class="up-docx"><input type="file" accept=".docx" hidden @change="importDocxEdit" />⬆ Загрузить Word (.docx)</label>
        </div>
        <div v-if="importing" class="muted" style="font-size:12px">Разбираем .docx…</div>
        <RichEditor v-model="editBody" />
        <div v-if="eErr" class="neg">{{ eErr }}</div>
        <div class="modal-actions">
          <button class="btn ghost sm" @click="editing = false">Отмена</button>
          <button class="btn sm" @click="saveVersion">Сохранить как новую версию</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const canWrite = computed(() => auth.can('documents.write'));

const tab = ref<'docs' | 'tpl'>('docs');
const docs = ref<any[]>([]);
const templates = ref<any[]>([]);
const users = ref<any[]>([]);
const doc = ref<any>(null);
const attachments = ref<any[]>([]);

const kindLabel = (k: string) => ({ contract: 'Договор', invoice: 'Счёт', act: 'Акт', order: 'Заказ', generic: 'Общий' } as any)[k] || k;
const statusLabel = (s: string) => ({ draft: 'Черновик', pending: 'На согласовании', approved: 'Согласован', rejected: 'Отклонён', cancelled: 'Отменён' } as any)[s] || s;
const statusCls = (s: string) => ({ approved: 'in', rejected: 'out', pending: 'adjust', draft: 'muted', cancelled: 'muted' } as any)[s] || 'muted';
const apprLabel = (s: string) => ({ pending: 'Ожидает', approved: 'Подписал', rejected: 'Отклонил' } as any)[s] || s;

const currentBody = computed(() => doc.value?.versions?.find((v: any) => v.version === doc.value.currentVersion)?.body || doc.value?.versions?.[0]?.body || '');
const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s || '');
const importing = ref(false);
const isMyTurn = computed(() => {
  const active = doc.value?.approvals?.find((a: any) => a.status === 'pending');
  return active && active.approverId === auth.user?.id && auth.can('documents.approve');
});

async function loadDocs() { docs.value = (await auth.api<any>('/documents/documents?pageSize=100')).items; }
async function loadTemplates() { templates.value = (await auth.api<any>('/documents/templates')).templates; }
async function loadUsers() { try { users.value = (await auth.api<any>('/admin/users')).users || []; } catch { users.value = []; } }

// ---- Create ----
const creating = ref(false); const cErr = ref('');
const cForm = ref<any>({ title: '', templateId: '', body: '', fields: {} });
const templateFields = computed(() => {
  const t = templates.value.find((x) => x.id === cForm.value.templateId);
  if (!t) return [];
  return [...new Set([...t.body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m: any) => m[1]))];
});
function openCreate() { cForm.value = { title: '', templateId: '', body: '', fields: {} }; cErr.value = ''; creating.value = true; }
function onTemplatePick() { cForm.value.fields = {}; }

// Read a File as base64 (strip the data: prefix).
function fileToB64(file: File): Promise<string> {
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.readAsDataURL(file); });
}
async function importDocx(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
  importing.value = true;
  try {
    const r = await auth.api<any>('/documents/import-docx', { method: 'POST', body: { dataBase64: await fileToB64(file), filename: file.name } });
    cForm.value.body = r.html;
    if (!cForm.value.title && r.title) cForm.value.title = r.title;
    toast('Word-файл загружен в редактор');
  } catch (err: any) { cErr.value = err.message; } finally { importing.value = false; (e.target as HTMLInputElement).value = ''; }
}
async function createDoc() {
  cErr.value = '';
  try {
    const payload: any = { title: cForm.value.title };
    if (cForm.value.templateId) { payload.templateId = cForm.value.templateId; payload.fields = cForm.value.fields; }
    else payload.body = cForm.value.body;
    const r = await auth.api<any>('/documents/documents', { method: 'POST', body: payload });
    creating.value = false; toast('Документ создан'); await loadDocs(); await openDoc(r.document.id);
  } catch (e: any) { cErr.value = e.message; }
}

// ---- Templates ----
const editingTpl = ref<any>(null); const tErr = ref('');
function openTemplate(t?: any) { editingTpl.value = t ? { ...t } : { code: '', name: '', kind: 'generic', body: '' }; tErr.value = ''; }
async function saveTemplate() {
  tErr.value = '';
  try {
    if (editingTpl.value.id) await auth.api(`/documents/templates/${editingTpl.value.id}`, { method: 'PATCH', body: { name: editingTpl.value.name, body: editingTpl.value.body, kind: editingTpl.value.kind } });
    else await auth.api('/documents/templates', { method: 'POST', body: { code: editingTpl.value.code, name: editingTpl.value.name, kind: editingTpl.value.kind, body: editingTpl.value.body } });
    editingTpl.value = null; toast('Шаблон сохранён'); await loadTemplates();
  } catch (e: any) { tErr.value = e.message; }
}

// ---- Detail ----
const submitApprovers = ref<string[]>([]); const rejectComment = ref('');
async function openDoc(id: string) {
  const d = await auth.api<any>(`/documents/documents/${id}`);
  doc.value = d.document; attachments.value = d.attachments; submitApprovers.value = []; rejectComment.value = '';
}
async function refresh() { if (doc.value) await openDoc(doc.value.id); await loadDocs(); }
async function submit() {
  try { await auth.api(`/documents/documents/${doc.value.id}/submit`, { method: 'POST', body: { approverIds: submitApprovers.value } }); toast('Отправлено на согласование'); await refresh(); }
  catch (e: any) { toast(e.message, true); }
}
async function approve() { await auth.api(`/documents/documents/${doc.value.id}/approve`, { method: 'POST', body: {} }); toast('Согласовано'); await refresh(); }
async function reject() { try { await auth.api(`/documents/documents/${doc.value.id}/reject`, { method: 'POST', body: { comment: rejectComment.value } }); toast('Отклонено'); await refresh(); } catch (e: any) { toast(e.message, true); } }
async function cancelDoc() { await auth.api(`/documents/documents/${doc.value.id}/cancel`, { method: 'POST' }); toast('Отменено'); await refresh(); }
// ---- Edit (new version) ----
const editing = ref(false); const editBody = ref(''); const eErr = ref('');
function openEdit() { editBody.value = currentBody.value; eErr.value = ''; editing.value = true; }
async function importDocxEdit(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
  importing.value = true;
  try {
    const r = await auth.api<any>('/documents/import-docx', { method: 'POST', body: { dataBase64: await fileToB64(file), filename: file.name } });
    editBody.value = r.html; toast('Word-файл загружен в редактор');
  } catch (err: any) { eErr.value = err.message; } finally { importing.value = false; (e.target as HTMLInputElement).value = ''; }
}
async function saveVersion() {
  eErr.value = '';
  if (!editBody.value.trim()) { eErr.value = 'Пустой документ'; return; }
  try {
    await auth.api(`/documents/documents/${doc.value.id}/version`, { method: 'POST', body: { body: editBody.value } });
    editing.value = false; toast('Новая версия сохранена'); await refresh();
  } catch (e: any) { eErr.value = e.message; }
}

// ---- Attachments ----
async function upload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const b64 = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.readAsDataURL(file); });
  try {
    await auth.api('/platform/files', { method: 'POST', body: { filename: file.name, mime: file.type, dataBase64: b64, refType: 'Document', refId: doc.value.id } });
    toast('Файл загружен'); attachments.value = (await auth.api<any>(`/documents/documents/${doc.value.id}`)).attachments;
  } catch (err: any) { toast(err.message, true); }
}
async function download(f: any) {
  const base = useRuntimeConfig().public.apiBase as string;
  const blob = await $fetch<Blob>(`${base}/platform/files/${f.id}/download`, { headers: { Authorization: 'Bearer ' + auth.access }, responseType: 'blob' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = f.filename; a.click(); URL.revokeObjectURL(url);
}
async function delFile(f: any) { await auth.api(`/platform/files/${f.id}`, { method: 'DELETE' }); attachments.value = attachments.value.filter((x) => x.id !== f.id); }

onMounted(async () => { await Promise.all([loadDocs(), loadTemplates(), loadUsers()]); });
</script>

<style scoped>
.toolbar { display: flex; gap: 8px; align-items: center; }
.btn.active { background: var(--brand); color: #fff; }
.clickable { cursor: pointer; } .clickable:hover { background: #f8fafc; }
.modal-back { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: center; z-index: 50; padding: 20px; }
.modal { background: #fff; border-radius: 14px; padding: 22px; width: 440px; max-width: 94vw; max-height: 90vh; overflow-y: auto; }
.modal.wide { width: 620px; }
.modal label { display: block; margin: 10px 0 4px; font-size: 13px; color: var(--muted); }
.modal input, .modal select, .modal textarea { width: 100%; }
.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.fld label { margin-top: 6px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; align-items: center; }
.modal-actions.wrap { flex-wrap: wrap; }
.doc-head { display: flex; justify-content: space-between; align-items: flex-start; }
.doc-body { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 18px 22px; font-size: 14px; line-height: 1.55; max-height: 320px; overflow-y: auto; }
.doc-body.plain { white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 13px; }
.doc-body :deep(h1) { font-size: 20px; margin: 8px 0; } .doc-body :deep(h2) { font-size: 17px; margin: 8px 0; } .doc-body :deep(h3) { font-size: 15px; }
.doc-body :deep(table) { border-collapse: collapse; width: 100%; margin: 8px 0; } .doc-body :deep(td) { border: 1px solid #cbd5e1; padding: 6px; }
.doc-body :deep(ul), .doc-body :deep(ol) { padding-left: 22px; } .doc-body :deep(blockquote) { border-left: 3px solid var(--line); padding-left: 12px; color: #64748b; margin: 8px 0; }
.ed-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.up-docx { display: inline-flex; align-items: center; gap: 4px; color: var(--brand); cursor: pointer; font-size: 13px; border: 1px solid var(--line); border-radius: 8px; padding: 5px 10px; }
.up-docx:hover { background: #f1f5f9; }
.section { margin-top: 16px; } .section b { display: block; margin-bottom: 8px; }
.appr { display: flex; gap: 8px; align-items: center; padding: 6px 0; font-size: 13px; }
.appr .seq { width: 20px; height: 20px; border-radius: 50%; background: #eff6ff; color: var(--brand); display: grid; place-items: center; font-size: 11px; font-weight: 700; }
.appr .sig { color: #16a34a; font-size: 12px; } .appr .cmt { color: var(--muted); font-size: 12px; font-style: italic; }
.att { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
.up { display: inline-block; margin-top: 8px; color: var(--brand); cursor: pointer; font-size: 13px; }
.appr-select { min-width: 160px; height: 60px; }
.rej-in { max-width: 200px; }
.link { background: none; border: none; color: var(--brand); cursor: pointer; }
.link.neg { color: #dc2626; }
.pos { color: #16a34a; } .neg { color: #dc2626; }
</style>
