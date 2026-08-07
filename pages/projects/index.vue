<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Производственные проекты</h2>
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
      <p class="hint">ℹ️ Каждый проект — это производственный заказ. Нажмите «Подробнее», чтобы открыть проект и вести его как в Jira: доска операций, этапы производства и учёт времени.</p>

      <div v-if="projects.length" class="cards">
        <div v-for="p in projects" :key="p.id" class="pcard" @click="open(p)">
          <div class="pcard-top">
            <span class="code">{{ p.code }}</span>
            <span class="tag" :class="p.status">{{ statusLabel(p.status) }}</span>
          </div>
          <div class="pcard-name">{{ p.name }}</div>
          <div class="pcard-rows">
            <div><span class="lab">Заказчик</span><span>{{ p.customerName || '—' }}</span></div>
            <div><span class="lab">Менеджер</span><span>{{ p.managerName || '—' }}</span></div>
          </div>
          <div class="pcard-metrics">
            <div class="metric"><b>{{ p._count.tasks }}</b><small>операций</small></div>
            <div class="metric"><b>{{ money(Number(p.budgetMinor)) }}</b><small>бюджет</small></div>
          </div>
          <button class="btn details" @click.stop="open(p)">Подробнее →</button>
        </div>
      </div>
      <div v-else class="empty-block">Проектов нет. Нажмите «+ Проект», чтобы создать первый.</div>
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
const STATUS: Record<string, string> = { planning: 'Планирование', active: 'В производстве', on_hold: 'Приостановлен', done: 'Завершён', cancelled: 'Отменён' };
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
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 10px 14px; margin: 0 0 12px; font-size: 14px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.pcard { display: flex; flex-direction: column; gap: 10px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fff; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .1s; }
.pcard:hover { border-color: #2563eb; box-shadow: 0 4px 14px rgba(37,99,235,.12); transform: translateY(-2px); }
.pcard-top { display: flex; justify-content: space-between; align-items: center; }
.code { font-family: ui-monospace, monospace; font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
.pcard-name { font-size: 17px; font-weight: 700; line-height: 1.25; }
.pcard-rows { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.pcard-rows > div { display: flex; justify-content: space-between; gap: 8px; }
.pcard-rows .lab { color: #94a3b8; }
.pcard-metrics { display: flex; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
.metric { flex: 1; text-align: center; background: #f8fafc; border-radius: 8px; padding: 8px; }
.metric b { display: block; font-size: 16px; }
.metric small { color: #64748b; font-size: 11px; }
.btn.details { width: 100%; background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 9px; font-weight: 600; cursor: pointer; }
.btn.details:hover { background: #1e40af; }
.empty-block { border: 1px dashed #cbd5e1; border-radius: 12px; padding: 28px; text-align: center; color: #64748b; }

label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
