<template>
  <div class="panel">
    <div class="panel-head"><h2>Персонал — сотрудники и зарплата</h2></div>
    <div class="panel-body">
      <p class="hint">ℹ️ Здесь вы ведёте людей: их данные и должности, отпуска, табель рабочего времени и расчёт зарплаты.</p>

      <div class="stats">
        <div class="stat people">
          <div class="stat-ico">👥</div>
          <div class="stat-num">{{ s.headcount.active }}</div>
          <div class="stat-lab">Сотрудников</div>
          <div class="stat-sub">всего {{ s.headcount.total }}</div>
        </div>
        <div class="stat leave">
          <div class="stat-ico">🏖️</div>
          <div class="stat-num">{{ s.headcount.onLeave }}</div>
          <div class="stat-lab">В отпуске</div>
          <div class="stat-sub">сейчас отдыхают</div>
        </div>
        <div class="stat req">
          <div class="stat-ico">📩</div>
          <div class="stat-num">{{ s.pendingLeaves }}</div>
          <div class="stat-lab">Заявок на отпуск</div>
          <div class="stat-sub">ждут решения</div>
        </div>
        <div class="stat pay">
          <div class="stat-ico">💰</div>
          <div class="stat-num small">{{ s.lastRun ? s.lastRun.periodCode : '—' }}</div>
          <div class="stat-lab">Последний расчёт</div>
          <div class="stat-sub">{{ s.lastRun ? runStatus(s.lastRun.status) : 'ещё не было' }}</div>
        </div>
      </div>

      <h3 class="section">С чего начать? Выберите раздел:</h3>
      <div class="actions">
        <NuxtLink to="/employees" class="action">
          <div class="action-ico">🧑</div><div><b>Сотрудники</b><span>Люди компании: данные, должности, оклад</span></div><div class="arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/hr-structure" class="action">
          <div class="action-ico">🏢</div><div><b>Оргструктура</b><span>Отделы и должности</span></div><div class="arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/leaves" class="action">
          <div class="action-ico">🏖️</div><div><b>Отпуска</b><span>Заявки на отпуск: одобрить или отклонить</span></div><div class="arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/timesheet" class="action">
          <div class="action-ico">🗓️</div><div><b>Табель</b><span>Отметки отработанных дней и часов</span></div><div class="arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/payroll" class="action">
          <div class="action-ico">💰</div><div><b>Зарплата</b><span>Расчёт и выплата зарплаты за месяц</span></div><div class="arrow">→</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const s = reactive<any>({ headcount: { total: 0, active: 0, onLeave: 0, terminated: 0 }, pendingLeaves: 0, lastRun: null });
const RUN: Record<string, string> = { draft: 'черновик', approved: 'утверждён', paid: 'выплачен' };
const runStatus = (st: string) => RUN[st] || st;
onMounted(async () => { try { Object.assign(s, await auth.api('/hr/summary')); } catch {} });
</script>

<style scoped>
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 12px 16px; margin: 0 0 18px; font-size: 14px; }
.section { margin: 24px 0 14px; font-size: 16px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.stat { border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; text-align: center; background: #fff; }
.stat-ico { font-size: 30px; }
.stat-num { font-size: 40px; font-weight: 800; line-height: 1.1; margin: 6px 0; }
.stat-num.small { font-size: 24px; }
.stat-lab { font-weight: 600; font-size: 15px; }
.stat-sub { color: #64748b; font-size: 12px; margin-top: 3px; }
.stat.people { border-top: 4px solid #2563eb; }
.stat.leave { border-top: 4px solid #f59e0b; }
.stat.req { border-top: 4px solid #dc2626; }
.stat.pay { border-top: 4px solid #16a34a; }
.actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.action { display: flex; align-items: center; gap: 16px; text-decoration: none; color: inherit; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; background: #fff; transition: border-color .15s, box-shadow .15s, transform .1s; }
.action:hover { border-color: #2563eb; box-shadow: 0 4px 14px rgba(37,99,235,.12); transform: translateY(-2px); }
.action-ico { font-size: 32px; }
.action b { display: block; font-size: 16px; }
.action span { color: #64748b; font-size: 13px; }
.action .arrow { margin-left: auto; font-size: 24px; color: #94a3b8; }
</style>
