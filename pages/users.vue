<template>
  <div>
    <div class="panel">
      <div class="panel-head"><h2>Пользователи</h2>
        <div class="toolbar"><button class="btn sm" @click="openInvite">Пригласить</button><button class="btn ghost sm" @click="openAdd">+ Вручную</button></div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Имя</th><th>Email</th><th>Роли</th><th>Статус</th><th>Вход</th><th></th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.fullName }}</td><td>{{ u.email }}</td>
              <td><span v-for="r in u.roles" :key="r" class="tag muted" style="margin-right:4px">{{ r }}</span></td>
              <td>{{ u.status }}</td><td>{{ u.lastLoginAt ? dt(u.lastLoginAt) : '—' }}</td>
              <td><button class="btn ghost sm" @click="openScope(u)">Склады</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Приглашения</h2></div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Email</th><th>Роли</th><th>Истекает</th><th></th></tr></thead>
          <tbody>
            <tr v-for="i in invitations" :key="i.id"><td>{{ i.email }}</td><td>{{ i.roleCodes }}</td>
              <td>{{ new Date(i.expiresAt).toLocaleDateString('ru-RU') }}</td>
              <td><button class="btn ghost sm" @click="revoke(i.id)">Отозвать</button></td></tr>
            <tr v-if="!invitations.length"><td colspan="4" class="empty">Нет активных приглашений</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="inv.show" title="Пригласить сотрудника" submit-label="Пригласить" @close="inv.show = false" @submit="submitInvite">
      <label>Email</label><input v-model="inv.email" type="email" />
      <label>Роль</label><select v-model="inv.role"><option v-for="r in roles" :key="r.code" :value="r.code">{{ r.name || r.code }}</option></select>
    </Modal>

    <Modal v-if="link.show" title="Ссылка-приглашение" submit-label="Готово" @close="link.show = false" @submit="link.show = false">
      <div class="hint" style="text-align:left;margin:0 0 8px">Отправьте ссылку сотруднику (в проде уйдёт на email):</div>
      <input :value="link.url" readonly @focus="(e:any) => e.target.select()" />
    </Modal>

    <Modal v-if="add.show" title="Новый пользователь" submit-label="Создать" @close="add.show = false" @submit="submitAdd">
      <label>Имя</label><input v-model="add.fullName" />
      <label>Email</label><input v-model="add.email" type="email" />
      <label>Пароль</label><input v-model="add.password" type="text" />
      <label>Роль</label><select v-model="add.role"><option v-for="r in roles" :key="r.code" :value="r.code">{{ r.name || r.code }}</option></select>
    </Modal>

    <Modal v-if="scope.show" :title="`Доступ к складам: ${scope.name}`" submit-label="Сохранить" @close="scope.show = false" @submit="submitScope">
      <div class="hint" style="text-align:left;margin:0 0 8px">Отметьте склады. Если ничего не выбрано — доступ ко всем.</div>
      <label v-for="w in warehouses" :key="w.id" style="display:flex;gap:8px;align-items:center;font-weight:500">
        <input type="checkbox" :value="w.id" v-model="scope.selected" style="width:auto" /> {{ w.name }} <small style="color:#94a3b8">{{ w.code }}</small>
      </label>
    </Modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const users = ref<any[]>([]); const roles = ref<any[]>([]); const invitations = ref<any[]>([]); const warehouses = ref<any[]>([]);
const inv = reactive({ show: false, email: '', role: 'operator' });
const link = reactive({ show: false, url: '' });
const add = reactive({ show: false, fullName: '', email: '', password: 'Welcome123!', role: 'operator' });
const scope = reactive<any>({ show: false, userId: '', name: '', selected: [] as string[] });

async function load() {
  const [u, r, iv, w] = await Promise.all([
    auth.api('/admin/users'), auth.api('/admin/roles').catch(() => ({ roles: [] })),
    auth.api('/admin/invitations').catch(() => ({ invitations: [] })), auth.api('/warehouse/warehouses').catch(() => ({ warehouses: [] })),
  ]);
  users.value = (u as any).users; roles.value = (r as any).roles.length ? (r as any).roles : [{ code: 'owner' }, { code: 'warehouse_manager' }, { code: 'operator' }, { code: 'viewer' }];
  invitations.value = (iv as any).invitations; warehouses.value = (w as any).warehouses;
}
function openInvite() { Object.assign(inv, { show: true, email: '', role: roles.value[0]?.code || 'operator' }); }
async function submitInvite() {
  try {
    const r = await auth.api<any>('/admin/invitations', { method: 'POST', body: { email: inv.email.trim(), roleCodes: [inv.role] } });
    inv.show = false;
    if (r.devInviteLink) { link.url = r.devInviteLink; link.show = true; try { await navigator.clipboard.writeText(r.devInviteLink); } catch {} }
    else toast('Приглашение отправлено');
    await load();
  } catch (e: any) { toast(e.message, true); }
}
async function revoke(id: string) { try { await auth.api(`/admin/invitations/${id}/revoke`, { method: 'POST' }); toast('Отозвано'); await load(); } catch (e: any) { toast(e.message, true); } }
function openAdd() { Object.assign(add, { show: true, fullName: '', email: '', password: 'Welcome123!', role: roles.value[0]?.code || 'operator' }); }
async function submitAdd() {
  try { await auth.api('/admin/users', { method: 'POST', body: { fullName: add.fullName.trim(), email: add.email.trim(), password: add.password, roleCodes: [add.role] } }); add.show = false; toast('Пользователь создан'); await load(); }
  catch (e: any) { toast(e.message, true); }
}
async function openScope(u: any) {
  const cur = await auth.api<any>(`/admin/users/${u.id}/warehouses`);
  Object.assign(scope, { show: true, userId: u.id, name: u.fullName, selected: cur.warehouseIds });
}
async function submitScope() {
  try { await auth.api(`/admin/users/${scope.userId}/warehouses`, { method: 'PUT', body: { warehouseIds: scope.selected } }); scope.show = false; toast('Доступ обновлён'); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>
