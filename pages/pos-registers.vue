<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Кассы (POS)</h2>
      <button v-if="canManage" class="btn sm" @click="openAdd">+ Касса</button>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Код</th><th>Название</th><th>Склад</th><th>Смена</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in registers" :key="r.id">
            <td><small class="muted">{{ r.code }}</small></td>
            <td>{{ r.name }}</td>
            <td>{{ r.warehouseName || '—' }}</td>
            <td><span v-if="r.openShift" class="tag open">{{ r.openShift.number }}</span><span v-else class="muted">—</span></td>
            <td><span class="tag" :class="r.active ? 'on' : 'off'">{{ r.active ? 'Активна' : 'Выключена' }}</span></td>
            <td><button v-if="canManage" class="btn ghost sm" @click="openEdit(r)">Изменить</button></td>
          </tr>
          <tr v-if="!registers.length"><td colspan="6" class="empty">Касс нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="m.show" :title="m.id ? 'Изменить кассу' : 'Новая касса'" submit-label="Сохранить" @close="m.show = false" @submit="submit">
    <div class="row2"><div><label>Код</label><input v-model="m.code" :disabled="!!m.id" placeholder="POS-1" /></div><div><label>Название</label><input v-model="m.name" /></div></div>
    <label>Склад (источник товара)</label>
    <select v-model="m.warehouseId"><option value="">— выберите —</option><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <label>Прайс-лист (необязательно)</label>
    <select v-model="m.priceListId"><option value="">Базовые цены товаров</option><option v-for="pl in priceLists" :key="pl.id" :value="pl.id">{{ pl.name }}</option></select>
    <label v-if="m.id" class="chk"><input v-model="m.active" type="checkbox" /> Активна</label>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const registers = ref<any[]>([]); const warehouses = ref<any[]>([]); const priceLists = ref<any[]>([]);
const canManage = computed(() => auth.can('pos.manage'));
const m = reactive<any>({ show: false, id: '', code: '', name: '', warehouseId: '', priceListId: '', active: true });

async function reload() { registers.value = (await auth.api('/pos/registers')).registers; }
function openAdd() { Object.assign(m, { show: true, id: '', code: '', name: '', warehouseId: warehouses.value[0]?.id || '', priceListId: '', active: true }); }
function openEdit(r: any) { Object.assign(m, { show: true, id: r.id, code: r.code, name: r.name, warehouseId: r.warehouseId, priceListId: r.priceListId || '', active: r.active }); }
async function submit() {
  try {
    if (!m.warehouseId) return toast('Выберите склад', true);
    if (m.id) await auth.api(`/pos/registers/${m.id}`, { method: 'PATCH', body: { name: m.name, active: m.active, priceListId: m.priceListId || null, warehouseId: m.warehouseId } });
    else await auth.api('/pos/registers', { method: 'POST', body: { code: m.code, name: m.name, warehouseId: m.warehouseId, priceListId: m.priceListId || null } });
    m.show = false; toast('Сохранено'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  await reload();
  try { warehouses.value = (await auth.api('/warehouse/warehouses')).warehouses; } catch {}
  try { priceLists.value = (await auth.api('/sales/price-lists')).priceLists; } catch {}
});
</script>

<style scoped>
.tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.on, .tag.open { background: #dcfce7; color: #166534; }
.tag.off { background: #fee2e2; color: #991b1b; }
.chk { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
label { display: block; font-size: 12px; color: var(--muted, #64748b); margin-top: 8px; }
</style>
