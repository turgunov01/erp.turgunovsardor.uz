<template>
  <div class="binpicker">
    <select v-model="zoneId" @change="onZone">
      <option value="">— зона —</option>
      <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.code }} · {{ z.name }}</option>
    </select>
    <select v-model="rackId" :disabled="!zoneId" @change="onRack">
      <option value="">— стеллаж —</option>
      <option v-for="r in racks" :key="r.id" :value="r.id">{{ r.code }} · {{ r.name }}</option>
    </select>
    <select v-model="shelfId" :disabled="!rackId" @change="onShelf">
      <option value="">— полка —</option>
      <option v-for="s in shelves" :key="s.id" :value="s.id">{{ s.code }} · {{ s.name }}</option>
    </select>
    <select v-model="binId" :disabled="!shelfId" @change="emitBin">
      <option value="">— ячейка —</option>
      <option v-for="b in bins" :key="b.id" :value="b.id">{{ b.code }} · {{ b.name }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
// Cascading zone → rack → shelf → bin selector. v-model = selected bin (leaf) id.
const props = defineProps<{ warehouseId: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();
const auth = useAuth();

const zones = ref<any[]>([]); const racks = ref<any[]>([]); const shelves = ref<any[]>([]); const bins = ref<any[]>([]);
const zoneId = ref(''); const rackId = ref(''); const shelfId = ref(''); const binId = ref('');

async function fetchChildren(parentId: string) {
  const r = await auth.api(`/inventory/locations?warehouseId=${props.warehouseId}&parentId=${parentId}`);
  return r.locations as any[];
}
async function loadZones() {
  zoneId.value = rackId.value = shelfId.value = binId.value = '';
  racks.value = shelves.value = bins.value = [];
  emit('update:modelValue', '');
  zones.value = props.warehouseId ? await fetchChildren('root') : [];
}
async function onZone() {
  rackId.value = shelfId.value = binId.value = ''; racks.value = shelves.value = bins.value = []; emit('update:modelValue', '');
  if (zoneId.value) racks.value = await fetchChildren(zoneId.value);
}
async function onRack() {
  shelfId.value = binId.value = ''; shelves.value = bins.value = []; emit('update:modelValue', '');
  if (rackId.value) shelves.value = await fetchChildren(rackId.value);
}
async function onShelf() {
  binId.value = ''; bins.value = []; emit('update:modelValue', '');
  if (shelfId.value) bins.value = await fetchChildren(shelfId.value);
}
function emitBin() { emit('update:modelValue', binId.value); }

watch(() => props.warehouseId, loadZones);
onMounted(loadZones);
</script>

<style scoped>
.binpicker { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.binpicker select { width: 100%; }
</style>
