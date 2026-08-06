<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Отпуска и отсутствия</h2>
      <div class="toolbar">
        <select v-model="status" @change="reload">
          <option value="">Все</option>
          <option value="pending">На согласовании</option>
          <option value="approved">Согласованы</option>
          <option value="rejected">Отклонены</option>
          <option value="cancelled">Отменены</option>
        </select>
        <button v-if="canWrite" class="btn sm" @click="openAdd">+ Заявка</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Сотрудник</th><th>Тип</th><th>С</th><th>По</th><th class="num">Дней</th><th>Причина</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="l in leaves" :key="l.id">
            <td>{{ l.employee?.fullName }}<br><small class="muted">{{ l.employee?.number }}</small></td>
            <td>{{ typeLabel(l.type) }}</td>
            <td>{{ fmtDate(l.startDate) }}</td>
            <td>{{ fmtDate(l.endDate) }}</td>
            <td class="num">{{ l.days }}</td>
            <td>{{ l.reason || '—' }}</td>
            <td><span class="tag" :class="l.status">{{ statusLabel(l.status) }}</span></td>
            <td class="row-actions">
              <template v-if="l.status === 'pending'">
                <button v-if="canApprove" class="btn ghost sm" @click="decide(l, 'approve')">Согласовать</button>
                <button v-if="canApprove" class="btn ghost sm" @click="decide(l, 'reject')">Отклонить</button>
                <button v-if="canWrite" class="btn ghost sm" @click="cancel(l)">Отменить</button>
              </template>
            </td>
          </tr>
          <tr v-if="!leaves.length"><td colspan="8" class="empty">Заявок нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="m.show" title="Новая заявка на отпуск" submit-label="Создать" @close="m.show = false" @submit="submit">
    <label>Сотрудник</label>
    <select v-model="m.employeeId"><option value="">— выберите —</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }} ({{ e.number }})</option></select>
    <div class="row2">
      <div><label>Тип</label><select v-model="m.type"><option value="vacation">Отпуск</option><option value="sick">Больничный</option><option value="unpaid">За свой счёт</option><option value="other">Прочее</option></select></div>
      <div></div>
    </div>
    <div class="row2">
      <div><label>С</label><input v-model="m.startDate" type="date" /></div>
      <div><label>По</label><input v-model="m.endDate" type="date" /></div>
    </div>
    <label>Причина</label><input v-model="m.reason" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const leaves = ref<any[]>([]); const employees = ref<any[]>([]);
const status = ref('');
const canWrite = computed(() => auth.can('hr.write'));
const canApprove = computed(() => auth.can('hr.approve'));

const TYPE: Record<string, string> = { vacation: 'Отпуск', sick: 'Больничный', unpaid: 'За свой счёт', other: 'Прочее' };
const STATUS: Record<string, string> = { pending: 'На согласовании', approved: 'Согласован', rejected: 'Отклонён', cancelled: 'Отменён' };
function typeLabel(t: string) { return TYPE[t] || t; }
function statusLabel(s: string) { return STATUS[s] || s; }

const m = reactive<any>({ show: false, employeeId: '', type: 'vacation', startDate: '', endDate: '', reason: '' });

async function reload() {
  const qs = status.value ? `?status=${status.value}` : '';
  leaves.value = (await auth.api(`/hr/leaves${qs}`)).leaves;
}
function openAdd() { Object.assign(m, { show: true, employeeId: '', type: 'vacation', startDate: '', endDate: '', reason: '' }); }
async function submit() {
  try {
    if (!m.employeeId) return toast('Выберите сотрудника', true);
    await auth.api('/hr/leaves', { method: 'POST', body: { employeeId: m.employeeId, type: m.type, startDate: m.startDate, endDate: m.endDate, reason: m.reason || null } });
    m.show = false; toast('Заявка создана'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function decide(l: any, action: 'approve' | 'reject') {
  try { await auth.api(`/hr/leaves/${l.id}/${action}`, { method: 'POST' }); toast(action === 'approve' ? 'Согласовано' : 'Отклонено'); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
async function cancel(l: any) {
  try { await auth.api(`/hr/leaves/${l.id}/cancel`, { method: 'POST' }); toast('Отменено'); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  employees.value = (await auth.api('/hr/employees?status=active')).employees;
  await reload();
});
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.approved { background: #dcfce7; color: #166534; }
.tag.pending { background: #fef9c3; color: #854d0e; }
.tag.rejected { background: #fee2e2; color: #991b1b; }
.tag.cancelled { background: #e2e8f0; color: #475569; }
.row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
