<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Автопарк</h2>
      <button v-if="canWrite" class="btn sm" @click="openAdd">+ Транспорт</button>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Госномер</th><th>Модель</th><th>Тип</th><th class="num">Грузоподъёмность</th><th>Водитель</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="v in vehicles" :key="v.id">
            <td><b>{{ v.plate }}</b></td>
            <td>{{ v.model || '—' }}</td>
            <td>{{ typeLabel(v.type) }}</td>
            <td class="num">{{ Number(v.capacityKg) }} кг</td>
            <td>{{ v.driverName || '—' }}</td>
            <td><span class="tag" :class="v.status">{{ statusLabel(v.status) }}</span></td>
            <td class="row-actions">
              <button v-if="canWrite" class="btn ghost sm" @click="openEdit(v)">Изменить</button>
              <button v-if="canWrite" class="btn ghost sm" @click="del(v)">Удалить</button>
            </td>
          </tr>
          <tr v-if="!vehicles.length"><td colspan="7" class="empty">Транспорта нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="m.show" :title="m.id ? 'Изменить ТС' : 'Новый транспорт'" submit-label="Сохранить" @close="m.show = false" @submit="submit">
    <div class="row2"><div><label>Госномер</label><input v-model="m.plate" :disabled="!!m.id" placeholder="01A123BC" /></div><div><label>Модель</label><input v-model="m.model" /></div></div>
    <div class="row2">
      <div><label>Тип</label><select v-model="m.type"><option value="truck">Грузовик</option><option value="van">Фургон</option><option value="car">Легковой</option></select></div>
      <div><label>Грузоподъёмность (кг)</label><input v-model.number="m.capacityKg" type="number" min="0" /></div>
    </div>
    <div class="row2">
      <div><label>Водитель</label><select v-model="m.driverId"><option value="">—</option><option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.fullName }}</option></select></div>
      <div v-if="m.id"><label>Статус</label><select v-model="m.status"><option value="available">Свободен</option><option value="in_use">В рейсе</option><option value="maintenance">На ремонте</option></select></div>
    </div>
    <label>Примечание</label><input v-model="m.note" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const vehicles = ref<any[]>([]); const drivers = ref<any[]>([]);
const canWrite = computed(() => auth.can('logistics.write'));
const TYPE: Record<string, string> = { truck: 'Грузовик', van: 'Фургон', car: 'Легковой' };
const STATUS: Record<string, string> = { available: 'Свободен', in_use: 'В рейсе', maintenance: 'На ремонте' };
function typeLabel(t: string) { return TYPE[t] || t; }
function statusLabel(s: string) { return STATUS[s] || s; }
const m = reactive<any>({ show: false, id: '', plate: '', model: '', type: 'truck', capacityKg: 0, driverId: '', status: 'available', note: '' });

async function reload() { vehicles.value = (await auth.api('/logistics/vehicles')).vehicles; }
function openAdd() { Object.assign(m, { show: true, id: '', plate: '', model: '', type: 'truck', capacityKg: 0, driverId: '', status: 'available', note: '' }); }
function openEdit(v: any) { Object.assign(m, { show: true, id: v.id, plate: v.plate, model: v.model || '', type: v.type, capacityKg: Number(v.capacityKg), driverId: v.driverId || '', status: v.status, note: v.note || '' }); }
async function submit() {
  try {
    const body: any = { model: m.model || null, type: m.type, capacityKg: Number(m.capacityKg) || 0, driverId: m.driverId || null, note: m.note || null };
    if (m.id) { body.status = m.status; await auth.api(`/logistics/vehicles/${m.id}`, { method: 'PATCH', body }); }
    else await auth.api('/logistics/vehicles', { method: 'POST', body: { ...body, plate: m.plate } });
    m.show = false; toast('Сохранено'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function del(v: any) {
  if (!confirm(`Удалить ТС ${v.plate}?`)) return;
  try { await auth.api(`/logistics/vehicles/${v.id}`, { method: 'DELETE' }); toast('Удалено'); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(async () => { try { drivers.value = (await auth.api('/logistics/meta')).drivers; } catch {} await reload(); });
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.available { background: #dcfce7; color: #166534; }
.tag.in_use { background: #dbeafe; color: #1e40af; }
.tag.maintenance { background: #fef9c3; color: #854d0e; }
.row-actions { display: flex; gap: 6px; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
