<template>
  <div>
    <!-- Forms list -->
    <div v-if="!active" class="panel">
      <div class="panel-head">
        <h2>Конструктор форм</h2>
        <button v-if="canBuild" class="btn sm" @click="openBuilder()">+ Создать форму</button>
      </div>
      <div class="panel-body" style="padding:18px">
        <div class="fgrid">
          <button v-for="f in forms" :key="f.id" class="fcard" @click="open(f.id)">
            <span class="f-ic">{{ f.icon }}</span>
            <div class="f-body"><b>{{ f.name }}</b><small>{{ f._count.records }} записей</small></div>
          </button>
          <div v-if="!forms.length" class="muted">Пока нет форм. {{ canBuild ? 'Создайте первую — это no-code, без программирования.' : '' }}</div>
        </div>
      </div>
    </div>

    <!-- Form detail: fill + records -->
    <div v-else>
      <div class="panel">
        <div class="panel-head">
          <h2>{{ active.form.icon }} {{ active.form.name }}</h2>
          <div class="toolbar">
            <button v-if="canBuild" class="btn ghost sm" @click="openBuilder(active.form)">Изменить</button>
            <button class="btn ghost sm" @click="active = null; load()">← Назад</button>
          </div>
        </div>
        <div class="panel-body" style="padding:18px">
          <p v-if="active.form.description" class="muted" style="margin-top:0">{{ active.form.description }}</p>
          <div class="fill">
            <div v-for="fl in active.form.fields" :key="fl.key" class="fl">
              <label>{{ fl.label }}<span v-if="fl.required" class="req">*</span></label>
              <textarea v-if="fl.type === 'textarea'" v-model="entry[fl.key]" rows="2"></textarea>
              <select v-else-if="fl.type === 'select'" v-model="entry[fl.key]"><option value="">—</option><option v-for="o in fl.options" :key="o" :value="o">{{ o }}</option></select>
              <label v-else-if="fl.type === 'checkbox'" class="chk"><input type="checkbox" v-model="entry[fl.key]" /> Да</label>
              <input v-else v-model="entry[fl.key]" :type="fl.type === 'number' ? 'number' : fl.type === 'date' ? 'date' : 'text'" />
            </div>
            <button class="btn sm" @click="addRecord">Добавить запись</button>
            <span v-if="fErr" class="error">{{ fErr }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Записи ({{ active.records.length }})</h2></div>
        <div class="panel-body">
          <table>
            <thead><tr><th v-for="fl in active.form.fields" :key="fl.key">{{ fl.label }}</th><th>Когда</th><th></th></tr></thead>
            <tbody>
              <tr v-for="r in active.records" :key="r.id">
                <td v-for="fl in active.form.fields" :key="fl.key">{{ fmtVal(r.data[fl.key]) }}</td>
                <td>{{ fmtDate(r.createdAt) }}</td>
                <td class="num"><button class="link neg" @click="delRecord(r)">✕</button></td>
              </tr>
              <tr v-if="!active.records.length"><td :colspan="active.form.fields.length + 2" class="muted">Нет записей</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Builder modal -->
    <div v-if="builder" class="modal-back" @click.self="builder = null">
      <div class="modal wide">
        <h3>{{ builder.id ? 'Изменить форму' : 'Новая форма' }}</h3>
        <div class="row2">
          <div><label>Название</label><input v-model="builder.name" placeholder="Заявка на ремонт" /></div>
          <div><label>Ключ (латиница)</label><input v-model="builder.key" :disabled="!!builder.id" placeholder="repair" /></div>
        </div>
        <div class="row2">
          <div><label>Иконка</label><input v-model="builder.icon" maxlength="2" placeholder="▤" /></div>
          <div><label>Описание</label><input v-model="builder.description" /></div>
        </div>
        <label style="margin-top:12px">Поля формы</label>
        <div v-for="(fl, i) in builder.fields" :key="i" class="frow">
          <input v-model="fl.label" placeholder="Заголовок" style="flex:2" />
          <input v-model="fl.key" placeholder="ключ" style="flex:1" />
          <select v-model="fl.type" style="flex:1"><option value="text">Текст</option><option value="textarea">Многостр.</option><option value="number">Число</option><option value="date">Дата</option><option value="select">Список</option><option value="checkbox">Флажок</option></select>
          <input v-if="fl.type === 'select'" v-model="fl._opts" placeholder="a, b, c" style="flex:1.5" />
          <label class="chk"><input type="checkbox" v-model="fl.required" /> об.</label>
          <button class="link neg" @click="builder.fields.splice(i, 1)">✕</button>
        </div>
        <button class="btn ghost sm" @click="builder.fields.push({ label: '', key: '', type: 'text', required: false })">+ Поле</button>
        <div v-if="bErr" class="error">{{ bErr }}</div>
        <div class="modal-actions">
          <button v-if="builder.id" class="btn ghost sm red" style="margin-right:auto" @click="removeForm">Удалить форму</button>
          <button class="btn ghost sm" @click="builder = null">Отмена</button>
          <button class="btn sm" @click="saveForm">Сохранить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const canBuild = computed(() => auth.can('studio.manage'));

const forms = ref<any[]>([]);
const active = ref<any>(null);
const entry = ref<Record<string, any>>({});
const fErr = ref('');
const builder = ref<any>(null); const bErr = ref('');

const fmtVal = (v: any) => (v === true ? 'да' : v === false ? '—' : v ?? '');
async function load() { forms.value = (await auth.api<any>('/studio/forms')).forms; }
async function open(id: string) { active.value = await auth.api(`/studio/forms/${id}`); entry.value = {}; fErr.value = ''; }

async function addRecord() {
  fErr.value = '';
  try {
    await auth.api(`/studio/forms/${active.value.form.id}/records`, { method: 'POST', body: { data: entry.value } });
    toast('Запись добавлена'); entry.value = {}; await open(active.value.form.id);
  } catch (e: any) { fErr.value = e.message; }
}
async function delRecord(r: any) { await auth.api(`/studio/forms/${active.value.form.id}/records/${r.id}`, { method: 'DELETE' }); await open(active.value.form.id); }

function openBuilder(f?: any) {
  builder.value = f
    ? { id: f.id, name: f.name, key: f.key, icon: f.icon, description: f.description || '', fields: f.fields.map((x: any) => ({ ...x, _opts: (x.options || []).join(', ') })) }
    : { name: '', key: '', icon: '▤', description: '', fields: [{ label: '', key: '', type: 'text', required: false }] };
  bErr.value = '';
}
async function saveForm() {
  bErr.value = '';
  const fields = builder.value.fields.filter((f: any) => f.label && f.key).map((f: any) => ({
    key: f.key, label: f.label, type: f.type, required: !!f.required,
    ...(f.type === 'select' ? { options: (f._opts || '').split(',').map((s: string) => s.trim()).filter(Boolean) } : {}),
  }));
  if (!fields.length) { bErr.value = 'Добавьте хотя бы одно поле с ключом и названием'; return; }
  try {
    if (builder.value.id) await auth.api(`/studio/forms/${builder.value.id}`, { method: 'PATCH', body: { name: builder.value.name, description: builder.value.description, icon: builder.value.icon, fields } });
    else await auth.api('/studio/forms', { method: 'POST', body: { key: builder.value.key, name: builder.value.name, description: builder.value.description, icon: builder.value.icon, fields } });
    toast('Форма сохранена'); const wasId = builder.value.id; builder.value = null;
    await load(); if (wasId && active.value) await open(wasId);
  } catch (e: any) { bErr.value = e.message; }
}
async function removeForm() {
  if (!builder.value.id) return;
  await auth.api(`/studio/forms/${builder.value.id}`, { method: 'DELETE' });
  toast('Форма удалена'); builder.value = null; active.value = null; await load();
}
onMounted(load);
</script>

<style scoped>
.fgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.fcard { display: flex; align-items: center; gap: 12px; text-align: left; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 14px; cursor: pointer; }
.fcard:hover { border-color: var(--brand); }
.f-ic { width: 44px; height: 44px; border-radius: 10px; background: #eff6ff; color: var(--brand); display: grid; place-items: center; font-size: 22px; }
.f-body { display: flex; flex-direction: column; } .f-body small { color: var(--muted); font-size: 12px; }
.toolbar { display: flex; gap: 8px; }
.fill { display: flex; flex-direction: column; gap: 12px; max-width: 520px; }
.fl { display: flex; flex-direction: column; gap: 4px; } .fl label { font-size: 13px; color: var(--muted); } .req { color: #dc2626; }
.fl input, .fl select, .fl textarea { width: 100%; } .chk { flex-direction: row; align-items: center; gap: 6px; display: flex; }
.frow { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.frow input, .frow select { height: 34px; }
.modal-back { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: center; z-index: 50; padding: 20px; }
.modal { background: #fff; border-radius: 14px; padding: 22px; width: 460px; max-width: 94vw; max-height: 90vh; overflow-y: auto; }
.modal.wide { width: 660px; } .modal h3 { margin: 0 0 8px; } .modal label { font-size: 13px; color: var(--muted); }
.modal input, .modal select { width: 100%; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
.link { background: none; border: none; color: var(--brand); cursor: pointer; } .link.neg { color: #dc2626; }
.btn.red { background: #ef4444; color: #fff; }
</style>
