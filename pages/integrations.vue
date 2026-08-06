<template>
  <div class="panel">
    <div class="panel-head"><h2>Интеграции</h2></div>
    <div class="panel-body" style="padding:18px">
      <div v-for="cat in categories" :key="cat" class="cat">
        <h3 class="cat-h">{{ cat }}</h3>
        <div class="ingrid">
          <div v-for="i in byCat(cat)" :key="i.key" class="incard" :class="{ on: i.connected }">
            <div class="in-top"><span class="in-ic">{{ i.icon }}</span>
              <span class="tag" :class="i.connected ? 'in' : 'muted'">{{ i.envConfigured && i.status === 'env' ? 'через сервер' : i.connected ? 'подключено' : 'не подключено' }}</span>
            </div>
            <h4>{{ i.name }}</h4>
            <p>{{ i.description }}</p>
            <div class="in-acts">
              <button class="btn sm" :class="{ ghost: i.connected }" @click="openConnect(i)">{{ i.connected ? 'Настроить' : 'Подключить' }}</button>
              <button v-if="i.status === 'connected'" class="btn ghost sm" @click="disconnect(i)">Отключить</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Connect modal -->
    <div v-if="editing" class="modal-back" @click.self="editing = null">
      <div class="modal">
        <h3>{{ editing.name }}</h3>
        <p class="muted">{{ editing.description }}</p>
        <div v-for="f in editing.fields" :key="f.key" class="fld">
          <label>{{ f.label }} <span v-if="!f.secret && editing.filledFields.includes(f.key)" class="muted">(задано)</span></label>
          <input v-model="form[f.key]" :type="f.secret ? 'password' : 'text'" :placeholder="f.secret && editing.filledFields.includes(f.key) ? 'Оставьте пустым, чтобы не менять' : ''" autocomplete="off" />
        </div>
        <div v-if="mErr" class="error">{{ mErr }}</div>
        <div class="modal-actions">
          <button class="btn ghost sm" @click="editing = null">Отмена</button>
          <button class="btn sm" @click="save">Сохранить и подключить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const list = ref<any[]>([]);
const editing = ref<any>(null); const form = ref<Record<string, string>>({}); const mErr = ref('');

const categories = computed(() => [...new Set(list.value.map((i) => i.category))]);
const byCat = (c: string) => list.value.filter((i) => i.category === c);

async function load() { list.value = (await auth.api<any>('/studio/integrations')).integrations; }
function openConnect(i: any) { editing.value = i; form.value = {}; mErr.value = ''; }
async function save() {
  mErr.value = '';
  try {
    await auth.api(`/studio/integrations/${editing.value.key}`, { method: 'PATCH', body: { config: form.value } });
    toast(`${editing.value.name}: сохранено`); editing.value = null; await load();
  } catch (e: any) { mErr.value = e.message; }
}
async function disconnect(i: any) {
  await auth.api(`/studio/integrations/${i.key}/disconnect`, { method: 'POST' });
  toast(`${i.name}: отключено`); await load();
}
onMounted(load);
</script>

<style scoped>
.cat { margin-bottom: 22px; } .cat-h { font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin: 0 0 12px; }
.ingrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
.incard { border: 1px solid var(--line); border-radius: 12px; padding: 16px; background: #fff; display: flex; flex-direction: column; gap: 6px; }
.incard.on { border-color: #86efac; }
.in-top { display: flex; align-items: center; justify-content: space-between; }
.in-ic { width: 40px; height: 40px; border-radius: 10px; background: #f1f5f9; display: grid; place-items: center; font-size: 20px; }
.incard h4 { margin: 4px 0 0; font-size: 15px; } .incard p { color: var(--muted); font-size: 13px; flex: 1; margin: 0; }
.in-acts { display: flex; gap: 8px; margin-top: 6px; }
.modal-back { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: center; z-index: 50; padding: 20px; }
.modal { background: #fff; border-radius: 14px; padding: 22px; width: 420px; max-width: 94vw; }
.modal h3 { margin: 0 0 4px; }
.fld { margin-top: 12px; } .fld label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 4px; } .fld input { width: 100%; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
</style>
