<template>
  <div class="panel">
    <div class="panel-head">
      <h2>Фоновые задачи</h2>
      <div class="toolbar">
        <span v-for="c in counts" :key="c.status" class="tag" :class="cls(c.status)">{{ statusLabel(c.status) }}: {{ c._count }}</span>
        <select v-model="status" @change="load"><option value="">Все</option><option value="queued">В очереди</option><option value="running">Выполняется</option><option value="done">Готово</option><option value="failed">Ошибка</option></select>
        <button class="btn ghost sm" @click="load">Обновить</button>
      </div>
    </div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Тип</th><th>Статус</th><th>Попыток</th><th>Запуск</th><th>Ошибка</th><th></th></tr></thead>
        <tbody>
          <tr v-for="j in items" :key="j.id">
            <td><code>{{ j.type }}</code></td>
            <td><span class="tag" :class="cls(j.status)">{{ statusLabel(j.status) }}</span></td>
            <td>{{ j.attempts }}/{{ j.maxAttempts }}</td>
            <td>{{ fmtDate(j.runAt) }}</td>
            <td class="err">{{ j.lastError || '' }}</td>
            <td><button v-if="j.status === 'failed'" class="link" @click="retry(j)">повторить</button></td>
          </tr>
          <tr v-if="!items.length"><td colspan="6" class="muted">Нет задач</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const items = ref<any[]>([]); const counts = ref<any[]>([]); const status = ref('');

const statusLabel = (s: string) => ({ queued: 'В очереди', running: 'Выполняется', done: 'Готово', failed: 'Ошибка' } as any)[s] || s;
const cls = (s: string) => ({ done: 'in', failed: 'out', running: 'adjust', queued: 'muted' } as any)[s] || 'muted';

async function load() {
  const d = await auth.api<any>(`/platform/jobs?pageSize=100${status.value ? '&status=' + status.value : ''}`);
  items.value = d.items; counts.value = d.counts;
}
async function retry(j: any) { await auth.api(`/platform/jobs/${j.id}/retry`, { method: 'POST' }); toast('Задача перезапущена'); await load(); }
onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.err { color: #dc2626; font-size: 12px; max-width: 320px; }
.link { background: none; border: none; color: var(--brand); cursor: pointer; }
</style>
