<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Сотрудники</h2>
      <div class="toolbar">
        <input v-model="search" placeholder="Поиск по ФИО" @keydown.enter="reload" />
        <select v-model="status" @change="reload">
          <option value="">Все статусы</option>
          <option value="active">Работают</option>
          <option value="on_leave">В отпуске</option>
          <option value="terminated">Уволены</option>
        </select>
        <button v-if="canWrite" class="btn sm" @click="openAdd">+ Сотрудник</button>
      </div>
    </div>

    <div v-if="sum" class="kpis" style="margin:0 0 12px">
      <div class="kpi"><div class="kpi-label">Всего</div><div class="kpi-val">{{ sum.headcount.total }}</div></div>
      <div class="kpi"><div class="kpi-label">Работают</div><div class="kpi-val">{{ sum.headcount.active }}</div></div>
      <div class="kpi"><div class="kpi-label">В отпуске</div><div class="kpi-val">{{ sum.headcount.onLeave }}</div></div>
      <div class="kpi"><div class="kpi-label">Заявок на отпуск</div><div class="kpi-val">{{ sum.pendingLeaves }}</div></div>
    </div>

    <div class="panel-body">
      <table>
        <thead><tr><th>Таб. №</th><th>ФИО</th><th>Подразделение</th><th>Должность</th><th class="num">Оклад</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="e in employees" :key="e.id">
            <td><small class="muted">{{ e.number }}</small></td>
            <td><a href="#" @click.prevent="openDetail(e)">{{ e.fullName }}</a></td>
            <td>{{ e.department?.name || '—' }}</td>
            <td>{{ e.position?.name || '—' }}</td>
            <td class="num">{{ money(Number(e.baseSalaryMinor)) }}</td>
            <td><span class="tag" :class="e.status">{{ statusLabel(e.status) }}</span></td>
            <td class="row-actions">
              <button v-if="canWrite" class="btn ghost sm" @click="openEdit(e)">Изменить</button>
              <button v-if="canWrite && e.status !== 'terminated'" class="btn ghost sm" @click="terminate(e)">Уволить</button>
            </td>
          </tr>
          <tr v-if="!employees.length"><td colspan="7" class="empty">Сотрудников нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="m.show" :title="m.id ? 'Изменить сотрудника' : 'Новый сотрудник'" submit-label="Сохранить" @close="m.show = false" @submit="submit">
    <label>ФИО</label><input v-model="m.fullName" />
    <div class="row2">
      <div><label>Подразделение</label><select v-model="m.departmentId"><option value="">—</option><option v-for="d in meta.departments" :key="d.id" :value="d.id">{{ d.name }}</option></select></div>
      <div><label>Должность</label><select v-model="m.positionId"><option value="">—</option><option v-for="p in meta.positions" :key="p.id" :value="p.id">{{ p.name }}</option></select></div>
    </div>
    <div class="row2">
      <div><label>Оклад (сум/мес)</label><input v-model.number="m.salaryUzs" type="number" min="0" /></div>
      <div><label>Тип занятости</label><select v-model="m.employmentType"><option value="full_time">Полная</option><option value="part_time">Частичная</option><option value="contract">Договор</option></select></div>
    </div>
    <div class="row2">
      <div><label>Дата приёма</label><input v-model="m.hireDate" type="date" /></div>
      <div><label>Дата рождения</label><input v-model="m.birthDate" type="date" /></div>
    </div>
    <div class="row2">
      <div><label>Телефон</label><input v-model="m.phone" /></div>
      <div><label>Email</label><input v-model="m.email" /></div>
    </div>
    <label>Адрес</label><input v-model="m.address" />
    <label>Примечание</label><input v-model="m.note" />
  </Modal>

  <Modal v-if="d.show" :title="d.employee?.fullName || 'Сотрудник'" submit-label="Закрыть" wide @close="d.show = false" @submit="d.show = false">
    <div v-if="d.employee">
      <div class="row2">
        <div><label>Таб. №</label><div>{{ d.employee.number }}</div></div>
        <div><label>Статус</label><div><span class="tag" :class="d.employee.status">{{ statusLabel(d.employee.status) }}</span></div></div>
      </div>
      <div class="row2">
        <div><label>Подразделение</label><div>{{ d.employee.department?.name || '—' }}</div></div>
        <div><label>Должность</label><div>{{ d.employee.position?.name || '—' }}</div></div>
      </div>
      <div class="row2">
        <div><label>Оклад</label><div>{{ money(Number(d.employee.baseSalaryMinor)) }}</div></div>
        <div><label>Принят</label><div>{{ fmtDate(d.employee.hireDate) }}</div></div>
      </div>
      <div class="row2">
        <div><label>Телефон</label><div>{{ d.employee.phone || '—' }}</div></div>
        <div><label>Email</label><div>{{ d.employee.email || '—' }}</div></div>
      </div>
      <h4 style="margin:14px 0 6px">Отпуска и отсутствия</h4>
      <table v-if="d.leaves.length"><thead><tr><th>Тип</th><th>С</th><th>По</th><th>Дней</th><th>Статус</th></tr></thead>
        <tbody><tr v-for="l in d.leaves" :key="l.id"><td>{{ leaveTypeLabel(l.type) }}</td><td>{{ fmtDate(l.startDate) }}</td><td>{{ fmtDate(l.endDate) }}</td><td>{{ l.days }}</td><td>{{ leaveStatusLabel(l.status) }}</td></tr></tbody>
      </table>
      <div v-else class="muted">Нет записей</div>
      <h4 style="margin:14px 0 6px">Начисления зарплаты</h4>
      <table v-if="d.payrollItems.length"><thead><tr><th>Период</th><th class="num">Начислено</th><th class="num">Налог</th><th class="num">К выплате</th></tr></thead>
        <tbody><tr v-for="pi in d.payrollItems" :key="pi.id"><td>{{ pi.run?.periodCode }}</td><td class="num">{{ money(Number(pi.grossMinor)) }}</td><td class="num">{{ money(Number(pi.taxMinor)) }}</td><td class="num">{{ money(Number(pi.netMinor)) }}</td></tr></tbody>
      </table>
      <div v-else class="muted">Нет записей</div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const employees = ref<any[]>([]); const meta = reactive<any>({ departments: [], positions: [] });
