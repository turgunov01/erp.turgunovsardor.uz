<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Рабочие центры</h2>
      <button v-if="canWrite" class="btn sm" @click="openAdd">+ Центр</button>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Код</th><th>Название</th><th>Тип</th><th class="num">Стоимость часа</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="w in centers" :key="w.id">
            <td><small class="muted">{{ w.code }}</small></td>
            <td>{{ w.name }}</td>
            <td>{{ typeLabel(w.type) }}</td>
            <td class="num">{{ money(Number(w.hourlyCostMinor)) }}</td>
            <td><span class="tag" :class="w.status">{{ w.status === 'active' ? 'Активен' : 'Выключен' }}</span></td>
            <td class="row-actions">
              <button v-if="canWrite" class="btn ghost sm" @click="openEdit(w)">Изменить</button>
              <button v-if="canWrite" class="btn ghost sm" @click="del(w)">Удалить</button>
            </td>
          </tr>
          <tr v-if="!centers.length"><td colspan="6" class="empty">Рабочих центров нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="m.show" :title="m.id ? 'Изменить центр' : 'Новый рабочий центр'" submit-label="Сохранить" @close="m.show = false" @submit="submit">
    <div class="row2"><div><label>Код</label><input v-model="m.code" :disabled="!!m.id" placeholder="weld" /></div><div><label>Название</label><input v-model="m.name" /></div></div>
    <div class="row2">
      <div><label>Тип</label><select v-model="m.type"><option v-for="t in TYPES" :key="t" :value="t">{{ typeLabel(t) }}</option></select></div>
      <div><label>Стоимость часа (сум)</label><input v-model.number="m.hourlyUzs" type="number" min="0" /></div>
    </div>
    <label v-if="m.id" class="chk"><input v-model="m.active" type="checkbox" /> Активен</label>
    <label>Примечание</label><input v-model="m.note" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const centers = ref<any[]>([]);
const canWrite = computed(() => auth.can('production.write'));
const TYPES = ['machining', 'assembly', 'welding', 'painting', 'qc', 'other'];
const TYPE: Record<string, string> = { machining: 'Обработка', assembly: 'Сборка', welding: 'Сварка', painting: 'Покраска', qc: 'ОТК', other: 'Прочее' };
function typeLabel(t: string) { return TYPE[t] || t; }
const m = reactive<any>({ show: false, id: '', code: '', name: '', type: 'other', hourlyUzs: 0, active: true, note: '' });

async function reload() { centers.value = (await auth.api('/production/work-centers')).workCenters; }
function openAdd() { Object.assign(m, { show: true, id: '', code: '', name: '', type: 'other', hourlyUzs: 0, active: true, note: '' }); }
function openEdit(w: any) { Object.assign(m, { show: true, id: w.id, code: w.code, name: w.name, type: w.type, hourlyUzs: Number(w.hourlyCostMinor) / 100, active: w.status === 'active', note: w.note || '' }); }
async function submit() {
  try {
    const body: any = { name: m.name, type: m.type, hourlyCostMinor: Math.round((Number(m.hourlyUzs) || 0) * 100), note: m.note || null };
    if (m.id) { body.status = m.active ? 'active' : 'inactive'; await auth.api(`/production/work-centers/${m.id}`, { method: 'PATCH', body }); }
    else await auth.api('/production/work-centers', { method: 'POST', body: { ...body, code: m.code } });
    m.show = false; toast('Сохранено'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function del(w: any) {
  if (!confirm(`Удалить рабочий центр «${w.name}»?`)) return;
  try { await auth.api(`/production/work-centers/${w.id}`, { method: 'DELETE' }); toast('Удалено'); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(reload);
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.active { background: #dcfce7; color: #166534; }
.tag.inactive { background: #fee2e2; color: #991b1b; }
.row-actions { display: flex; gap: 6px; }
.chk { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
