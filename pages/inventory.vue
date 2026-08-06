<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Остатки на складе</h2>
      <div v-if="canMove" class="toolbar">
        <button class="btn green sm" @click="openMove('IN')">Приход</button>
        <button class="btn red sm" @click="openMove('OUT')">Расход</button>
        <button class="btn amber sm" @click="openMove('ADJUST')">Коррекция</button>
        <button class="btn ghost sm" @click="openTransfer">Перемещение</button>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="!rows.length" class="empty">Остатков нет. Нажмите «Приход», чтобы добавить.</div>
      <table v-else>
        <thead><tr><th>Товар</th><th>SKU</th><th>Склад</th><th class="num">Остаток</th><th class="num">Резерв</th><th class="num">Доступно</th><th>Ед.</th></tr></thead>
        <tbody>
          <tr v-for="s in rows" :key="s.warehouseId + s.productId">
            <td>{{ s.product }}</td><td><small>{{ s.sku }}</small></td><td>{{ s.warehouse }}</td>
            <td class="num">{{ num(s.quantity) }}</td><td class="num">{{ num(s.reserved) }}</td>
            <td class="num" :class="{ low: Number(s.available) <= 0 }">{{ num(s.available) }}</td><td>{{ s.unit }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="move.show" :title="moveTitle" :submit-label="moveTitle" @close="move.show = false" @submit="submitMove">
    <label>Склад</label>
    <select v-model="move.warehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
    <label>Товар</label>
    <select v-model="move.productId"><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    <label>{{ move.type === 'ADJUST' ? 'Новое количество (по факту)' : 'Количество' }}</label>
    <input v-model.number="move.quantity" type="number" step="0.001" min="0" />
    <label>Причина</label>
    <input v-model="move.reason" placeholder="напр. приход по накладной / списание в цех" />
  </Modal>

  <Modal v-if="trf.show" title="Перемещение между складами" submit-label="Переместить" @close="trf.show = false" @submit="submitTransfer">
    <div class="row2">
      <div><label>Откуда</label><select v-model="trf.fromWarehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
      <div><label>Куда</label><select v-model="trf.toWarehouseId"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
    </div>
    <label>Товар</label>
    <select v-model="trf.productId"><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    <label>Количество</label>
    <input v-model.number="trf.quantity" type="number" step="0.001" min="0.001" />
    <label>Причина</label>
    <input v-model="trf.reason" placeholder="напр. на производственную линию" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const rows = ref<any[]>([]); const warehouses = ref<any[]>([]); const products = ref<any[]>([]);
const canMove = computed(() => auth.can('warehouse.move'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));

const move = reactive({ show: false, type: 'IN', warehouseId: '', productId: '', quantity: 1, reason: '' });
const trf = reactive({ show: false, fromWarehouseId: '', toWarehouseId: '', productId: '', quantity: 1, reason: '' });
const moveTitle = computed(() => ({ IN: 'Приход', OUT: 'Расход', ADJUST: 'Коррекция / инвентаризация' } as any)[move.type]);

async function load() {
  const [st, wh, pr] = await Promise.all([auth.api('/warehouse/stock'), auth.api('/warehouse/warehouses'), auth.api('/catalog/products')]);
  rows.value = st.stock; warehouses.value = wh.warehouses; products.value = pr.products;
}
function openMove(type: string) {
  move.type = type; move.warehouseId = warehouses.value[0]?.id || ''; move.productId = stockable.value[0]?.id || '';
  move.quantity = 1; move.reason = ''; move.show = true;
}
function openTransfer() {
  trf.fromWarehouseId = warehouses.value[0]?.id || ''; trf.toWarehouseId = warehouses.value[1]?.id || warehouses.value[0]?.id || '';
  trf.productId = stockable.value[0]?.id || ''; trf.quantity = 1; trf.reason = ''; trf.show = true;
}
async function submitMove() {
  try {
    await auth.api('/warehouse/movements', { method: 'POST', body: { warehouseId: move.warehouseId, productId: move.productId, type: move.type, quantity: Number(move.quantity), reason: move.reason || undefined } });
    move.show = false; toast('Движение записано'); await load();
  } catch (e: any) { toast(e.message, true); }
}
async function submitTransfer() {
  try {
    await auth.api('/warehouse/transfer', { method: 'POST', body: { fromWarehouseId: trf.fromWarehouseId, toWarehouseId: trf.toWarehouseId, productId: trf.productId, quantity: Number(trf.quantity), reason: trf.reason || undefined } });
    trf.show = false; toast('Перемещение выполнено'); await load();
  } catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>
