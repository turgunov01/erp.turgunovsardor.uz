<template>
  <div class="panel">
    <div class="panel-head">
      <h2>План счетов</h2>
      <div class="toolbar">
        <div class="muted">Метод себестоимости:</div>
        <select v-model="costingMethod" :disabled="!canAccounting" @change="saveCosting">
          <option value="avg">Средневзвешенная</option>
          <option value="fifo">FIFO</option>
        </select>
        <button v-if="canAccounting" class="btn sm" @click="openNew">+ Счёт</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Код</th><th>Наименование</th><th>Тип</th><th>Статус</th></tr></thead>
        <tbody>
          <tr v-for="a in accounts" :key="a.id" :class="{ archived: a.status === 'archived' }">
            <td><b>{{ a.code }}</b></td>
            <td>{{ a.name }}</td>
            <td>{{ typeLabel(a.type) }}</td>
            <td><span class="muted">{{ a.status === 'active' ? 'активен' : 'архив' }}</span> <span v-if="a.isSystem" class="tag">системный</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="nw.show" title="Новый счёт плана" submit-label="Создать" @close="nw.show = false" @submit="create">
    <div class="row2">
      <div><label>Код</label><input v-model="nw.code" placeholder="7050" /></div>
      <div><label>Тип</label><select v-model="nw.type"><option value="asset">Актив</option><option value="liability">Обязательство</option><option value="equity">Капитал</option><option value="income">Доход</option><option value="expense">Расход</option></select></div>
    </div>
    <label>Наименование</label><input v-model="nw.name" placeholder="Прочие расходы" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const accounts = ref<any[]>([]); const costingMethod = ref('avg');
const canAccounting = computed(() => auth.can('finance.accounting'));
const TYPES: Record<string, string> = { asset: 'Актив', liability: 'Обязательство', equity: 'Капитал', income: 'Доход', expense: 'Расход' };
function typeLabel(t: string) { return TYPES[t] || t; }

const nw = reactive<any>({ show: false, code: '', name: '', type: 'expense' });

async function reload() { accounts.value = (await auth.api('/finance/chart')).accounts; }
function openNew() { Object.assign(nw, { show: true, code: '', name: '', type: 'expense' }); }
async function create() {
  try {
    if (!nw.code || !nw.name) { toast('Заполните код и наименование', true); return; }
    await auth.api('/finance/chart', { method: 'POST', body: { code: nw.code, name: nw.name, type: nw.type } });
    nw.show = false; toast('Счёт добавлен'); await reload();
  } catch (e: any) { toast(e.message, true); }
}
async function saveCosting() {
  try { await auth.api('/finance/settings', { method: 'PATCH', body: { costingMethod: costingMethod.value } }); toast('Метод себестоимости сохранён'); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(async () => {
  await reload();
  costingMethod.value = (await auth.api('/finance/settings')).costingMethod;
});
</script>

<style scoped>
.archived { opacity: .5; }
.tag { font-size: 11px; background: var(--chip, #eef); padding: 1px 6px; border-radius: 6px; margin-left: 4px; }
</style>
