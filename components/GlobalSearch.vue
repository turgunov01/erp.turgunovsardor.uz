<template>
  <div class="gs-wrap">
    <input v-model="q" class="gs-input" placeholder="Поиск… (товары, клиенты, документы)" @input="onInput" @focus="open = true" @keydown.esc="open = false" />
    <div v-if="open && (hits.length || (q.length >= 2 && !loading))" class="gs-drop" @click.stop>
      <div v-for="h in hits" :key="h.type + h.id" class="gs-hit" @click="go(h)">
        <span class="gs-type">{{ typeLabel(h.type) }}</span>
        <span class="gs-title">{{ h.title }}</span>
        <span v-if="h.subtitle" class="gs-sub">{{ h.subtitle }}</span>
      </div>
      <div v-if="!hits.length" class="gs-empty">Ничего не найдено</div>
    </div>
    <div v-if="open" class="gs-back" @click="open = false"></div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuth();
const q = ref(''); const hits = ref<any[]>([]); const open = ref(false); const loading = ref(false);
let timer: any;
const labels: Record<string, string> = { product: 'Товар', customer: 'Клиент', supplier: 'Поставщик', document: 'Документ' };
const typeLabel = (t: string) => labels[t] || t;

function onInput() {
  clearTimeout(timer);
  if (q.value.trim().length < 2) { hits.value = []; return; }
  loading.value = true;
  timer = setTimeout(async () => {
    try { const d = await auth.api<any>(`/platform/search?q=${encodeURIComponent(q.value.trim())}`); hits.value = d.hits; }
    catch { hits.value = []; } finally { loading.value = false; }
  }, 250);
}
async function go(h: any) { open.value = false; q.value = ''; hits.value = []; await navigateTo(h.to); }
</script>

<style scoped>
.gs-wrap { position: relative; }
.gs-input { width: 260px; height: 34px; border: 1px solid var(--line); border-radius: 8px; padding: 0 12px; font-size: 13px; }
.gs-input:focus { border-color: var(--brand); outline: none; }
.gs-drop { position: absolute; left: 0; top: 40px; width: 340px; background: #fff; border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.14); z-index: 60; overflow: hidden; }
.gs-hit { display: flex; align-items: baseline; gap: 8px; padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
.gs-hit:hover { background: #f8fafc; }
.gs-type { font-size: 10px; text-transform: uppercase; color: #fff; background: var(--brand); border-radius: 4px; padding: 1px 5px; flex: none; }
.gs-title { font-size: 13px; font-weight: 500; }
.gs-sub { font-size: 11px; color: var(--muted); margin-left: auto; }
.gs-empty { padding: 12px; color: var(--muted); font-size: 13px; text-align: center; }
.gs-back { position: fixed; inset: 0; z-index: 55; }
</style>
