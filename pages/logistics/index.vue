<template>
  <div class="panel">
    <div class="panel-head"><h2>Логистика — доставка и автопарк</h2></div>
    <div class="panel-body">
      <p class="hint">ℹ️ Здесь вы управляете доставкой: машины (автопарк), рейсы с точками маршрута и отправка их в путь.</p>

      <div class="stats">
        <div class="stat cars">
          <div class="stat-ico">🚚</div>
          <div class="stat-num">{{ s.vehicles }}</div>
          <div class="stat-lab">Всего машин</div>
          <div class="stat-sub">свободно {{ s.availableVehicles }}</div>
        </div>
        <div class="stat plan">
          <div class="stat-ico">🗓️</div>
          <div class="stat-num">{{ s.planned }}</div>
          <div class="stat-lab">Запланировано</div>
          <div class="stat-sub">ждут отправки</div>
        </div>
        <div class="stat road">
          <div class="stat-ico">🛣️</div>
          <div class="stat-num">{{ s.inTransit }}</div>
          <div class="stat-lab">В пути</div>
          <div class="stat-sub">едут сейчас</div>
        </div>
        <div class="stat done">
          <div class="stat-ico">✅</div>
          <div class="stat-num">{{ s.delivered }}</div>
          <div class="stat-lab">Доставлено</div>
          <div class="stat-sub">завершённых рейсов</div>
        </div>
      </div>

      <h3 class="section">С чего начать? Выберите, что хотите сделать:</h3>
      <div class="actions">
        <NuxtLink to="/logistics/dispatch" class="action">
          <div class="action-ico">🗺️</div>
          <div><b>Диспетчерская</b><span>Отправлять рейсы в путь и завершать доставку</span></div>
          <div class="arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/deliveries" class="action">
          <div class="action-ico">🚚</div>
          <div><b>Рейсы</b><span>Создать рейс и задать точки маршрута</span></div>
          <div class="arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/logistics-vehicles" class="action">
          <div class="action-ico">⛟</div>
          <div><b>Автопарк</b><span>Машины, водители, статус и грузоподъёмность</span></div>
          <div class="arrow">→</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const s = reactive<any>({ vehicles: 0, availableVehicles: 0, planned: 0, inTransit: 0, delivered: 0 });
onMounted(async () => { try { Object.assign(s, await auth.api('/logistics/summary')); } catch {} });
</script>

<style scoped>
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 12px 16px; margin: 0 0 18px; font-size: 14px; }
.section { margin: 24px 0 14px; font-size: 16px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.stat { border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; text-align: center; background: #fff; }
.stat-ico { font-size: 30px; }
.stat-num { font-size: 40px; font-weight: 800; line-height: 1.1; margin: 6px 0; }
.stat-lab { font-weight: 600; font-size: 15px; }
.stat-sub { color: #64748b; font-size: 12px; margin-top: 3px; }
.stat.cars { border-top: 4px solid #2563eb; }
.stat.plan { border-top: 4px solid #64748b; }
.stat.road { border-top: 4px solid #f59e0b; }
.stat.done { border-top: 4px solid #16a34a; }
.actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.action { display: flex; align-items: center; gap: 16px; text-decoration: none; color: inherit; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; background: #fff; transition: border-color .15s, box-shadow .15s, transform .1s; }
.action:hover { border-color: #2563eb; box-shadow: 0 4px 14px rgba(37,99,235,.12); transform: translateY(-2px); }
.action-ico { font-size: 32px; }
.action b { display: block; font-size: 16px; }
.action span { color: #64748b; font-size: 13px; }
.action .arrow { margin-left: auto; font-size: 24px; color: #94a3b8; }
</style>
