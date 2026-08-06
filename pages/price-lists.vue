<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Прайс-листы</h2>
      <div class="toolbar"><button v-if="canWrite" class="btn sm" @click="openAdd">+ Прайс-лист</button></div>
    </div>
    <div class="panel-body">
      <div class="grid">
        <aside class="lists">
          <button v-for="l in priceLists" :key="l.id" class="list-btn" :class="{ active: l.id === selected?.id }" @click="selected = l">
            {{ l.name }} <span v-if="l.isDefault" class="tag in" style="margin-left:6px">по умолч.</span>
            <small style="display:block;color:#94a3b8">{{ l.items.length }} позиц.</small>
          </button>
          <div v-if="!priceLists.length" class="empty">Прайс-листов нет</div>
        </aside>
        <section v-if="selected" class="detail">
          <table>
            <thead><tr><th>Товар</th><th class="num">Цена</th><th></th></tr></thead>
            <tbody>
              <tr v-for="it in selected.items" :key="it.id">
                <td>{{ productName(it.productId) }}</td>
                <td class="num">{{ money(it.priceMinor) }}</td>
                <td><button v-if="canWrite" class="btn ghost sm" @click="delItem(it.id)">✕</button></td>
              </tr>
              <tr v-if="!selected.items.length"><td colspan="3" class="empty">Позиций нет</td></tr>
            </tbody>
          </table>
          <div v-if="canWrite" class="row-line" style="margin-top:10px">
            <select v-model="ni.productId"><option value="">— товар —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
            <input v-model.number="ni.price" type="number" min="0" step="0.01" placeholder="цена (сум)" style="max-width:130px" />
            <button class="btn sm" @click="addItem">Добавить</button>
          </div>
        </section>
      </div>
    </div>
  </div>

  <Modal v-if="m.show" title="Новый прайс-лист" submit-label="Создать" @close="m.show = false" @submit="submit">
    <label>Название</label><input v-model="m.name" placeholder="напр. Оптовый прайс" />
    <label style="margin-top:8px"><input v-model="m.isDefault" type="checkbox" /> По умолчанию</label>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const priceLists = ref<any[]>([]); const products = ref<any[]>([]); const selected = ref<any>(null);
const canWrite = computed(() => auth.can('sales.write'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));
const m = reactive<any>({ show: false, name: '', isDefault: false });
const ni = reactive<any>({ productId: '', price: 0 });

const productName = (id: string) => products.value.find((p) => p.id === id)?.name || id;

async function load() {
  const [pl, pr] = await Promise.all([auth.api('/sales/price-lists'), auth.api('/catalog/products?pageSize=200')]);
  priceLists.value = pl.priceLists; products.value = pr.products;
  const keep = selected.value ? priceLists.value.find((l: any) => l.id === selected.value.id) : null;
  selected.value = keep || priceLists.value[0] || null;
}
function openAdd() { Object.assign(m, { show: true, name: '', isDefault: false }); }
async function submit() {
  try {
    if (!m.name) { toast('Укажите название', true); return; }
    await auth.api('/sales/price-lists', { method: 'POST', body: { name: m.name, isDefault: m.isDefault } });
    m.show = false; toast('Создано'); await load();
  } catch (e: any) { toast(e.message, true); }
}
async function addItem() {
  if (!ni.productId || !(ni.price > 0)) { toast('Выберите товар и цену', true); return; }
  try {
    await auth.api(`/sales/price-lists/${selected.value.id}/items`, { method: 'POST', body: { productId: ni.productId, priceMinor: Math.round(Number(ni.price) * 100) } });
    Object.assign(ni, { productId: '', price: 0 }); await load();
  } catch (e: any) { toast(e.message, true); }
}
async function delItem(itemId: string) {
  try { await auth.api(`/sales/price-lists/${selected.value.id}/items/${itemId}`, { method: 'DELETE' }); await load(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>

<style scoped>
.grid { display: grid; grid-template-columns: 220px 1fr; gap: 16px; }
.lists { display: flex; flex-direction: column; gap: 6px; }
.list-btn { text-align: left; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; }
.list-btn.active { border-color: #2563eb; background: #eff6ff; }
.row-line { display: flex; gap: 8px; align-items: center; }
.row-line select { flex: 1; }
</style>
