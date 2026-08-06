<template>
  <div class="row2-panels">
    <div class="panel">
      <div class="panel-head">
        <h2>Подразделения</h2>
        <button v-if="canWrite" class="btn sm" @click="openDep()">+ Подразделение</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Код</th><th>Название</th><th class="num">Сотрудников</th><th></th></tr></thead>
          <tbody>
            <tr v-for="dep in departments" :key="dep.id">
              <td><small class="muted">{{ dep.code }}</small></td>
              <td>{{ dep.name }}</td>
              <td class="num">{{ dep._count.employees }}</td>
              <td class="row-actions">
                <button v-if="canWrite" class="btn ghost sm" @click="openDep(dep)">Изменить</button>
                <button v-if="canWrite" class="btn ghost sm" @click="delDep(dep)">Удалить</button>
              </td>
            </tr>
            <tr v-if="!departments.length"><td colspan="4" class="empty">Нет подразделений</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Должности</h2>
        <button v-if="canWrite" class="btn sm" @click="openPos()">+ Должность</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Код</th><th>Название</th><th class="num">Сотрудников</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in positions" :key="p.id">
              <td><small class="muted">{{ p.code }}</small></td>
              <td>{{ p.name }}</td>
              <td class="num">{{ p._count.employees }}</td>
              <td class="row-actions">
                <button v-if="canWrite" class="btn ghost sm" @click="openPos(p)">Изменить</button>
                <button v-if="canWrite" class="btn ghost sm" @click="delPos(p)">Удалить</button>
              </td>
            </tr>
            <tr v-if="!positions.length"><td colspan="4" class="empty">Нет должностей</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <Modal v-if="dep.show" :title="dep.id ? 'Изменить подразделение' : 'Новое подразделение'" submit-label="Сохранить" @close="dep.show = false" @submit="submitDep">
    <div class="row2"><div><label>Код</label><input v-model="dep.code" :disabled="!!dep.id" placeholder="prod" /></div><div><label>Название</label><input v-model="dep.name" /></div></div>
  </Modal>
  <Modal v-if="pos.show" :title="pos.id ? 'Изменить должность' : 'Новая должность'" submit-label="Сохранить" @close="pos.show = false" @submit="submitPos">
    <div class="row2"><div><label>Код</label><input v-model="pos.code" :disabled="!!pos.id" placeholder="worker" /></div><div><label>Название</label><input v-model="pos.name" /></div></div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const departments = ref<any[]>([]); const positions = ref<any[]>([]);
const canWrite = computed(() => auth.can('hr.write'));
const dep = reactive<any>({ show: false, id: '', code: '', name: '' });
const pos = reactive<any>({ show: false, id: '', code: '', name: '' });

async function reload() {
  departments.value = (await auth.api('/hr/departments')).departments;
  positions.value = (await auth.api('/hr/positions')).positions;
}
function openDep(x?: any) { Object.assign(dep, { show: true, id: x?.id || '', code: x?.code || '', name: x?.name || '' }); }
function openPos(x?: any) { Object.assign(pos, { show: true, id: x?.id || '', code: x?.code || '', name: x?.name || '' }); }
async function submitDep() {
  try {
    if (dep.id) await auth.api(`/hr/departments/${dep.id}`, { method: 'PATCH', body: { name: dep.name } });
    else await auth.api('/hr/departments', { method: 'POST', body: { code: dep.code, name: dep.name } });
    dep.show = false; toast('Сохранено'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function submitPos() {
  try {
    if (pos.id) await auth.api(`/hr/positions/${pos.id}`, { method: 'PATCH', body: { name: pos.name } });
    else await auth.api('/hr/positions', { method: 'POST', body: { code: pos.code, name: pos.name } });
    pos.show = false; toast('Сохранено'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function delDep(x: any) {
  if (!confirm(`Удалить подразделение «${x.name}»?`)) return;
  try { await auth.api(`/hr/departments/${x.id}`, { method: 'DELETE' }); toast('Удалено'); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
async function delPos(x: any) {
  if (!confirm(`Удалить должность «${x.name}»?`)) return;
  try { await auth.api(`/hr/positions/${x.id}`, { method: 'DELETE' }); toast('Удалено'); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(reload);
</script>

<style scoped>
.row2-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 860px) { .row2-panels { grid-template-columns: 1fr; } }
.row-actions { display: flex; gap: 6px; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
