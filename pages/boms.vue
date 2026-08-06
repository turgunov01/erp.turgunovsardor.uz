<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Спецификации (BOM)</h2>
      <div class="toolbar">
        <label class="chk"><input v-model="showArchived" type="checkbox" @change="reload(1)" /> архивные</label>
        <button v-if="canWrite" class="btn sm" @click="openCreate">+ Спецификация</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Название</th><th>Готовый продукт</th><th class="num">Выход</th><th class="num">Материалов</th><th class="num">Заказов</th><th>Действия</th></tr></thead>
        <tbody>
          <tr v-for="b in boms" :key="b.id">
            <td>{{ b.name }}</td>
            <td>{{ b.productName }} <small class="muted">{{ b.productSku }}</small></td>
            <td class="num">{{ num(b.outputQty) }}</td>
            <td class="num">{{ b.items.length }}</td>
            <td class="num">{{ b._count?.orders ?? 0 }}</td>
            <td>
              <button class="btn ghost sm" @click="openView(b)">Состав</button>
              <button v-if="canWrite && !showArchived" class="btn ghost sm" @click="setStatus(b.id, 'archived')">Архив</button>
              <button v-if="canWrite && showArchived" class="btn soft sm" @click="setStatus(b.id, 'active')">Вернуть</button>
            </td>
          </tr>
          <tr v-if="!boms.length"><td colspan="6" class="empty">Спецификаций нет</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">Всего: {{ meta.total }} · стр. {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← Назад</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">Вперёд →</button>
    </div>
  </div>

  <!-- Create BOM -->
  <Modal v-if="c.show" half title="Новая спецификация" submit-label="Создать" @close="c.show = false" @submit="submitCreate">
    <div class="row2">
      <div><label>Готовый продукт</label><select v-model="c.productId"><option value="">— выберите —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select></div>
      <div><label>Выход (шт. за рецептуру)</label><input v-model.number="c.outputQty" type="number" step="0.001" min="0" /></div>
    </div>
    <label>Название</label><input v-model="c.name" placeholder="напр. Шкаф A1 — рецептура v1" />
    <label style="margin-top:8px">Материалы (на выход)</label>
    <div v-for="(it, i) in c.items" :key="i" class="row-line">
      <select v-model="it.productId"><option value="">— материал —</option><option v-for="p in stockable" :key="p.id" :value="p.id">{{ p.name }}</option></select>
      <input v-model.number="it.quantity" type="number" step="0.001" min="0" placeholder="кол-во" style="max-width:90px" />
      <button type="button" class="btn ghost sm" @click="c.items.splice(i, 1)">✕</button>
    </div>
    <button type="button" class="btn ghost sm" @click="c.items.push({ productId: '', quantity: 1 })">+ строка</button>
  </Modal>

  <!-- View composition -->
  <Modal v-if="v.show" half :title="`Состав: ${v.name}`" submit-label="Закрыть" @close="v.show = false" @submit="v.show = false">
    <div class="hint" style="text-align:left">Выход: {{ num(v.outputQty) }} шт.</div>
    <table style="margin-top:8px;font-size:13px"><thead><tr><th>Материал</th><th class="num">Кол-во</th></tr></thead>
      <tbody>
        <tr v-for="it in v.items" :key="it.id"><td>{{ it.productName }} <small class="muted">{{ it.productSku }}</small></td><td class="num">{{ num(it.quantity) }}</td></tr>
        <tr v-if="!v.items.length"><td colspan="2" class="empty">Пусто</td></tr>
      </tbody>
    </table>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const boms = ref<any[]>([]); const meta = ref<any>(null); const page = ref(1);
const products = ref<any[]>([]); const showArchived = ref(false);
const canWrite = computed(() => auth.can('production.write'));
const stockable = computed(() => products.value.filter((p) => p.type === 'stockable'));

const c = reactive<any>({ show: false, productId: '', outputQty: 1, name: '', items: [] as any[] });
const v = reactive<any>({ show: false, name: '', outputQty: 1, items: [] as any[] });

async function reload(p = 1) {
  page.value = p;
  const res = await auth.api(`/production/boms?page=${p}&pageSize=25${showArchived.value ? '&status=archived' : ''}`);
  boms.value = res.boms; meta.value = res.meta;
}
async function loadRefs() {
  const pr = await auth.api('/catalog/products?pageSize=200');
  products.value = pr.products;
}
function openCreate() { Object.assign(c, { show: true, productId: '', outputQty: 1, name: '', items: [{ productId: '', quantity: 1 }] }); }
async function submitCreate() {
  try {
    if (!c.productId) { toast('Выберите готовый продукт', true); return; }
    const items = c.items.filter((i: any) => i.productId && i.quantity > 0).map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity) }));
    if (!items.length) { toast('Добавьте хотя бы один материал', true); return; }
    await auth.api('/production/boms', { method: 'POST', body: { productId: c.productId, name: c.name || 'Спецификация', outputQty: Number(c.outputQty) || 1, items } });
    c.show = false; toast('Спецификация создана'); await reload(1);
  } catch (e: any) { toast(e.message, true); }
}
function openView(b: any) { Object.assign(v, { show: true, name: b.name, outputQty: b.outputQty, items: b.items }); }
async function setStatus(id: string, status: string) {
  try { await auth.api(`/production/boms/${id}`, { method: 'PATCH', body: { status } }); toast(status === 'archived' ? 'В архиве' : 'Возвращено из архива'); await reload(page.value); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(async () => { await loadRefs(); await reload(1); });
</script>

<style scoped>
.row-line { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.row-line select { flex: 1; }
.chk { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--muted, #64748b); }
</style>
