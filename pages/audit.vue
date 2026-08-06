<template>
  <div class="panel">
    <div class="panel-head"><h2>Аудит</h2></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Когда</th><th>Действие</th><th>Объект</th><th>Детали</th></tr></thead>
        <tbody>
          <tr v-for="l in logs" :key="l.id"><td>{{ dt(l.createdAt) }}</td>
            <td><span class="tag muted">{{ l.action }}</span></td><td>{{ l.entity }}</td>
            <td><small style="color:#64748b">{{ l.meta || '' }}</small></td></tr>
          <tr v-if="!logs.length"><td colspan="4" class="empty">Событий нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const logs = ref<any[]>([]);
onMounted(async () => { logs.value = (await auth.api('/admin/audit?pageSize=100')).logs; });
</script>
