<template>
  <div class="panel">
    <div class="panel-head"><h2>Учётные периоды</h2></div>
    <div class="panel-body">
      <div v-if="!periods.length" class="empty" style="padding:24px">Периоды создаются автоматически при первой проводке в месяце.</div>
      <table v-else>
        <thead><tr><th>Период</th><th>Начало</th><th>Конец</th><th>Статус</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in periods" :key="p.id">
            <td><b>{{ p.code }}</b></td>
            <td>{{ d(p.startDate) }}</td>
            <td>{{ d(p.endDate) }}</td>
            <td><span :class="p.status === 'closed' ? 'neg' : 'pos'">{{ p.status === 'closed' ? 'закрыт' : 'открыт' }}</span></td>
            <td class="num">
              <button v-if="canAccounting && p.status === 'open'" class="btn ghost sm" @click="close(p)">Закрыть</button>
              <button v-if="canAccounting && p.status === 'closed'" class="btn ghost sm" @click="reopen(p)">Открыть</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="hint" style="text-align:left;margin-top:12px">Закрытый период блокирует новые проводки за этот месяц (в т.ч. автопроводки). Открытие снимает блокировку.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const periods = ref<any[]>([]);
const canAccounting = computed(() => auth.can('finance.accounting'));
function d(v: string) { return new Date(v).toLocaleDateString('ru-RU'); }

async function reload() { periods.value = (await auth.api('/finance/periods')).periods; }
async function close(p: any) {
  try { await auth.api(`/finance/periods/${p.id}/close`, { method: 'POST' }); toast(`Период ${p.code} закрыт`); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
async function reopen(p: any) {
  try { await auth.api(`/finance/periods/${p.id}/reopen`, { method: 'POST' }); toast(`Период ${p.code} открыт`); await reload(); }
  catch (e: any) { toast(e.message, true); }
}
onMounted(reload);
</script>

<style scoped>
.pos { color: var(--ok, #16a34a); }
.neg { color: var(--danger, #dc2626); }
</style>
