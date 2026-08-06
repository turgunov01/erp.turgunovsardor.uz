<template>
  <div class="panel">
    <div class="panel-head"><h2>Журнал движений</h2></div>
    <div class="panel-body">
      <div v-if="!movements.length" class="empty">Движений нет.</div>
      <table v-else>
        <thead><tr><th>Тип</th><th>Товар</th><th>Склад</th><th class="num">Кол-во</th><th class="num">Остаток</th><th>Причина</th><th>Когда</th></tr></thead>
        <tbody>
          <tr v-for="m in movements" :key="m.id">
            <td><span class="tag" :class="m.type.toLowerCase()">{{ m.type }}</span></td>
            <td>{{ m.product }}<br><small style="color:#94a3b8">{{ m.sku }}</small></td>
            <td>{{ m.warehouse }}</td>
            <td class="num">{{ num(m.quantity) }}</td><td class="num">{{ num(m.balanceAfter) }}</td>
            <td>{{ m.reason || '' }}</td><td>{{ dt(m.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="meta" class="pager">
      <span class="pager-info">Всего: {{ meta.total }} · стр. {{ meta.page }}/{{ meta.totalPages }}</span>
      <button class="btn ghost sm" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">← Назад</button>
      <button class="btn ghost sm" :disabled="meta.page >= meta.totalPages" @click="reload(meta.page + 1)">Вперёд →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const movements = ref<any[]>([]); const meta = ref<any>(null); const page = ref(1);
async function reload(p = 1) {
  page.value = p;
  const r = await auth.api(`/warehouse/movements?page=${p}&pageSize=25`);
  movements.value = r.movements; meta.value = r.meta;
}
onMounted(() => reload(1));
</script>
