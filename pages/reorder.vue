<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Минимальные остатки и дозаказ</h2>
      <div class="toolbar">
        <select v-model="warehouseId" @change="reload"><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
        <button v-if="canManage" class="btn ghost sm" @click="openLevels">Задать минимумы</button>
        <button v-if="canReorder && lowStock.length" class="btn sm" @click="autoRequest">Создать автозаявку</button>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="!lowStock.length" class="empty" style="padding:24px">Все позиции выше минимального остатка ✓</div>
      <table v-else>
        <thead><tr><th>Товар</th><th class="num">Доступно</th><th class="num">Минимум</th><th class="num">К заказу</th></tr></thead>
        <tbody>
          <tr v-for="l in lowStock" :key="l.productId">
            <td>{{ l.productName }} <small class="muted">{{ l.productSku }}</small></td>
            <td class="num neg">{{ num(l.available) }}</td>
            <td class="num">{{ num(l.minQty) }}</td>
            <td class="num">{{ num(l.suggestedQty) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="lv.show" title="Минимальные остатки" submit-label="Сохранить" @close="lv.show = false" @submit="submitLevels">
    <label>Товар</label><select v-model="lv.productId"><option value="">— товар —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    <div class="row2">
      <div><label>Минимум (сигнал)</label><input v-model.number="lv.minQty" type="number" step="0.001" min="0" /></div>
      <div><label>Дозаказ (кол-во)</label><input v-model.number="lv.reorderQty" type="number" step="0.001" min="0" /></div>
    </div>
    <div class="hint" style="text-align:left;margin-top:6px">Сигнал сработает, когда доступный остаток опустится ниже минимума. «Дозаказ» — рекомендуемое количество для закупки.</div>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const warehouses = ref<any[]>([]); const warehouseId = ref(''); const lowStock = ref<any[]>([]); const products = ref<any[]>([]);
const canManage = computed(() => auth.can('warehouse.locations'));
const canReorder = computed(() => auth.can('procurement.write'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));

const lv = reactive<any>({ show: false, productId: '', minQty: 0, reorderQty: 0 });

async function reload() {
  if (!warehouseId.value) return;
  lowStock.value = (await auth.api(`/inventory/low-stock?warehouseId=${warehouseId.value}`)).lowStock;
}
function openLevels() { Object.assign(lv, { show: true, productId: '', minQty: 0, reorderQty: 0 }); }
async function submitLevels() {
  try {
    if (!lv.productId) { toast('Выберите товар', true); return; }
    await auth.api('/inventory/stock-levels', { method: 'PATCH', body: { warehouseId: warehouseId.value, productId: lv.productId, minQty: Number(lv.minQty), reorderQty: Number(lv.reorderQty) } });
    lv.show = false; toast('Минимумы сохранены'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function autoRequest() {
  try {
    const res = await auth.api('/inventory/reorder/auto-request', { method: 'POST', body: { warehouseId: warehouseId.value } });
    toast(`Заявка ${res.purchaseRequest.number} создана (${res.purchaseRequest.items.length} поз.)`); await reload();
  } catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  const [w, pr] = await Promise.all([auth.api('/warehouse/warehouses'), auth.api('/catalog/products?pageSize=200')]);
  warehouses.value = w.warehouses; products.value = pr.products; warehouseId.value = w.warehouses[0]?.id || '';
  await reload();
});
</script>

<style scoped>
.neg { color: var(--danger, #dc2626); }
</style>
