<template>
  <div class="panel">
    <div class="panel-head"><h2>Компании</h2></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Код</th><th>Название</th><th>Валюта</th><th class="num">Филиалы</th><th class="num">Склады</th></tr></thead>
        <tbody>
          <tr v-for="c in companies" :key="c.id"><td><small>{{ c.code }}</small></td><td>{{ c.name }}</td><td>{{ c.currency }}</td>
            <td class="num">{{ c._count?.branches ?? 0 }}</td><td class="num">{{ c._count?.warehouses ?? 0 }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const companies = ref<any[]>([]);
onMounted(async () => { companies.value = (await auth.api('/org/companies')).companies; });
</script>
