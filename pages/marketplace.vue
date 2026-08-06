<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Маркетплейс модулей</h2>
      <span class="muted" style="font-size:13px">Тариф «{{ plan.name }}»<template v-if="plan.maxModules != null"> · {{ usedCount }}/{{ plan.maxModules }} модулей</template></span>
    </div>
    <div class="panel-body" style="padding:18px">
      <div v-for="cat in categories" :key="cat" class="cat">
        <h3 class="cat-h">{{ cat }}</h3>
        <div class="mkgrid">
          <div v-for="m in byCat(cat)" :key="m.key" class="mkcard" :class="{ on: m.installed, soon: !m.available }">
            <div class="mk-top"><span class="mk-ic">{{ m.icon }}</span>
              <span v-if="!m.available" class="tag muted">Скоро</span>
              <span v-else-if="m.installed" class="tag in">Установлен</span>
            </div>
            <h4>{{ m.name }}</h4>
            <p>{{ m.description }}</p>
            <button v-if="!m.available" class="btn ghost sm" disabled>Скоро</button>
            <button v-else-if="m.installed" class="btn ghost sm" @click="setModule(m, false)">Удалить</button>
            <button v-else class="btn sm" @click="setModule(m, true)">Установить</button>
          </div>
        </div>
      </div>
      <div v-if="err" class="error">{{ err }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const items = ref<any[]>([]); const plan = ref<any>({ name: '', maxModules: null }); const usedCount = ref(0); const err = ref('');

const categories = computed(() => [...new Set(items.value.map((m) => m.category))]);
const byCat = (c: string) => items.value.filter((m) => m.category === c);

async function load() {
  const d = await auth.api<any>('/studio/marketplace');
  items.value = d.items; plan.value = d.plan; usedCount.value = d.usedCount;
}
async function setModule(m: any, enabled: boolean) {
  err.value = '';
  try {
    await auth.api(`/tenant/modules/${m.key}`, { method: 'PATCH', body: { enabled } });
    toast(enabled ? `Модуль «${m.name}» установлен` : `Модуль «${m.name}» удалён`);
    await load(); await auth.boot(); // refresh enabled modules for nav
  } catch (e: any) { err.value = e.message; }
}
onMounted(load);
</script>

<style scoped>
.cat { margin-bottom: 22px; }
.cat-h { font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin: 0 0 12px; }
.mkgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.mkcard { border: 1px solid var(--line); border-radius: 12px; padding: 16px; background: #fff; display: flex; flex-direction: column; gap: 6px; }
.mkcard.on { border-color: #86efac; background: #f7fef9; }
.mkcard.soon { opacity: .7; }
.mk-top { display: flex; align-items: center; justify-content: space-between; }
.mk-ic { width: 40px; height: 40px; border-radius: 10px; background: #eff6ff; color: var(--brand); display: grid; place-items: center; font-size: 20px; }
.mkcard h4 { margin: 4px 0 0; font-size: 15px; } .mkcard p { color: var(--muted); font-size: 13px; flex: 1; margin: 0; }
.mkcard .btn { align-self: flex-start; margin-top: 6px; }
</style>
