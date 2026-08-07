<template>
  <div>
    <ProjectTabs :id="id" :project="project" />
    <div class="panel">
      <div class="panel-head">
        <h3>Все операции</h3>
        <div class="toolbar">
          <input v-model="search" placeholder="Поиск…" />
          <select v-model="fStatus"><option value="">Любой статус</option><option v-for="c in ALL_STATUSES" :key="c" :value="c">{{ COL_LABEL[c] }}</option></select>
          <select v-model="fPri"><option value="">Любой приоритет</option><option v-for="p in PRIS" :key="p" :value="p">{{ PRI_LABEL[p] }}</option></select>
          <button v-if="canWrite" class="btn sm" @click="openAdd()">+ Операция</button>
        </div>
      </div>
      <div class="panel-body">
        <p class="hint">ℹ️ Полный список операций проекта. Здесь удобно назначать исполнителей и сроки. Для перетаскивания по статусам — вкладка «Доска».</p>
        <table>
          <thead><tr><th>Операция</th><th>Исполнитель</th><th>Этап</th><th>Приоритет</th><th>Статус</th><th class="num">Оценка</th><th>Срок</th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in filtered" :key="t.id">
              <td><strong>{{ t.title }}</strong></td>
              <td>{{ t.assigneeName || '—' }}</td>
              <td>{{ t.stageId ? stageName(t.stageId) : '—' }}</td>
              <td><span class="pri" :class="t.priority">{{ PRI_LABEL[t.priority] }}</span></td>
              <td><span class="st" :class="t.status">{{ COL_LABEL[t.status] }}</span></td>
              <td class="num">{{ Number(t.estimateHours) > 0 ? Number(t.estimateHours) + 'ч' : '—' }}</td>
              <td>{{ t.dueDate ? t.dueDate.slice(0, 10) : '—' }}</td>
              <td class="ra"><button v-if="canWrite" class="btn ghost sm" @click="openEdit(t)">Изменить</button></td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="8" class="empty">Операций нет. Нажмите «+ Операция», чтобы добавить.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="tk.show" :title="tk.id ? 'Операция' : 'Новая операция'" submit-label="Сохранить" @close="tk.show = false" @submit="save">
      <label>Что нужно сделать</label>
      <input v-model="tk.title" placeholder="Например: Сборка каркаса" />
      <div class="row2">
        <div><label>Исполнитель</label><select v-model="tk.assigneeId"><option value="">— не назначен —</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }}</option></select></div>
        <div><label>Этап производства</label><select v-model="tk.stageId"><option value="">— без этапа —</option><option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option></select></div>
      </div>
      <div class="row2">
        <div><label>Приоритет</label><select v-model="tk.priority"><option value="low">Низкий</option><option value="normal">Обычный</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select></div>
        <div><label>Оценка, часов</label><input v-model.number="tk.estimateHours" type="number" min="0" step="0.5" /></div>
      </div>
      <div class="row2">
        <div><label>Статус</label><select v-model="tk.status"><option v-for="c in TASK_COLUMNS" :key="c" :value="c">{{ COL_LABEL[c] }}</option><option value="cancelled">Отменено</option></select></div>
        <div><label>Срок</label><input v-model="tk.dueDate" type="date" /></div>
      </div>
      <div v-if="tk.id" style="margin-top:12px"><button type="button" class="btn red sm" @click="removeTask">Удалить операцию</button></div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const route = useRoute();
const id = route.params.id as string;
const { project, stages, tasks, employees, canWrite, load, loadEmployees, stageName, createTask, patchTask, delTask } = useProject(id);

const ALL_STATUSES = [...TASK_COLUMNS, 'cancelled'];
const PRIS = ['low', 'normal', 'high', 'urgent'];
const search = ref(''); const fStatus = ref(''); const fPri = ref('');
const tk = reactive<any>({ show: false, id: '', title: '', assigneeId: '', stageId: '', priority: 'normal', estimateHours: 0, status: 'todo', dueDate: '' });

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return tasks.value.filter((t: any) =>
    (!fStatus.value || t.status === fStatus.value) &&
    (!fPri.value || t.priority === fPri.value) &&
    (!q || (t.title || '').toLowerCase().includes(q) || (t.assigneeName || '').toLowerCase().includes(q)));
});

function openAdd() { Object.assign(tk, { show: true, id: '', title: '', assigneeId: '', stageId: '', priority: 'normal', estimateHours: 0, status: 'todo', dueDate: '' }); }
function openEdit(t: any) { Object.assign(tk, { show: true, id: t.id, title: t.title, assigneeId: t.assigneeId || '', stageId: t.stageId || '', priority: t.priority, estimateHours: Number(t.estimateHours) || 0, status: t.status, dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '' }); }
async function save() {
  if (!tk.title) return;
  const body = { title: tk.title, assigneeId: tk.assigneeId || null, stageId: tk.stageId || null, priority: tk.priority, estimateHours: Number(tk.estimateHours) || 0, status: tk.status, dueDate: tk.dueDate || null };
  const ok = tk.id ? await patchTask(tk.id, body) : await createTask(body);
  if (ok) tk.show = false;
}
async function removeTask() { const t = tasks.value.find((x: any) => x.id === tk.id); tk.show = false; if (t) await delTask(t); }

onMounted(async () => { await Promise.all([load(), loadEmployees()]); });
</script>

<style scoped>
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 10px 14px; margin: 0 0 14px; font-size: 14px; }
.ra { text-align: right; }
.pri, .st { font-size: 12px; padding: 2px 9px; border-radius: 10px; background: #f1f5f9; color: #475569; font-weight: 600; }
.pri.high { background: #fef3c7; color: #92400e; }
.pri.urgent { background: #fee2e2; color: #991b1b; }
.st.in_progress { background: #dbeafe; color: #1e40af; }
.st.review { background: #fef3c7; color: #92400e; }
.st.done { background: #dcfce7; color: #166534; }
.st.cancelled { background: #fee2e2; color: #991b1b; }
</style>
