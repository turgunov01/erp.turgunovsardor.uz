<template>
  <div>
    <div class="panel">
      <div class="panel-head">
        <h2>НДС</h2>
        <div class="toolbar">
          <label class="rng">С <input v-model="from" type="date" /></label>
          <label class="rng">по <input v-model="to" type="date" /></label>
          <button class="btn ghost sm" @click="load">Обновить</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="vat-cards">
          <div class="vcard"><div class="vlabel">НДС с продаж (к уплате)</div><div class="vval">{{ money(Number(rep.outputVatMinor)) }}</div></div>
          <div class="vcard"><div class="vlabel">НДС по закупкам (к зачёту)</div><div class="vval">{{ money(Number(rep.inputVatMinor)) }}</div></div>
          <div class="vcard hot"><div class="vlabel">К уплате в бюджет</div><div class="vval" :class="Number(rep.netPayableMinor) >= 0 ? 'neg' : 'pos'">{{ money(Number(rep.netPayableMinor)) }}</div></div>
        </div>
        <div v-if="!rep.vatEnabled" class="hint warn">НДС выключен — авто-проводки не выделяют налог. Включите ниже.</div>
        <div class="actions" v-if="canManage">
          <button class="btn sm" :disabled="!rep.vatEnabled || busy" @click="settle">Зачесть НДС за период</button>
          <span v-if="msg" class="muted">{{ msg }}</span>
        </div>
      </div>
    </div>

    <div class="panel" v-if="canManage">
      <div class="panel-head"><h2>Настройки НДС</h2></div>
      <div class="panel-body">
        <label class="chk"><input type="checkbox" v-model="settings.vatEnabled" /> Учитывать НДС в проводках</label>
        <div class="row2" style="max-width:320px;margin-top:10px">
          <div><label>Ставка НДС, %</label><input v-model.number="settings.vatRatePct" type="number" min="0" max="100" /></div>
          <div style="align-self:end"><button class="btn sm" @click="saveSettings">Сохранить</button></div>
        </div>
        <div class="hint">НДС начисляется сверх чистой суммы: выручка/себестоимость остаются без НДС, налог — отдельными счетами (5030 к уплате, 1060 к зачёту).</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const canManage = computed(() => auth.can('finance.accounting'));

function monthBounds() {
  const d = new Date();
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { first, last };
}
const { first, last } = monthBounds();
const from = ref(first); const to = ref(last);
const rep = ref<any>({ outputVatMinor: 0, inputVatMinor: 0, netPayableMinor: 0, vatEnabled: false, ratePct: 12 });
const settings = ref<any>({ vatEnabled: false, vatRatePct: 12 });
const busy = ref(false); const msg = ref('');

async function load() {
  rep.value = await auth.api(`/finance/reports/vat?from=${from.value}&to=${to.value}`);
  settings.value = await auth.api('/finance/settings');
}
async function saveSettings() {
  await auth.api('/finance/settings', { method: 'PATCH', body: { vatEnabled: settings.value.vatEnabled, vatRatePct: Number(settings.value.vatRatePct) } });
  toast('Настройки НДС сохранены'); await load();
}
async function settle() {
  busy.value = true; msg.value = '';
  try {
    const r = await auth.api('/finance/vat/settle', { method: 'POST', body: { from: from.value, to: to.value } });
    toast(`Зачёт НДС проведён: ${money(Number(r.offsetMinor))}`); await load();
  } catch (e: any) { msg.value = e.message; } finally { busy.value = false; }
}
onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; }
.rng { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; }
.rng input { width: 150px; }
.vat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.vcard { border: 1px solid var(--line); border-radius: 12px; padding: 16px; background: #fff; }
.vcard.hot { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(37,99,235,.06); }
.vlabel { color: var(--muted); font-size: 13px; }
.vval { font-size: 22px; font-weight: 700; margin-top: 6px; }
.actions { margin-top: 16px; display: flex; gap: 12px; align-items: center; }
.chk { display: flex; gap: 8px; align-items: center; font-size: 14px; }
.hint { color: var(--muted); font-size: 13px; margin-top: 12px; }
.hint.warn { color: #92400e; background: #fef3c7; padding: 8px 12px; border-radius: 8px; display: inline-block; }
.pos { color: #16a34a; } .neg { color: #dc2626; }
</style>
