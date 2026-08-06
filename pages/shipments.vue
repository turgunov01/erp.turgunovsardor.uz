<template>
  <div class="panel">
    <div class="panel-head"><h2>Отгрузки</h2></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>№</th><th>Заказ</th><th>Позиции</th><th>Дата</th></tr></thead>
        <tbody>
          <tr v-for="sh in shipments" :key="sh.id">
            <td><small>{{ sh.number }}</small></td>
            <td><small>{{ sh.so?.number || '—' }}</small></td>
            <td>{{ sh.items.map((i:any) => i.productName + ' ×' + num(i.quantity)).join(', ') }}</td>
            <td>{{ dt(sh.createdAt) }}</td>
          </tr>
          <tr v-if="!shipments.length"><td colspan="4" class="empty">Отгрузок нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel" style="margin-top:16px">
    <div class="panel-head"><h2>Возвраты</h2></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>№</th><th>Заказ</th><th>Причина</th><th>Позиции</th><th>Дата</th></tr></thead>
        <tbody>
          <tr v-for="rt in returns" :key="rt.id">
            <td><small>{{ rt.number }}</small></td>
            <td><small>{{ rt.so?.number || '—' }}</small></td>
            <td>{{ rt.reason || '—' }}</td>
            <td>{{ rt.items.map((i:any) => i.productName + ' ×' + num(i.quantity)).join(', ') }}</td>
            <td>{{ dt(rt.createdAt) }}</td>
          </tr>
          <tr v-if="!returns.length"><td colspan="5" class="empty">Возвратов нет</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const shipments = ref<any[]>([]); const returns = ref<any[]>([]);
async function load() {
  const [s, r] = await Promise.all([auth.api('/sales/shipments?pageSize=50'), auth.api('/sales/returns?pageSize=50')]);
  shipments.value = s.shipments; returns.value = r.returns;
}
onMounted(load);
</script>
