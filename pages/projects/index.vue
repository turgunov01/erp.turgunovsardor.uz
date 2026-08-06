<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Проекты</h2>
      <div class="toolbar">
        <input v-model="search" placeholder="Поиск по названию" @keydown.enter="reload" />
        <select v-model="status" @change="reload">
          <option value="">Все статусы</option>
          <option v-for="s in STATUSES" :key="s" :value="s">{{ statusLabel(s) }}</option>
        </select>
        <button v-if="canWrite" class="btn sm" @click="openAdd">+ Проект</button>
      </div>
    </div>

    <div v-if="ov" class="kpis" style="margin:0 0 12px">
      <div class="kpi"><div class="kpi-label">Всего проектов</div><div class="kpi-val">{{ ov.total }}</div></div>
      <div class="kpi"><div class="kpi-label">Активных</div><div class="kpi-val">{{ ov.active }}</div></div>
      <div class="kpi"><div class="kpi-label">Завершено</div><div class="kpi-val">{{ ov.done }}</div></div>
      <div class="kpi"><div class="kpi-label">Часов списано</div><div class="kpi-val">{{ ov.hours }}</div></div>
      <div class="kpi"><div class="kpi-label">Трудозатраты</div><div class="kpi-val">{{ money(Number(ov.laborCostMinor)) }}</div></div>
    </div>

    <div class="panel-body">
      <table>
        <thead><tr><th>Код</th><th>Название</th><th>Заказчик</th><th>Менеджер</th><th class="num">Задач</th><th class="num">Бюджет</th><th>Статус</th></tr></thead>
        <tbody>
          <tr v-for="p in projects" :key="p.id" class="clickable" @click="open(p)">
            <td><small class="muted">{{ p.code }}</small></td>
            <td>{{ p.name }}</td>
            <td>{{ p.customerName || '—' }}</td>
            <td>{{ p.managerName || '—' }}</td>
            <td class="num">{{ p._count.tasks }}</td>
            <td class="num">{{ money(Number(p.budgetMinor)) }}</td>
            <td><span class="tag" :class="p.status">{{ statusLabel(p.status) }}</span></td>
          </tr>
          <tr v-if="!projects.length"><td colspan="7" class="empty">Проектов нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="m.show" title="Новый проект" submit-label="Создать" @close="m.show = false" @submit="submit">
    <label>Название</label><input v-model="m.name" />
    <div class="row2">
      <div><label>Заказчик</label><input v-model="m.customerName" /></div>
      <div><label>Менеджер</label><select v-model="m.managerId"><option value="">—</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>Бюджет (сум)</label><input v-model.number="m.budgetUzs" type="number" min="0" /></div>
      <div><label>Статус</label><select v-model="m.status"><option v-for="s in STATUSES" :key="s" :value="s">{{ statusLabel(s) }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>Начало</label><input v-model="m.startDate" type="date" /></div>
      <div><label>Плановое завершение</label><input v-model="m.endDate" type="date" /></div>
    </div>
    <label>Описание</label><input v-model="m.description" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const router = useRouter();
const projects = ref<any[]>([]); const employees = ref<any[]>([]); const ov = ref<any>(null);
const search = ref(''); const status = ref('');
const canWrite = computed(() => auth.can('projects.write'));

const STATUSES = ['planning', 'active', 'on_hold', 'done', 'cancelled'];
const STATUS: Record<string, string> = { planning: 'Планирование', active: 'В работе', on_hold: 'Приостановлен', done: 'Завершён', cancelled: 'Отменён' };
function statusLabel(s: string) { return STATUS[s] || s; }

const m = reactive<any>({ show: false, name: '', customerName: '', managerId: '', budgetUzs: 0, status: 'planning', startDate: '', endDate: '', description: '' });

async function reload() {
  const qs = new URLSearchParams({ ...(status.value ? { status: status.value } : {}), ...(search.value ? { q: search.value } : {}) });
  projects.value = (await auth.api(`/projects?${qs}`)).projects;
}
async function loadOverview() { ov.value = await auth.api('/projects/summary/overview'); }
function open(p: any) { router.push(`/projects/${p.id}`); }
function openAdd() { Object.assign(m, { show: true, name: '', customerName: '', managerId: '', budgetUzs: 0, status: 'planning', startDate: '', endDate: '', description: '' }); }
async function submit() {
  try {
    const body: any = { name: m.name, customerName: m.customerName || null, managerId: m.managerId || null, status: m.status, budgetMinor: Math.round((Number(m.budgetUzs) || 0) * 100), description: m.description || null, ...(m.startDate ? { startDate: m.startDate } : {}), ...(m.endDate ? { endDate: m.endDate } : {}) };
    const r = await auth.api('/projects', { method: 'POST', body });
    m.show = false; toast('Проект создан'); router.push(`/projects/${r.project.id}`);
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  try { employees.value = (await auth.api('/projects/meta')).employees; } catch {}
  await Promise.all([reload(), loadOverview()]);
});
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.active { background: #dbeafe; color: #1e40af; }
.tag.done { background: #dcfce7; color: #166534; }
.tag.on_hold { background: #fef9c3; color: #854d0e; }
.tag.cancelled { background: #fee2e2; color: #991b1b; }
.clickable { cursor: pointer; }
.clickable:hover { background: #f8fafc; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
