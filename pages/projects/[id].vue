<template>
  <div v-if="project">
    <div class="panel">
      <div class="panel-head">
        <div>
          <NuxtLink to="/projects" class="muted" style="font-size:13px">← Проекты</NuxtLink>
          <h2 style="margin-top:2px">{{ project.name }} <span class="tag" :class="project.status">{{ statusLabel(project.status) }}</span></h2>
        </div>
        <div class="toolbar">
          <button v-if="canWrite" class="btn ghost sm" @click="openEdit">Изменить</button>
          <button v-if="canManage" class="btn ghost sm" @click="removeProject">Удалить</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="meta-grid">
          <div><span class="muted">Код</span><b>{{ project.code }}</b></div>
          <div><span class="muted">Заказчик</span><b>{{ project.customerName || '—' }}</b></div>
          <div><span class="muted">Менеджер</span><b>{{ project.managerName || '—' }}</b></div>
          <div><span class="muted">Бюджет</span><b>{{ money(Number(project.budgetMinor)) }}</b></div>
          <div><span class="muted">Трудозатраты</span><b :class="overBudget ? 'neg' : ''">{{ money(Number(summary.laborCostMinor)) }}</b></div>
          <div><span class="muted">Часов списано</span><b>{{ summary.hours }}</b></div>
        </div>
        <p v-if="project.description" style="margin-top:10px">{{ project.description }}</p>
      </div>
    </div>

    <!-- Stages -->
    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Этапы</h3><button v-if="canWrite" class="btn ghost sm" @click="addStage">+ Этап</button></div>
      <div class="panel-body">
        <div class="stages">
          <div v-for="s in stages" :key="s.id" class="stage" :class="s.status">
            <div class="stage-name">{{ s.name }}</div>
            <select v-if="canWrite" :value="s.status" class="mini" @change="setStageStatus(s, ($event.target as HTMLSelectElement).value)">
              <option value="pending">Ожидает</option><option value="active">В работе</option><option value="done">Готов</option>
            </select>
            <button v-if="canWrite" class="x" @click="delStage(s)">✕</button>
          </div>
          <span v-if="!stages.length" class="muted">Этапов нет</span>
        </div>
      </div>
    </div>

    <!-- Kanban -->
    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Задачи (канбан)</h3><button v-if="canWrite" class="btn sm" @click="addTask()">+ Задача</button></div>
      <div class="panel-body">
        <div class="board">
          <div v-for="col in COLUMNS" :key="col" class="col">
            <div class="col-head">{{ colLabel(col) }} <span class="cnt">{{ tasksBy(col).length }}</span></div>
            <div v-for="t in tasksBy(col)" :key="t.id" class="card" :class="'p-' + t.priority">
              <div class="card-title">{{ t.title }}</div>
              <div class="card-meta">
                <span v-if="t.assigneeName">{{ t.assigneeName }}</span>
                <span v-if="t.stageId" class="muted">· {{ stageName(t.stageId) }}</span>
                <span v-if="Number(t.estimateHours) > 0" class="muted">· {{ Number(t.estimateHours) }}ч</span>
              </div>
              <div class="card-foot">
                <span class="pri" :class="t.priority">{{ priLabel(t.priority) }}</span>
                <select v-if="canWrite" :value="t.status" class="mini" @change="setTaskStatus(t, ($event.target as HTMLSelectElement).value)">
                  <option v-for="c in COLUMNS" :key="c" :value="c">{{ colLabel(c) }}</option>
                  <option value="cancelled">Отменена</option>
                </select>
                <button v-if="canWrite" class="x" @click="delTask(t)">✕</button>
              </div>
            </div>
            <button v-if="canWrite" class="add-in-col" @click="addTask(col)">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Time log -->
    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Тайм-шит</h3><button v-if="canWrite" class="btn ghost sm" @click="openTime">Списать время</button></div>
      <div class="panel-body">
        <table v-if="entries.length">
          <thead><tr><th>Дата</th><th>Сотрудник</th><th>Задача</th><th class="num">Часы</th><th class="num">Стоимость</th><th>Оплачиваемо</th><th></th></tr></thead>
          <tbody>
            <tr v-for="e in entries" :key="e.id">
              <td>{{ fmtDate(e.date) }}</td>
              <td>{{ e.employeeName }}</td>
              <td>{{ e.taskId ? taskTitle(e.taskId) : '—' }}</td>
              <td class="num">{{ Number(e.hours) }}</td>
              <td class="num">{{ money(Number(e.costMinor)) }}</td>
              <td>{{ e.billable ? 'Да' : 'Нет' }}</td>
              <td><button v-if="canWrite" class="btn ghost sm" @click="delTime(e)">✕</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted">Записей нет</div>
      </div>
    </div>
  </div>

  <!-- Edit project -->
  <Modal v-if="m.show" title="Изменить проект" submit-label="Сохранить" @close="m.show = false" @submit="saveProject">
    <label>Название</label><input v-model="m.name" />
    <div class="row2">
      <div><label>Заказчик</label><input v-model="m.customerName" /></div>
      <div><label>Менеджер</label><select v-model="m.managerId"><option value="">—</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>Бюджет (сум)</label><input v-model.number="m.budgetUzs" type="number" min="0" /></div>
      <div><label>Статус</label><select v-model="m.status"><option v-for="s in STATUSES" :key="s" :value="s">{{ statusLabel(s) }}</option></select></div>
    </div>
    <label>Описание</label><input v-model="m.description" />
  </Modal>

  <!-- Add task -->
  <Modal v-if="tk.show" title="Новая задача" submit-label="Создать" @close="tk.show = false" @submit="saveTask">
    <label>Название</label><input v-model="tk.title" />
    <div class="row2">
      <div><label>Исполнитель</label><select v-model="tk.assigneeId"><option value="">—</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }}</option></select></div>
      <div><label>Этап</label><select v-model="tk.stageId"><option value="">—</option><option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>Приоритет</label><select v-model="tk.priority"><option value="low">Низкий</option><option value="normal">Обычный</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select></div>
      <div><label>Оценка (часов)</label><input v-model.number="tk.estimateHours" type="number" min="0" /></div>
    </div>
  </Modal>

  <!-- Log time -->
  <Modal v-if="tm.show" title="Списать время" submit-label="Записать" @close="tm.show = false" @submit="saveTime">
    <div class="row2">
      <div><label>Сотрудник</label><select v-model="tm.employeeId"><option value="">—</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }}</option></select></div>
      <div><label>Дата</label><input v-model="tm.date" type="date" /></div>
    </div>
    <div class="row2">
      <div><label>Часы</label><input v-model.number="tm.hours" type="number" min="0" step="0.5" /></div>
      <div><label>Задача (необязательно)</label><select v-model="tm.taskId"><option value="">—</option><option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.title }}</option></select></div>
    </div>
    <label class="chk"><input v-model="tm.billable" type="checkbox" /> Оплачиваемо</label>
    <label>Примечание</label><input v-model="tm.note" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const project = ref<any>(null); const stages = ref<any[]>([]); const tasks = ref<any[]>([]); const entries = ref<any[]>([]);
