<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ t('nav.categories') }}</h2>
      <div class="toolbar">
        <button v-if="canWrite" class="btn sm" @click="openAdd">{{ t('cat.addBtn') }}</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>{{ t('common.code') }}</th><th>{{ t('common.name') }}</th><th>{{ t('cat.parent') }}</th><th class="num">{{ t('cat.products') }}</th><th v-if="canWrite" class="num">{{ t('common.actions') }}</th></tr></thead>
        <tbody>
          <tr v-for="c in categories" :key="c.id">
            <td><small class="mono">{{ c.code }}</small></td>
            <td>{{ c.name }}</td>
            <td>{{ nameById[c.parentId] || '—' }}</td>
            <td class="num">{{ c.productCount }}</td>
            <td v-if="canWrite" class="num nowrap">
              <button class="btn ghost sm" @click="openEdit(c)">{{ t('common.edit') }}</button>
              <button class="btn ghost sm danger" :disabled="c.productCount > 0" :title="c.productCount > 0 ? t('cat.inUse') : ''" @click="remove(c)">{{ t('common.delete') }}</button>
            </td>
          </tr>
          <tr v-if="!categories.length"><td :colspan="canWrite ? 5 : 4" class="empty">{{ t('cat.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="form.show" :title="form.id ? t('cat.edit') : t('cat.new')" :submit-label="form.id ? t('common.save') : t('common.create')" @close="form.show = false" @submit="submit">
    <div class="row2">
      <div><label>{{ t('common.code') }}</label><input v-model="form.code" placeholder="ELEC" /></div>
      <div><label>{{ t('common.name') }}</label><input v-model="form.name" /></div>
    </div>
    <label>{{ t('cat.parent') }}</label>
    <select v-model="form.parentId">
      <option value="">{{ t('cat.none') }}</option>
      <option v-for="c in parentOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const { t } = useI18n();
const categories = ref<any[]>([]);
const canWrite = computed(() => auth.can('catalog.write'));
const form = reactive({ show: false, id: '', code: '', name: '', parentId: '' });

const nameById = computed<Record<string, string>>(() => Object.fromEntries(categories.value.map((c) => [c.id, c.name])));
// A category cannot be its own parent.
const parentOptions = computed(() => categories.value.filter((c) => c.id !== form.id));

async function load() {
  const r = await auth.api('/catalog/categories');
  categories.value = r.categories;
}
function openAdd() { Object.assign(form, { show: true, id: '', code: '', name: '', parentId: '' }); }
function openEdit(c: any) { Object.assign(form, { show: true, id: c.id, code: c.code, name: c.name, parentId: c.parentId || '' }); }

async function submit() {
  const body = { code: form.code.trim(), name: form.name.trim(), parentId: form.parentId || undefined };
  if (!body.code || !body.name) { toast(t('cat.needCodeName'), true); return; }
  try {
    if (form.id) { await auth.api(`/catalog/categories/${form.id}`, { method: 'PATCH', body }); toast(t('common.saved')); }
    else { await auth.api('/catalog/categories', { method: 'POST', body }); toast(t('cat.created')); }
    form.show = false; await load();
  } catch (e: any) { toast(e.message, true); }
}
async function remove(c: any) {
  if (!confirm(t('cat.confirmDel') + ' «' + c.name + '»?')) return;
  try { await auth.api(`/catalog/categories/${c.id}`, { method: 'DELETE' }); toast(t('common.deleted')); await load(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>

<style scoped>
.mono { font-family: ui-monospace, monospace; }
.nowrap { white-space: nowrap; }
.btn.danger { color: #dc2626; }
.btn.danger:disabled { opacity: .4; }
</style>
