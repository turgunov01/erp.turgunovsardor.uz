<template>
  <div>
    <ProjectTabs :id="id" :project="project" />
    <div class="panel">
      <div class="panel-head">
        <h3>Доска задач</h3>
        <button v-if="canWrite" class="btn sm" @click="openAdd()">+ Операция</button>
      </div>
      <div class="panel-body">
        <p class="hint">ℹ️ Перетаскивайте карточки мышкой между колонками, чтобы менять статус операции: <b>Очередь → В работе → ОТК → Готово</b>.</p>
        <div class="board">
          <div
            v-for="col in TASK_COLUMNS" :key="col" class="col" :class="{ over: dragOver === col }"
            @dragover.prevent="dragOver = col" @dragleave="dragOver = null" @drop="onDrop(col)"
          >
            <div class="col-head" :class="col">
              <span>{{ COL_LABEL[col] }}</span>
              <span class="cnt">{{ tasksBy(col).length }}</span>
            </div>
            <div class="cards">
              <div
                v-for="t in tasksBy(col)" :key="t.id" class="card" :class="'p-' + t.priority"
                :draggable="canWrite" @dragstart="drag = t" @dragend="drag = null" @click="openEdit(t)"
              >
                <div class="card-title">{{ t.title }}</div>
                <div class="card-meta">
                  <span v-if="t.assigneeName">👤 {{ t.assigneeName }}</span>
                  <span v-if="t.stageId" class="muted">· {{ stageName(t.stageId) }}</span>
                </div>
                <div class="card-foot">
                  <span class="pri" :class="t.priority">{{ PRI_LABEL[t.priority] }}</span>
                  <span v-if="Number(t.estimateHours) > 0" class="est">{{ Number(t.estimateHours) }}ч</span>
                </div>
              </div>
              <div v-if="!tasksBy(col).length" class="empty-col">перетащите сюда</div>
            </div>
            <button v-if="canWrite" class="add-in-col" @click="openAdd(col)">+ добавить</button>
          </div>
        </div>
      </div>
    </div>

    <Modal v-if="tk.show" :title="tk.id ? 'Операция' : 'Новая операция'" submit-label="Сохранить" @close="tk.show = false" @submit="save">
      <label>Что нужно сделать</label>
      <input v-model="tk.title" placeholder="Например: Раскрой листа стали" />
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
const { project, stages, tasks, employees, canWrite, load, loadEmployees, tasksBy, stageName, createTask, patchTask, setTaskStatus, delTask } = useProject(id);

const drag = ref<any>(null);
const dragOver = ref<string | null>(null);
const tk = reactive<any>({ show: false, id: '', title: '', assigneeId: '', stageId: '', priority: 'normal', estimateHours: 0, status: 'todo', dueDate: '' });

async function onDrop(col: string) {
  dragOver.value = null;
  if (!canWrite.value || !drag.value || drag.value.status === col) { drag.value = null; return; }
  const t = drag.value; drag.value = null;
  await setTaskStatus(t.id, col);
}
function openAdd(col?: string) { Object.assign(tk, { show: true, id: '', title: '', assigneeId: '', stageId: '', priority: 'normal', estimateHours: 0, status: col || 'todo', dueDate: '' }); }
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
.board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: start; }
@media (max-width: 900px) { .board { grid-template-columns: 1fr 1fr; } }
.col { background: #f1f5f9; border-radius: 10px; padding: 8px; min-height: 120px; border: 2px solid transparent; transition: border-color .12s, background .12s; }
.col.over { border-color: #2563eb; background: #eff6ff; }
.col-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: #334155; padding: 4px 6px 8px; text-transform: uppercase; letter-spacing: .02em; border-bottom: 2px solid #cbd5e1; }
.col-head.done { border-color: #16a34a; } .col-head.review { border-color: #f59e0b; } .col-head.in_progress { border-color: #2563eb; }
.cnt { background: #e2e8f0; border-radius: 8px; padding: 0 8px; font-size: 12px; }
.cards { display: flex; flex-direction: column; gap: 8px; margin: 8px 0; min-height: 30px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #cbd5e1; border-radius: 8px; padding: 9px 11px; cursor: grab; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.card:hover { border-color: #93c5fd; }
.card:active { cursor: grabbing; }
.card.p-high { border-left-color: #f59e0b; }
.card.p-urgent { border-left-color: #dc2626; }
.card-title { font-weight: 500; font-size: 14px; }
.card-meta { font-size: 12px; color: #64748b; margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
.card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; }
.pri { font-size: 11px; padding: 1px 7px; border-radius: 8px; background: #f1f5f9; color: #475569; }
.pri.high { background: #fef3c7; color: #92400e; }
.pri.urgent { background: #fee2e2; color: #991b1b; }
.est { font-size: 11px; color: #94a3b8; }
.empty-col { text-align: center; color: #cbd5e1; padding: 12px; font-size: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; }
.add-in-col { width: 100%; border: 1px dashed #cbd5e1; background: none; border-radius: 8px; padding: 6px; cursor: pointer; color: #64748b; font-size: 13px; }
.add-in-col:hover { border-color: #2563eb; color: #2563eb; }
</style>
