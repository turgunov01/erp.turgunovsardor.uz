<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Тендеры</h2>
      <div class="toolbar">
        <input v-model="q" class="search" placeholder="Поиск по названию / заказчику" @input="debouncedLoad" />
        <button class="btn sm" :disabled="refreshing" @click="refresh">{{ refreshing ? 'Обновляем…' : '↻ Обновить с сайтов' }}</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="src-row">
        <button class="chip" :class="{ on: source === '' }" @click="setSource('')">Все <b>{{ total }}</b></button>
        <button v-for="s in sources" :key="s.key" class="chip" :class="{ on: source === s.key }" @click="setSource(s.key)">
          {{ s.name }} <b>{{ countFor(s.key) }}</b>
        </button>
        <span v-if="lastFetchedAt" class="muted last">Обновлено: {{ dt(lastFetchedAt) }}</span>
      </div>

      <div v-if="msg" class="hint" :class="{ ok: !msgErr, neg: msgErr }">{{ msg }}</div>

      <table>
        <thead><tr><th>Название</th><th>Заказчик</th><th>Категория</th><th>Дедлайн</th><th>Источник</th><th></th></tr></thead>
        <tbody>
          <tr v-for="t in items" :key="t.id" :class="{ soon: isSoon(t.deadline) }">
            <td class="ttl">{{ t.title }}</td>
            <td>{{ t.organization || '—' }}</td>
            <td>{{ t.category || '—' }}<span v-if="t.region"> · {{ t.region }}</span></td>
            <td :class="{ neg: isSoon(t.deadline) }">{{ t.deadline ? fmtDate(t.deadline) : '—' }}</td>
            <td><span class="tag src" :class="t.source">{{ srcName(t.source) }}</span></td>
            <td class="num"><a :href="t.url" target="_blank" rel="noopener" class="link">Открыть ↗</a></td>
          </tr>
          <tr v-if="!items.length"><td colspan="6" class="muted">{{ loading ? 'Загрузка…' : 'Нет тендеров. Нажмите «Обновить с сайтов».' }}</td></tr>
        </tbody>
      </table>
      <div v-if="meta.totalPages > 1" class="pager">
        <button class="btn ghost sm" :disabled="meta.page <= 1" @click="go(meta.page - 1)">←</button>
        <span>{{ meta.page }} / {{ meta.totalPages }}</span>
        <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="go(meta.page + 1)">→</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();

const items = ref<any[]>([]);
const sources = ref<any[]>([]);
const counts = ref<any[]>([]);
const meta = ref<any>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
const total = ref(0);
const lastFetchedAt = ref<string | null>(null);
const source = ref(''); const q = ref(''); const page = ref(1);
const loading = ref(false); const refreshing = ref(false);
const msg = ref(''); const msgErr = ref(false);

const srcName = (k: string) => sources.value.find((s) => s.key === k)?.name || k;
const countFor = (k: string) => counts.value.find((c) => c.source === k)?._count || 0;
const isSoon = (d?: string | null) => d && (new Date(d).getTime() - Date.now()) < 5 * 86400000 && new Date(d).getTime() > Date.now();

async function load() {
  loading.value = true;
  try {
    const d = await auth.api<any>(`/platform/tenders?page=${page.value}&pageSize=20${source.value ? '&source=' + source.value : ''}${q.value ? '&q=' + encodeURIComponent(q.value) : ''}`);
    items.value = d.items; meta.value = d.meta; sources.value = d.sources; counts.value = d.counts;
    lastFetchedAt.value = d.lastFetchedAt;
    total.value = d.counts.reduce((s: number, c: any) => s + c._count, 0);
  } finally { loading.value = false; }
}
let t: any;
function debouncedLoad() { clearTimeout(t); t = setTimeout(() => { page.value = 1; load(); }, 300); }
function setSource(s: string) { source.value = s; page.value = 1; load(); }
function go(p: number) { page.value = p; load(); }
async function refresh() {
  refreshing.value = true; msg.value = '';
  try {
    const r = await auth.api<any>('/platform/tenders/refresh', { method: 'POST' });
    const parts = Object.entries(r.bySource).map(([k, v]) => `${srcName(k)}: ${v}`).join(', ');
    msg.value = `Загружено ${r.total} тендеров (${parts}).`; msgErr.value = false;
    await load();
  } catch (e: any) { msg.value = 'Ошибка обновления: ' + e.message; msgErr.value = true; }
  finally { refreshing.value = false; }
}
onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; }
.search { width: 300px; height: 34px; border: 1px solid var(--line); border-radius: 8px; padding: 0 12px; font-size: 13px; }
.src-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.chip { background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 13px; cursor: pointer; }
.chip.on { background: var(--brand); color: #fff; border-color: var(--brand); }
.chip b { margin-left: 4px; opacity: .8; }
.last { margin-left: auto; font-size: 12px; }
.ttl { max-width: 380px; font-weight: 500; }
tr.soon td { background: #fffbeb; }
.tag.src { background: #e0e7ff; color: #3730a3; }
.tag.src.tenderweek { background: #dcfce7; color: #166534; }
.tag.src.etender { background: #dbeafe; color: #1e40af; }
.tag.src\.xt-xarid, .tag.src.xt-xarid { background: #fef3c7; color: #92400e; }
.hint { margin: 0 0 12px; font-size: 13px; }
.hint.ok { color: #166534; } .hint.neg, .neg { color: #dc2626; }
.pager { display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 14px; }
.link { color: var(--brand); }
</style>