const summary = reactive<any>({ hours: 0, laborCostMinor: 0, budgetMinor: 0, taskCounts: {}, taskTotal: 0 });
const employees = ref<any[]>([]);
const canWrite = computed(() => auth.can('projects.write'));
const canManage = computed(() => auth.can('projects.manage'));
const overBudget = computed(() => Number(summary.laborCostMinor) > Number(project.value?.budgetMinor || 0) && Number(project.value?.budgetMinor) > 0);

const COLUMNS = ['todo', 'in_progress', 'review', 'done'];
const STATUSES = ['planning', 'active', 'on_hold', 'done', 'cancelled'];
const STATUS: Record<string, string> = { planning: 'Планирование', active: 'В работе', on_hold: 'Приостановлен', done: 'Завершён', cancelled: 'Отменён' };
const COL: Record<string, string> = { todo: 'К выполнению', in_progress: 'В работе', review: 'Проверка', done: 'Готово' };
const PRI: Record<string, string> = { low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочный' };
function statusLabel(s: string) { return STATUS[s] || s; }
function colLabel(c: string) { return COL[c] || c; }
function priLabel(p: string) { return PRI[p] || p; }
function tasksBy(col: string) { return tasks.value.filter((t) => t.status === col); }
function stageName(sid: string) { return stages.value.find((s) => s.id === sid)?.name || ''; }
function taskTitle(tid: string) { return tasks.value.find((t) => t.id === tid)?.title || '—'; }

const m = reactive<any>({ show: false, name: '', customerName: '', managerId: '', budgetUzs: 0, status: 'planning', description: '' });
const tk = reactive<any>({ show: false, title: '', assigneeId: '', stageId: '', priority: 'normal', estimateHours: 0, status: 'todo' });
const tm = reactive<any>({ show: false, employeeId: '', taskId: '', date: '', hours: 0, note: '', billable: true });

async function load() {
  const d = await auth.api(`/projects/${id}`);
  project.value = d.project; stages.value = d.stages; tasks.value = d.tasks; Object.assign(summary, d.summary);
  entries.value = (await auth.api(`/projects/${id}/time`)).entries;
}
function openEdit() { Object.assign(m, { show: true, name: project.value.name, customerName: project.value.customerName || '', managerId: project.value.managerId || '', budgetUzs: Number(project.value.budgetMinor) / 100, status: project.value.status, description: project.value.description || '' }); }
async function saveProject() {
  try { await auth.api(`/projects/${id}`, { method: 'PATCH', body: { name: m.name, customerName: m.customerName || null, managerId: m.managerId || null, status: m.status, budgetMinor: Math.round((Number(m.budgetUzs) || 0) * 100), description: m.description || null } }); m.show = false; toast('Сохранено'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
async function removeProject() {
  if (!confirm('Удалить проект со всеми задачами и записями?')) return;
  try { await auth.api(`/projects/${id}`, { method: 'DELETE' }); toast('Удалено'); router.push('/projects'); }
  catch (e: any) { toast(e.message, true); }
}
async function addStage() {
  const name = prompt('Название этапа?'); if (!name) return;
  try { await auth.api(`/projects/${id}/stages`, { method: 'POST', body: { name } }); await load(); }
  catch (e: any) { toast(e.message, true); }
}
async function setStageStatus(s: any, status: string) { try { await auth.api(`/projects/stages/${s.id}`, { method: 'PATCH', body: { status } }); await load(); } catch (e: any) { toast(e.message, true); } }
async function delStage(s: any) { if (!confirm(`Удалить этап «${s.name}»?`)) return; try { await auth.api(`/projects/stages/${s.id}`, { method: 'DELETE' }); await load(); } catch (e: any) { toast(e.message, true); } }
function addTask(col?: string) { Object.assign(tk, { show: true, title: '', assigneeId: '', stageId: '', priority: 'normal', estimateHours: 0, status: col || 'todo' }); }
async function saveTask() {
  try { await auth.api(`/projects/${id}/tasks`, { method: 'POST', body: { title: tk.title, assigneeId: tk.assigneeId || null, stageId: tk.stageId || null, priority: tk.priority, estimateHours: Number(tk.estimateHours) || 0, status: tk.status } }); tk.show = false; toast('Задача создана'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
async function setTaskStatus(t: any, status: string) { try { await auth.api(`/projects/tasks/${t.id}`, { method: 'PATCH', body: { status } }); await load(); } catch (e: any) { toast(e.message, true); } }
async function delTask(t: any) { if (!confirm(`Удалить задачу «${t.title}»?`)) return; try { await auth.api(`/projects/tasks/${t.id}`, { method: 'DELETE' }); await load(); } catch (e: any) { toast(e.message, true); } }
function openTime() { const today = new Date().toISOString().slice(0, 10); Object.assign(tm, { show: true, employeeId: '', taskId: '', date: today, hours: 8, note: '', billable: true }); }
async function saveTime() {
  try {
    if (!tm.employeeId) return toast('Выберите сотрудника', true);
    await auth.api(`/projects/${id}/time`, { method: 'POST', body: { employeeId: tm.employeeId, taskId: tm.taskId || null, date: tm.date, hours: Number(tm.hours), note: tm.note || null, billable: tm.billable } });
    tm.show = false; toast('Время записано'); await load();
  } catch (e: any) { toast(e.message, true); }
}
async function delTime(e: any) { try { await auth.api(`/projects/time/${e.id}`, { method: 'DELETE' }); await load(); } catch (err: any) { toast(err.message, true); } }

onMounted(async () => {
  try { employees.value = (await auth.api('/projects/meta')).employees; } catch {}
  await load();
});
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.active { background: #dbeafe; color: #1e40af; }
.tag.done { background: #dcfce7; color: #166534; }
.tag.on_hold { background: #fef9c3; color: #854d0e; }
.tag.cancelled { background: #fee2e2; color: #991b1b; }
.neg { color: var(--danger, #dc2626); }
.meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.meta-grid > div { display: flex; flex-direction: column; }
.meta-grid span { font-size: 12px; }
.stages { display: flex; gap: 10px; flex-wrap: wrap; }
.stage { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; background: #fff; }
.stage.active { border-color: #93c5fd; background: #eff6ff; }
.stage.done { border-color: #86efac; background: #f0fdf4; }
.stage-name { font-weight: 500; }
.board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: start; }
@media (max-width: 900px) { .board { grid-template-columns: 1fr 1fr; } }
.col { background: #f8fafc; border-radius: 10px; padding: 8px; min-height: 60px; }
.col-head { font-size: 13px; font-weight: 600; color: #475569; padding: 4px 6px 8px; display: flex; justify-content: space-between; }
.cnt { background: #e2e8f0; border-radius: 8px; padding: 0 7px; font-weight: 600; }
.card { background: #fff; border: 1px solid var(--border, #e2e8f0); border-left: 3px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
.card.p-high { border-left-color: #f59e0b; }
.card.p-urgent { border-left-color: #dc2626; }
.card-title { font-weight: 500; font-size: 14px; }
.card-meta { font-size: 12px; color: #64748b; margin-top: 3px; }
.card-foot { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.pri { font-size: 11px; padding: 1px 6px; border-radius: 8px; background: #f1f5f9; color: #475569; }
.pri.high { background: #fef3c7; color: #92400e; }
.pri.urgent { background: #fee2e2; color: #991b1b; }
.mini { font-size: 12px; padding: 2px 4px; }
.x { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 13px; }
.x:hover { color: #dc2626; }
.add-in-col { width: 100%; border: 1px dashed #cbd5e1; background: none; border-radius: 8px; padding: 6px; cursor: pointer; color: #64748b; }
.add-in-col:hover { border-color: var(--accent, #2563eb); color: var(--accent, #2563eb); }
.chk { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
