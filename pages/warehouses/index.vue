<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Склады</h2>
      <div class="toolbar"><button v-if="canManage" class="btn sm" @click="openAdd">+ Склад</button></div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Код</th><th>Название</th><th>Адрес</th><th class="num">Действия</th></tr></thead>
        <tbody>
          <tr v-for="w in warehouses" :key="w.id">
            <td><small>{{ w.code }}</small></td><td>{{ w.name }}</td><td>{{ w.address || '—' }}</td>
            <td class="num">
              <div class="actions">
                <button class="btn sm soft" @click="open(w)">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18" /><path d="M3 12h18" /><path d="M3 17h18" /></svg>
                  Подробнее
                </button>
                <button v-if="canManage" class="iconbtn edit" title="Изменить" @click="openEdit(w)">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                </button>
                <button v-if="canManage" class="iconbtn del" title="Удалить" @click="remove(w)">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!warehouses.length"><td colspan="4" class="empty">Нет складов</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="f.show" :title="f.id ? 'Редактировать склад' : 'Новый склад'" :submit-label="f.id ? 'Сохранить' : 'Создать'" @close="f.show = false" @submit="submit">
    <label>Код</label><input v-model="f.code" placeholder="WH-02" />
    <label>Название</label><input v-model="f.name" />
    <label>Адрес</label><input v-model="f.address" />
  </Modal>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const warehouses = ref<any[]>([]);
const canManage = computed(() => auth.can('warehouse.manage'));
const f = reactive({ show: false, id: '', code: '', name: '', address: '' });

function open(w: any) { navigateTo(`/warehouses/${w.id}`); }
async function load() { warehouses.value = (await auth.api('/warehouse/warehouses')).warehouses; }
function openAdd() { Object.assign(f, { show: true, id: '', code: '', name: '', address: '' }); }
function openEdit(w: any) { Object.assign(f, { show: true, id: w.id, code: w.code, name: w.name, address: w.address || '' }); }
async function submit() {
  const body = { code: f.code.trim(), name: f.name.trim(), address: f.address || undefined };
  if (!body.code || !body.name) { toast('Заполните код и название', true); return; }
  try {
    if (f.id) { await auth.api(`/warehouse/warehouses/${f.id}`, { method: 'PATCH', body }); toast('Склад обновлён'); }
    else { await auth.api('/warehouse/warehouses', { method: 'POST', body }); toast('Склад создан'); }
    f.show = false; await load();
  } catch (e: any) { toast(e.message, true); }
}
async function remove(w: any) {
  if (!confirm(`Удалить склад «${w.name}»?`)) return;
  try { await auth.api(`/warehouse/warehouses/${w.id}`, { method: 'DELETE' }); toast('Склад удалён'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>

<style scoped>
.actions { display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px; }
.actions .btn, .actions .iconbtn { height: 32px; box-sizing: border-box; margin: 0; }
.iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px; border: 1px solid transparent; cursor: pointer; padding: 0; transition: background .15s, color .15s, border-color .15s; }
.iconbtn svg { width: 16px; height: 16px; }
.iconbtn.edit { background: rgba(37, 99, 235, .10); color: #2563eb; border-color: rgba(37, 99, 235, .18); }
.iconbtn.edit:hover { background: #2563eb; color: #fff; }
.iconbtn.del { background: rgba(220, 38, 38, .10); color: #dc2626; border-color: rgba(220, 38, 38, .18); }
.iconbtn.del:hover { background: #dc2626; color: #fff; }
</style>