const sum = ref<any>(null);
const search = ref(''); const status = ref('');
const canWrite = computed(() => auth.can('hr.write'));

const STATUS: Record<string, string> = { active: 'Работает', on_leave: 'В отпуске', terminated: 'Уволен' };
const LEAVE_TYPE: Record<string, string> = { vacation: 'Отпуск', sick: 'Больничный', unpaid: 'За свой счёт', other: 'Прочее' };
const LEAVE_STATUS: Record<string, string> = { pending: 'На согласовании', approved: 'Согласован', rejected: 'Отклонён', cancelled: 'Отменён' };
function statusLabel(s: string) { return STATUS[s] || s; }
function leaveTypeLabel(t: string) { return LEAVE_TYPE[t] || t; }
function leaveStatusLabel(s: string) { return LEAVE_STATUS[s] || s; }

const m = reactive<any>({ show: false, id: '', fullName: '', departmentId: '', positionId: '', salaryUzs: 0, employmentType: 'full_time', hireDate: '', birthDate: '', phone: '', email: '', address: '', note: '' });
const d = reactive<any>({ show: false, employee: null, leaves: [], attendances: [], payrollItems: [] });

async function reload() {
  const qs = new URLSearchParams({ ...(status.value ? { status: status.value } : {}), ...(search.value ? { q: search.value } : {}) });
  employees.value = (await auth.api(`/hr/employees?${qs}`)).employees;
}
function openAdd() { Object.assign(m, { show: true, id: '', fullName: '', departmentId: '', positionId: '', salaryUzs: 0, employmentType: 'full_time', hireDate: '', birthDate: '', phone: '', email: '', address: '', note: '' }); }
function openEdit(e: any) {
  Object.assign(m, { show: true, id: e.id, fullName: e.fullName, departmentId: e.departmentId || '', positionId: e.positionId || '', salaryUzs: Number(e.baseSalaryMinor) / 100, employmentType: e.employmentType, hireDate: e.hireDate?.slice(0, 10) || '', birthDate: e.birthDate?.slice(0, 10) || '', phone: e.phone || '', email: e.email || '', address: e.address || '', note: e.note || '' });
}
async function openDetail(e: any) {
  const r = await auth.api(`/hr/employees/${e.id}`);
  Object.assign(d, { show: true, employee: r.employee, leaves: r.leaves, attendances: r.attendances, payrollItems: r.payrollItems });
}
async function submit() {
  try {
    const body: any = {
      fullName: m.fullName, departmentId: m.departmentId || null, positionId: m.positionId || null,
      baseSalaryMinor: Math.round((Number(m.salaryUzs) || 0) * 100), employmentType: m.employmentType,
      phone: m.phone || null, email: m.email || null, address: m.address || null, note: m.note || null,
      ...(m.hireDate ? { hireDate: m.hireDate } : {}), ...(m.birthDate ? { birthDate: m.birthDate } : {}),
    };
    if (m.id) await auth.api(`/hr/employees/${m.id}`, { method: 'PATCH', body });
    else await auth.api('/hr/employees', { method: 'POST', body });
    m.show = false; toast('Сохранено'); await Promise.all([reload(), loadSummary()]);
  } catch (e: any) { toast(e.message, true); }
}
async function terminate(e: any) {
  if (!confirm(`Уволить сотрудника «${e.fullName}»?`)) return;
  try { await auth.api(`/hr/employees/${e.id}/terminate`, { method: 'POST', body: {} }); toast('Сотрудник уволен'); await Promise.all([reload(), loadSummary()]); }
  catch (err: any) { toast(err.message, true); }
}
async function loadSummary() { sum.value = await auth.api('/hr/summary'); }

onMounted(async () => {
  Object.assign(meta, await auth.api('/hr/meta'));
  await Promise.all([reload(), loadSummary()]);
});
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.active { background: #dcfce7; color: #166534; }
.tag.on_leave { background: #fef9c3; color: #854d0e; }
.tag.terminated { background: #fee2e2; color: #991b1b; }
.row-actions { display: flex; gap: 6px; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
