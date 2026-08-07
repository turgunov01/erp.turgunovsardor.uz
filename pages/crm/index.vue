<template>
  <div class="panel">
    <div class="panel-head">
      <h2>CRM — сделки с клиентами</h2>
    </div>
    <div class="panel-body">
      <p class="hint">ℹ️ Здесь вы ведёте продажи: от первой заявки клиента до оплаты. Ниже — сколько у вас сделок прямо сейчас.</p>

      <!-- Крупные понятные цифры -->
      <div class="stats">
        <div class="stat new">
          <div class="stat-ico">🆕</div>
          <div class="stat-num">{{ s.newCount }}</div>
          <div class="stat-lab">Новые заявки</div>
          <div class="stat-sub">их нужно обработать первыми</div>
        </div>
        <div class="stat work">
          <div class="stat-ico">🔧</div>
          <div class="stat-num">{{ s.workCount }}</div>
          <div class="stat-lab">В работе</div>
          <div class="stat-sub">на сумму {{ money(s.workSum) }}</div>
        </div>
        <div class="stat won">
          <div class="stat-ico">✅</div>
          <div class="stat-num">{{ s.wonCount }}</div>
          <div class="stat-lab">Выиграно</div>
          <div class="stat-sub">получили {{ money(s.wonSum) }}</div>
        </div>
        <div class="stat lost">
          <div class="stat-ico">❌</div>
          <div class="stat-num">{{ s.lostCount }}</div>
          <div class="stat-lab">Проиграно</div>
          <div class="stat-sub">клиент отказался</div>
        </div>
      </div>

      <!-- Куда идти дальше -->
      <h3 class="section">С чего начать? Выберите, что хотите сделать:</h3>
      <div class="actions">
        <NuxtLink to="/crm/deals" class="action">
          <div class="action-ico">📋</div>
          <div>
            <b>Список сделок</b>
            <span>Посмотреть все сделки и добавить новую</span>
          </div>
          <div class="arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/deals" class="action">
          <div class="action-ico">📊</div>
          <div>
            <b>Воронка (доска)</b>
            <span>Перетаскивать сделки по этапам мышкой</span>
          </div>
          <div class="arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/crm/results" class="action">
          <div class="action-ico">🏁</div>
          <div>
            <b>Итоги</b>
            <span>Кто купил, а кто отказался и почему</span>
          </div>
          <div class="arrow">→</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const cols = ref<any[]>([]);

const find = (stage: string) => cols.value.find((c) => c.stage === stage) || { count: 0, totalMinor: 0 };
const s = computed(() => {
  const lead = find('lead'), qual = find('qualified'), prop = find('proposal'), won = find('won'), lost = find('lost');
  return {
    newCount: lead.count,
    workCount: lead.count + qual.count + prop.count,
    workSum: Number(lead.totalMinor) + Number(qual.totalMinor) + Number(prop.totalMinor),
    wonCount: won.count, wonSum: Number(won.totalMinor),
    lostCount: lost.count,
  };
});

async function load() {
  const f = await auth.api('/crm/funnel');
  cols.value = f.columns;
}
onMounted(load);
</script>

<style scoped>
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; font-size: 14px; }
.section { margin: 22px 0 12px; font-size: 15px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.stat { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; background: #fff; }
.stat-ico { font-size: 26px; }
.stat-num { font-size: 34px; font-weight: 800; line-height: 1.1; margin: 4px 0; }
.stat-lab { font-weight: 600; }
.stat-sub { color: #64748b; font-size: 12px; margin-top: 2px; }
.stat.new  { border-top: 4px solid #f59e0b; }
.stat.work { border-top: 4px solid #2563eb; }
.stat.won  { border-top: 4px solid #16a34a; }
.stat.lost { border-top: 4px solid #dc2626; }
.actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.action { display: flex; align-items: center; gap: 14px; text-decoration: none; color: inherit; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fff; transition: border-color .15s, box-shadow .15s; }
.action:hover { border-color: #2563eb; box-shadow: 0 2px 10px rgba(37,99,235,.12); }
.action-ico { font-size: 28px; }
.action b { display: block; font-size: 15px; }
.action span { color: #64748b; font-size: 13px; }
.action .arrow { margin-left: auto; font-size: 22px; color: #94a3b8; }
</style>
