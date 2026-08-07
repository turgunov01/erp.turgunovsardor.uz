<template>
  <div>
    <ProjectTabs :id="id" :project="project" />

    <div class="panel">
      <div class="panel-head">
        <h3>Бюджет и трудозатраты</h3>
        <div class="toolbar">
          <button v-if="canWrite" class="btn ghost sm" @click="openEdit">Изменить проект</button>
          <button v-if="canManage" class="btn ghost sm" @click="removeProject">Удалить</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="kpis">
          <div class="kpi"><div class="kpi-label">Бюджет</div><div class="kpi-val">{{ money(Number(project?.budgetMinor || 0)) }}</div></div>
          <div class="kpi"><div class="kpi-label">Трудозатраты (факт)</div><div class="kpi-val" :class="overBudget ? 'neg' : ''">{{ money(Number(summary.laborCostMinor)) }}</div></div>
          <div class="kpi"><div class="kpi-label">Часов списано</div><div class="kpi-val">{{ summary.hours }}</div></div>
          <div class="kpi"><div class="kpi-label">Операций всего</div><div class="kpi-val">{{ summary.taskTotal }}</div></div>
        </div>
        <p v-if="overBudget" class="warn">⚠️ Трудозатраты превысили бюджет проекта.</p>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head">
        <h3>Списанное время</h3>
        <button v-if="canWrite" class="btn sm" @click="openTime">+ Списать время</button>
      </div>
      <div class="panel-body">
        <p class="hint">ℹ️ Здесь сотрудники отмечают, сколько часов они потратили. Стоимость считается автоматически по зарплате сотрудника.</p>
        <table v-if="entries.length">
          <thead><tr><th>Дата</th><th>Сотрудник</th><th>Операция</th><th class="num">Часы</th><th class="num">Стоимость</th><th>Оплач.</th><th></th></tr></thead>
          <tbody>
            <tr v-for="e in entries" :key="e.id">
              <td>{{ fmtDate(e.date) }}</td>
              <td>{{ e.employeeName }}</td>
              <td>{{ e.taskId ? taskTitle(e.taskId) : '—' }}</td>
              <td class="num">{{ Number(e.hours) }}</td>
              <td class="num">{{ money(Number(e.costMinor)) }}</td>
              <td>{{ e.billable ? 'Да' : 'Нет' }}</td>
              <td class="ra"><button v-if="canWrite" class="btn ghost sm" @click="delTime(e)">✕</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted">Записей пока нет.</div>
      </div>
    </div>

    <!-- Edit project -->
    <Modal v-if="m.show" title="Изменить проект" submit-label="Сохранить" @close="m.show = false" @submit="doSaveProject">
      <label>Название</label><input v-model="m.name" />
      <div class="row2">
        <div><label>Заказчик</label><input v-model="m.customerName" /></div>
        <div><label>Менеджер</label><select v-model="m.managerId"><option value="">—</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }}</option></select></div>
      </div>
      <div class="row2">
        <div><label>Бюджет (сум)</label><input v-model.number="m.budgetUzs" type="number" min="0" /></div>
        <div><label>Статус</label><select v-model="m.status"><option v-for="s in PROJ_STATUSES" :key="s" :value="s">{{ PROJ_STATUS[s] }}</option></select></div>
      </div>
      <label>Описание</label><input v-model="m.description" />
    </Modal>

    <!-- Log time -->
    <Modal v-if="tm.show" title="Списать время" submit-label="Записать" @close="tm.show = false" @submit="doAddTime">
      <div class="row2">
        <div><label>Сотрудник</label><select v-model="tm.employeeId"><option value="">—</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }}</option></select></div>
        <div><label>Дата</label><input v-model="tm.date" type="date" /></div>
      </div>
      <div class="row2">
        <div><label>Часы</label><input v-model.number="tm.hours" type="number" min="0" step="0.5" /></div>
        <div><label>Операция (необязательно)</label><select v-model="tm.taskId"><option value="">—</option><option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.title }}</option></select></div>
      </div>
      <label class="chk"><input v-model="tm.billable" type="checkbox" /> Оплачиваемо</label>
      <label>Примечание</label><input v-model="tm.note" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const route = useRoute();
const router = useRouter();
const { toast } = useToast();
const auth = useAuth();
const id = route.params.id as string;
const { project, tasks, entries, employees, summary, canWrite, canManage, overBudget, load, loadTime, loadEmployees, taskTitle, saveProject, addTime, delTime } = useProject(id);

const m = reactive<any>({ show: false, name: '', customerName: '', managerId: '', budgetUzs: 0, status: 'planning', description: '' });
const tm = reactive<any>({ show: false, employeeId: '', taskId: '', date: '', hours: 8, note: '', billable: true });

function openEdit() { const p = project.value; Object.assign(m, { show: true, name: p.name, customerName: p.customerName || '', managerId: p.managerId || '', budgetUzs: Number(p.budgetMinor) / 100, status: p.status, description: p.description || '' }); }
async function doSaveProject() {
  const ok = await saveProject({ name: m.name, customerName: m.customerName || null, managerId: m.managerId || null, status: m.status, budgetMinor: Math.round((Number(m.budgetUzs) || 0) * 100), description: m.description || null });
  if (ok) m.show = false;
}
async function removeProject() {
  if (!confirm('Удалить проект со всеми операциями и записями времени?')) return;
  try { await auth.api(`/projects/${id}`, { method: 'DELETE' }); toast('Удалено'); router.push('/projects'); }
  catch (e: any) { toast(e.message, true); }
}
function openTime() { const today = new Date().toISOString().slice(0, 10); Object.assign(tm, { show: true, employeeId: '', taskId: '', date: today, hours: 8, note: '', billable: true }); }
async function doAddTime() {
  if (!tm.employeeId) return toast('Выберите сотрудника', true);
  const ok = await addTime({ employeeId: tm.employeeId, taskId: tm.taskId || null, date: tm.date, hours: Number(tm.hours), note: tm.note || null, billable: tm.billable });
  if (ok) tm.show = false;
}

onMounted(async () => { await Promise.all([load(), loadTime(), loadEmployees()]); });
</script>

<style scoped>
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 10px 14px; margin: 0 0 14px; font-size: 14px; }
.warn { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; padding: 8px 12px; margin: 12px 0 0; }
.ra { text-align: right; }
.neg { color: #dc2626; }
.chk { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
</style>
