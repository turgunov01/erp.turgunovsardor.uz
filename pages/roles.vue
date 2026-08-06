<template>
  <div>
    <div class="panel">
      <div class="panel-head"><h2>Роли и права</h2><div class="toolbar"><button class="btn sm" @click="openCreate">+ Роль</button></div></div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Роль</th><th>Код</th><th class="num">Прав</th><th class="num">Польз.</th><th></th></tr></thead>
          <tbody>
            <tr v-for="r in roles" :key="r.id">
              <td>{{ r.name }}</td><td><small>{{ r.code }}</small></td>
              <td class="num">{{ r.permissions.length }}</td><td class="num">{{ r.users }}</td>
              <td><button class="btn ghost sm" @click="openEdit(r)">Права</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="edit.show" :title="edit.title" submit-label="Сохранить" @close="edit.show = false" @submit="submit">
      <template v-if="edit.creating">
        <div class="row2"><div><label>Название</label><input v-model="edit.name" /></div><div><label>Код</label><input v-model="edit.code" placeholder="sales_manager" /></div></div>
      </template>
      <label>Права</label>
      <div style="max-height:320px;overflow:auto">
        <div v-for="(list, mod) in grouped" :key="mod" style="margin-top:8px">
          <b style="font-size:13px">{{ mod }}</b>
          <label v-for="p in list" :key="p.code" style="display:flex;gap:8px;align-items:center;font-weight:500">
            <input type="checkbox" :value="p.code" v-model="edit.selected" style="width:auto" /> {{ p.code }} <small style="color:#94a3b8">{{ p.description }}</small>
          </label>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const roles = ref<any[]>([]); const perms = ref<any[]>([]);
const edit = reactive<any>({ show: false, creating: false, title: '', id: '', name: '', code: '', selected: [] as string[] });

const grouped = computed(() => {
  const g: Record<string, any[]> = {};
  for (const p of perms.value) (g[p.module] ||= []).push(p);
  return g;
});

async function load() {
  const [r, p] = await Promise.all([auth.api('/admin/roles'), auth.api('/admin/permissions')]);
  roles.value = (r as any).roles; perms.value = (p as any).permissions;
}
function openCreate() { Object.assign(edit, { show: true, creating: true, title: 'Новая роль', id: '', name: '', code: '', selected: [] }); }
function openEdit(r: any) { Object.assign(edit, { show: true, creating: false, title: `Права роли: ${r.name}`, id: r.id, name: r.name, code: r.code, selected: [...r.permissions] }); }
async function submit() {
  try {
    if (edit.creating) await auth.api('/admin/roles', { method: 'POST', body: { name: edit.name.trim(), code: edit.code.trim(), permissions: edit.selected } });
    else await auth.api(`/admin/roles/${edit.id}`, { method: 'PATCH', body: { permissions: edit.selected } });
    edit.show = false; toast('Сохранено'); await load();
  } catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>
