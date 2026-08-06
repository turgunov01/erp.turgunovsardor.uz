<template>
  <div class="panel">
    <div class="panel-head">
      <div class="head-left">
        <NuxtLink to="/warehouses" class="back">← Склады</NuxtLink>
        <h2>{{ wh?.name || 'Склад' }} <span v-if="wh" class="muted code">{{ wh.code }}</span></h2>
      </div>
      <div class="toolbar">
        <button v-if="canManage && nextKind" class="btn sm" @click="openCreate">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          {{ label(nextKind) }}
        </button>
        <button v-if="canMove" class="btn sm soft green" @click="openPlace">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10" /><path d="M8 9l4 4 4-4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
          Разместить
        </button>
        <button v-if="canMove" class="btn sm soft" @click="openTransfer">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4" /><path d="M3 8h13" /><path d="M17 20l4-4-4-4" /><path d="M21 16H8" /></svg>
          Переместить
        </button>
      </div>
    </div>

    <div class="crumbs">
      <a class="crumb" :class="{ active: !path.length }" @click="goRoot">🏢 {{ wh?.name || 'Склад' }}</a>
      <template v-for="(n, i) in path" :key="n.id">
        <span class="sep">›</span>
        <a class="crumb" :class="{ active: i === path.length - 1 }" @click="goTo(i)">{{ kindIcon(n.kind) }} {{ n.code }}</a>
      </template>
      <span v-if="!isBin" class="lvl-pos">позиций внутри: <b>{{ levelPositions }}</b></span>
    </div>

    <div class="panel-body">
      <table v-if="!isBin">
        <thead>
          <tr>
            <th class="w-type">Тип</th><th class="w-code">Код</th><th>Название</th>
            <th class="num w-count">Вложений</th><th class="num w-count">Позиций</th><th v-if="canManage" class="num w-act">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in children" :key="c.id" class="row" @click="enter(c)">
            <td class="w-type"><span class="ico">{{ kindIcon(c.kind) }}</span><span class="tag muted">{{ label(c.kind) }}</span></td>
            <td class="w-code"><strong>{{ c.code }}</strong></td>
            <td>{{ c.name }}</td>
            <td class="num w-count">{{ c.kind === 'bin' ? '—' : c.childCount }}</td>
            <td class="num w-count"><span v-if="c.positionCount" class="poschip">{{ c.positionCount }}</span><span v-else class="muted">0</span></td>
            <td v-if="canManage" class="num w-act" @click.stop>
              <button class="iconbtn edit" title="Изменить" @click="openEdit(c)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              </button>
              <button class="iconbtn del" title="Удалить" @click="remove(c)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
              </button>
            </td>
          </tr>
          <tr v-if="!children.length">
            <td :colspan="canManage ? 6 : 5" class="empty">{{ nextKind ? `Здесь пусто. Нажмите «+ ${label(nextKind)}».` : 'Пусто' }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="bin-view">
        <h3 class="sub">Товары в ячейке {{ current?.code }} · позиций: {{ binContents.length }}</h3>
        <table>
          <thead><tr><th>Товар</th><th class="num">Кол-во</th></tr></thead>
          <tbody>
            <tr v-for="b in binContents" :key="b.id"><td>{{ prodName(b.productId) }}</td><td class="num">{{ num(b.quantity) }}</td></tr>
            <tr v-if="!binContents.length"><td colspan="2" class="empty">Ячейка пуста</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <Modal v-if="c.show" :title="`Новая: ${label(c.kind)}`" submit-label="Создать" @close="c.show = false" @submit="submitCreate">
    <p v-if="c.parentCode" class="hint">Внутри: {{ c.parentCode }}</p>
    <div class="row2">
      <div><label>Код</label><input v-model="c.code" :placeholder="codeHint(c.kind)" @focus="fillCode" /></div>
      <div><label>Тип</label><input :value="label(c.kind)" disabled /></div>
    </div>
    <label>Название</label><input v-model="c.name" :placeholder="label(c.kind) + '…'" />
  </Modal>

  <Modal v-if="e.show" :title="`Изменить: ${label(e.kind)}`" submit-label="Сохранить" @close="e.show = false" @submit="submitEdit">
    <label>Код</label><input :value="e.code" disabled />
    <label>Название</label><input v-model="e.name" />
  </Modal>

  <Modal v-if="p.show" title="Разместить товар в ячейку" submit-label="Разместить" @close="p.show = false" @submit="submitPlace">
    <label>Товар</label>
    <select v-model="p.productId" @change="loadPlaceInfo"><option value="">— товар —</option><option v-for="pr in stockable" :key="pr.id" :value="pr.id">{{ pr.name }}</option></select>
    <div v-if="p.productId && placeExisting.length" class="existing">
      <div class="hint">Уже размещён (нажмите, чтобы доложить туда же):</div>
      <div class="chips">
        <button type="button" v-for="o in placeExisting" :key="o.locationId" class="chip" :class="{ on: p.locationId === o.locationId }" @click="p.locationId = o.locationId">{{ o.label }} · {{ num(o.qty) }}</button>
      </div>
    </div>
    <label>{{ placeExisting.length ? 'или выберите другую ячейку' : 'Ячейка (зона → стеллаж → полка → ячейка)' }}</label>
    <BinPicker :warehouse-id="warehouseId" v-model="p.locationId" />
    <label>Количество</label><input v-model.number="p.quantity" type="number" step="0.001" min="0" />
  </Modal>

  <Modal v-if="t.show" title="Переместить между ячейками" submit-label="Переместить" @close="t.show = false" @submit="submitTransfer">
    <label>Товар</label>
    <select v-model="t.productId" @change="loadFromOptions"><option value="">— товар —</option><option v-for="pr in stockable" :key="pr.id" :value="pr.id">{{ pr.name }}</option></select>
    <label>Из ячейки (где лежит товар)</label>
    <select v-model="t.fromLocationId" :disabled="!t.productId">
      <option value="">{{ fromPlaceholder }}</option>
      <option v-for="o in fromOptions" :key="o.locationId" :value="o.locationId">{{ o.label }} · {{ num(o.qty) }} шт</option>
    </select>
    <label>В ячейку</label>
    <BinPicker :warehouse-id="warehouseId" v-model="t.toLocationId" />
    <label>Количество</label><input v-model.number="t.quantity" type="number" step="0.001" min="0" :max="selectedFromQty || undefined" />
    <p v-if="selectedFromQty" class="hint">Доступно в выбранной ячейке: {{ num(selectedFromQty) }}</p>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const route = useRoute();
const { toast } = useToast();

const KINDS = ['zone', 'rack', 'shelf', 'bin'];
const LABEL: Record<string, string> = { zone: 'Зона', rack: 'Стеллаж', shelf: 'Полка', bin: 'Ячейка' };
const ICON: Record<string, string> = { zone: '🗺', rack: '🗄', shelf: '🧱', bin: '📦' };
const PREFIX: Record<string, string> = { zone: 'A', rack: 'R', shelf: 'S', bin: 'B' };
const label = (k: string) => LABEL[k] || k;
const kindIcon = (k: string) => ICON[k] || '•';

const warehouseId = ref(String(route.params.id));
const wh = ref<any>(null);
const products = ref<any[]>([]);
const path = ref<any[]>([]);
const children = ref<any[]>([]);
const binContents = ref<any[]>([]);
const canManage = computed(() => auth.can('warehouse.locations'));
const canMove = computed(() => auth.can('warehouse.move'));
const stockable = computed(() => products.value.filter((pr) => pr.type === 'stockable'));

const current = computed<any>(() => (path.value.length ? path.value[path.value.length - 1] : null));
const isBin = computed(() => current.value?.kind === 'bin');
// Total product line-items (positions) at this level = sum of children's subtree positions.
const levelPositions = computed(() => children.value.reduce((s, ch) => s + (ch.positionCount || 0), 0));
const nextKind = computed(() => {
  if (!current.value) return 'zone';
  const idx = KINDS.indexOf(current.value.kind);
  return idx >= 0 && idx < KINDS.length - 1 ? KINDS[idx + 1] : null;
});
function codeHint(kind: string) {
  const sibs = children.value.filter((ch) => ch.kind === kind);
  let max = 0;
  for (const ch of sibs) { const m = String(ch.code).match(/(\d+)\s*$/); if (m) max = Math.max(max, Number(m[1])); }
  const n = (max || sibs.length) + 1;
  return `${PREFIX[kind] || 'X'}-${String(n).padStart(2, '0')}`;
}
const prodName = (id: string) => products.value.find((x) => x.id === id)?.name || id;
const num = (v: any) => Number(v).toLocaleString('ru-RU');

async function loadChildren() {
  const parentId = current.value ? current.value.id : 'root';
  const r = await auth.api(`/inventory/locations?warehouseId=${warehouseId.value}&parentId=${parentId}&stats=1`);
  children.value = r.locations;
  if (isBin.value) {
    const b = await auth.api(`/inventory/bin-stock?warehouseId=${warehouseId.value}&locationId=${current.value.id}`);
    binContents.value = b.binStock;
  } else binContents.value = [];
}
function goRoot() { path.value = []; loadChildren(); }
function goTo(i: number) { path.value = path.value.slice(0, i + 1); loadChildren(); }
function enter(node: any) { path.value = [...path.value, node]; loadChildren(); }

// Build the "product actually sits here" list (full path + qty) — shared by place & transfer.
async function positionsForProduct(productId: string) {
  const [bs, locs] = await Promise.all([
    auth.api(`/inventory/bin-stock?warehouseId=${warehouseId.value}&productId=${productId}`),
    auth.api(`/inventory/locations?warehouseId=${warehouseId.value}`),
  ]);
  const byId = new Map<string, any>(locs.locations.map((l: any) => [l.id, l]));
  const pathOf = (id: string) => {
    const parts: string[] = []; let cur = byId.get(id); let guard = 0;
    while (cur && guard++ < 10) { parts.unshift(cur.code); cur = cur.parentId ? byId.get(cur.parentId) : null; }
    return parts.join(' › ');
  };
  return bs.binStock.filter((r: any) => Number(r.quantity) > 0).map((r: any) => ({ locationId: r.locationId, qty: Number(r.quantity), label: pathOf(r.locationId) || r.locationCode }));
}

// ---- create ----
const c = reactive<any>({ show: false, code: '', name: '', kind: 'zone', parentId: '', parentCode: '' });
function openCreate() {
  if (!nextKind.value) return;
  Object.assign(c, { show: true, code: '', name: '', kind: nextKind.value, parentId: current.value?.id || '', parentCode: current.value?.code || '' });
}
function fillCode() { if (!c.code.trim()) c.code = codeHint(c.kind); }
async function submitCreate() {
  try {
    if (!c.code.trim()) { toast('Укажите код', true); return; }
    await auth.api('/inventory/locations', { method: 'POST', body: { warehouseId: warehouseId.value, code: c.code.trim(), name: c.name.trim() || c.code.trim(), kind: c.kind, parentId: c.parentId || undefined } });
    c.show = false; toast(`${label(c.kind)} создана`); await loadChildren();
  } catch (err: any) { toast(err.message, true); }
}

// ---- edit ----
const e = reactive<any>({ show: false, id: '', code: '', name: '', kind: 'bin' });
function openEdit(l: any) { Object.assign(e, { show: true, id: l.id, code: l.code, name: l.name, kind: l.kind }); }
async function submitEdit() {
  try { await auth.api(`/inventory/locations/${e.id}`, { method: 'PATCH', body: { name: e.name || e.code } }); e.show = false; toast('Сохранено'); await loadChildren(); }
  catch (err: any) { toast(err.message, true); }
}
async function remove(l: any) {
  if (!confirm(`Удалить «${l.code}»?`)) return;
  try { await auth.api(`/inventory/locations/${l.id}`, { method: 'DELETE' }); toast('Удалено'); await loadChildren(); }
  catch (err: any) { toast(err.message, true); }
}

// ---- place (shows where the product already sits) ----
const p = reactive<any>({ show: false, productId: '', locationId: '', quantity: 1 });
const placeExisting = ref<any[]>([]);
function openPlace() { Object.assign(p, { show: true, productId: '', locationId: '', quantity: 1 }); placeExisting.value = []; }
async function loadPlaceInfo() {
  p.locationId = ''; placeExisting.value = [];
  if (p.productId) placeExisting.value = await positionsForProduct(p.productId);
}
async function submitPlace() {
  try {
    if (!p.productId) { toast('Выберите товар', true); return; }
    if (!p.locationId) { toast('Выберите ячейку (до уровня «ячейка»)', true); return; }
    await auth.api('/inventory/bin-stock/place', { method: 'POST', body: { warehouseId: warehouseId.value, locationId: p.locationId, productId: p.productId, quantity: Number(p.quantity) } });
    p.show = false; toast('Размещено'); await loadChildren();
  } catch (err: any) { toast(err.message, true); }
}

// ---- transfer (from = only where the product sits) ----
const t = reactive<any>({ show: false, productId: '', fromLocationId: '', toLocationId: '', quantity: 1 });
const fromOptions = ref<any[]>([]);
const fromPlaceholder = computed(() => !t.productId ? '— сначала выберите товар —' : (fromOptions.value.length ? '— выберите позицию —' : '— товара нет ни в одной ячейке —'));
const selectedFromQty = computed(() => fromOptions.value.find((o) => o.locationId === t.fromLocationId)?.qty || 0);
function openTransfer() { Object.assign(t, { show: true, productId: '', fromLocationId: '', toLocationId: '', quantity: 1 }); fromOptions.value = []; }
async function loadFromOptions() {
  t.fromLocationId = ''; fromOptions.value = [];
  if (t.productId) fromOptions.value = await positionsForProduct(t.productId);
}
async function submitTransfer() {
  try {
    if (!t.productId) { toast('Выберите товар', true); return; }
    if (!t.fromLocationId || !t.toLocationId) { toast('Выберите обе ячейки', true); return; }
    await auth.api('/inventory/bin-stock/transfer', { method: 'POST', body: { warehouseId: warehouseId.value, fromLocationId: t.fromLocationId, toLocationId: t.toLocationId, productId: t.productId, quantity: Number(t.quantity) } });
    t.show = false; toast('Перемещено'); await loadChildren();
  } catch (err: any) { toast(err.message, true); }
}

onMounted(async () => {
  const [w, pr] = await Promise.all([auth.api('/warehouse/warehouses'), auth.api('/catalog/products?pageSize=200')]);
  wh.value = w.warehouses.find((x: any) => x.id === warehouseId.value) || null;
  products.value = pr.products;
  await loadChildren();
});
</script>

<style scoped>
.head-left { display: flex; flex-direction: column; gap: 2px; }
.back { font-size: 13px; color: var(--brand, #2563eb); cursor: pointer; }
.code { font-size: 13px; font-weight: 400; }
.crumbs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 12px 18px; font-size: 14px; border-bottom: 1px solid var(--line); }
.crumb { cursor: pointer; color: var(--brand, #2563eb); }
.crumb.active { color: var(--text, #0f172a); font-weight: 600; cursor: default; }
.sep { color: var(--muted, #94a3b8); }
.lvl-pos { margin-left: auto; font-size: 13px; color: var(--muted, #64748b); }
.lvl-pos b { color: var(--text, #0f172a); }
.poschip { display: inline-block; min-width: 22px; padding: 1px 8px; border-radius: 999px; background: rgba(37, 99, 235, .12); color: #1e40af; font-weight: 600; font-size: 12px; }
.panel-body :deep(th), .panel-body :deep(td) { padding: 12px 18px; vertical-align: middle; }
tr.row { cursor: pointer; }
tr.row:hover td { background: rgba(37, 99, 235, .06); }
.w-type { white-space: nowrap; }
.w-type .ico { margin-right: 8px; }
.w-count { white-space: nowrap; color: var(--muted, #64748b); }
.w-act { white-space: nowrap; }
.iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px; border: 1px solid transparent; cursor: pointer; padding: 0; transition: background .15s, color .15s, border-color .15s; }
.iconbtn + .iconbtn { margin-left: 6px; }
.iconbtn.edit { background: rgba(37, 99, 235, .10); color: #2563eb; border-color: rgba(37, 99, 235, .18); }
.iconbtn.edit:hover { background: #2563eb; color: #fff; }
.iconbtn.del { background: rgba(220, 38, 38, .10); color: #dc2626; border-color: rgba(220, 38, 38, .18); }
.iconbtn.del:hover { background: #dc2626; color: #fff; }
.bin-view .sub { font-size: 12px; color: var(--muted, #64748b); margin: 0; padding: 14px 18px 4px; text-transform: uppercase; letter-spacing: .04em; }
.hint { font-size: 13px; color: var(--muted, #64748b); margin: 0 0 8px; }
.existing { margin: 4px 0 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 6px 10px; font-size: 13px; cursor: pointer; transition: background .12s, border-color .12s; }
.chip:hover { border-color: #c7d2fe; background: #f8fafc; }
.chip.on { background: rgba(16, 185, 129, .12); border-color: #10b981; color: #047857; font-weight: 600; }
</style>
