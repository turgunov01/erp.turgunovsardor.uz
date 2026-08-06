<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Табель учёта времени</h2>
      <div class="toolbar">
        <input v-model="periodCode" type="month" @change="reload" />
        <button v-if="canWrite" class="btn sm" @click="generate">Заполнить по норме</button>
      </div>
    </div>
    <div class="panel-body">
      <p class="muted" style="margin:0 0 10px">Отработанные и нормативные рабочие дни за период. Используется при расчёте зарплаты.</p>
      <table>
        <thead><tr><th>Сотрудник</th><th class="num">Отработано</th><th class="num">Норма</th><th class="num">Отсутствий</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.employeeId">
            <td>{{ r.employee.fullName }}<br><small class="muted">{{ r.employee.number }}</small></td>
            <template v-if="editId === r.employeeId">
              <td class="num"><input v-model.number="edit.workedDays" type="number" min="0" max="31" style="width:70px" /></td>
              <td class="num"><input v-model.number="edit.normDays" type="number" min="0" max="31" style="width:70px" /></td>
              <td class="num"><input v-model.number="edit.absentDays" type="number" min="0" max="31" style="width:70px" /></td>
              <td class="row-actions"><button class="btn sm" @click="save(r)">Сохранить</button><button class="btn ghost sm" @click="editId = ''">Отмена</button></td>
            </template>
            <template v-else>
              <td class="num">{{ r.workedDays }}</td>
              <td class="num">{{ r.normDays }}</td>
              <td class="num">{{ r.absentDays }}</td>
              <td class="row-actions"><button v-if="canWrite" class="btn ghost sm" @click="startEdit(r)">Изменить</button></td>
            </template>
          </tr>
          <tr v-if="!rows.length"><td colspan="5" class="empty">Нет данных за период. Нажмите «Заполнить по норме» или добавьте сотрудников.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const rows = ref<any[]>([]);
const employees = ref<any[]>([]);
const canWrite = computed(() => auth.can('hr.write'));
const now = new Date();
const periodCode = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
const editId = ref('');
const edit = reactive<any>({ workedDays: 0, normDays: 0, absentDays: 0 });

async function reload() {
  const r = await auth.api(`/hr/attendance?periodCode=${periodCode.value}`);
  rows.value = r.attendances;
}
async function generate() {
  const normDays = Number(prompt('Норма рабочих дней в месяце?', '22') || 0);
  if (!normDays) return;
  try { const r = await auth.api('/hr/attendance/generate', { method: 'POST', body: { periodCode: periodCode.value, normDays } }); toast(`Создано строк: ${r.created}`); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
function startEdit(r: any) { editId.value = r.employeeId; Object.assign(edit, { workedDays: r.workedDays, normDays: r.normDays, absentDays: r.absentDays }); }
async function save(r: any) {
  try {
    await auth.api('/hr/attendance', { method: 'POST', body: { employeeId: r.employeeId, periodCode: periodCode.value, workedDays: edit.workedDays, normDays: edit.normDays, absentDays: edit.absentDays } });
    editId.value = ''; toast('Сохранено'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
onMounted(reload);
</script>

<style scoped>
.row-actions { display: flex; gap: 6px; }
</style>
