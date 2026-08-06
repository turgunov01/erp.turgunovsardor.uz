<template>
  <div>
    <!-- Mobile home: navigation as tappable cards, grouped by section (all roles). -->
    <div class="mnav">
      <div class="mnav-hello">{{ t('dash.greeting') }}, {{ firstName }} 👋</div>
      <template v-for="g in groups" :key="g.id">
        <div class="mnav-sec">{{ g.label || t('dash.quickNav') }}</div>
        <div class="mnav-grid">
          <NuxtLink v-for="v in g.views" :key="v.id" :to="v.to" class="mnav-card">
            <span class="mnav-ic">{{ v.ico }}</span>
            <span class="mnav-lbl">{{ v.label }}</span>
          </NuxtLink>
        </div>
      </template>
    </div>

    <div v-if="onboarding.length" class="panel desktop-only">
      <div class="panel-head"><h2>{{ t('dash.firstSteps') }} ({{ doneCount }}/{{ onboarding.length }})</h2></div>
      <div class="panel-body" style="padding:14px 18px">
        <div class="checklist">
          <NuxtLink v-for="s in onboarding" :key="s.label" :to="s.to" class="checkitem" :class="{ done: s.done }">
            <span class="ck">{{ s.done ? '✓' : '○' }}</span>{{ s.label }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="kpis desktop-only">
      <div class="kpi"><div class="k-label">Товары</div><div class="k-value">{{ products.length }}</div></div>
      <div class="kpi"><div class="k-label">Склады</div><div class="k-value">{{ warehouses.length }}</div></div>
      <div class="kpi"><div class="k-label">Стоимость запасов</div><div class="k-value">{{ money(value) }}</div></div>
      <div class="kpi"><div class="k-label">Нет в наличии</div><div class="k-value" :class="{ low }">{{ lowCount }}</div></div>
    </div>

    <div class="panel desktop-only">
      <div class="panel-head"><h2>{{ t('dash.recentMovements') }}</h2></div>
      <div class="panel-body">
        <div v-if="!movements.length" class="empty">Движений пока нет.</div>
        <table v-else>
          <thead><tr><th>Тип</th><th>Товар</th><th>Склад</th><th class="num">Кол-во</th><th class="num">Остаток</th><th>Когда</th></tr></thead>
          <tbody>
            <tr v-for="m in movements" :key="m.id">
              <td><span class="tag" :class="m.type.toLowerCase()">{{ m.type }}</span></td>
              <td>{{ m.product }}<br><small style="color:#94a3b8">{{ m.sku }}</small></td>
              <td>{{ m.warehouse }}</td>
              <td class="num">{{ num(m.quantity) }}</td>
              <td class="num">{{ num(m.balanceAfter) }}</td>
              <td>{{ dt(m.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { groups } = useNav();
const { t } = useI18n();
const firstName = computed(() => (auth.user?.fullName || '').split(' ')[0] || 'коллега');
const products = ref<any[]>([]); const warehouses = ref<any[]>([]); const stock = ref<any[]>([]); const movements = ref<any[]>([]);

const value = computed(() => {
  const price: Record<string, number> = {}; products.value.forEach((p) => price[p.sku] = p.priceMinor || 0);
  return stock.value.reduce((sum, s) => sum + (price[s.sku] || 0) * Number(s.quantity), 0);
});
const lowCount = computed(() => stock.value.filter((s) => Number(s.available) <= 0).length);
const low = computed(() => lowCount.value > 0);
const onboarding = computed(() => auth.can('tenant.manage') ? [
  { done: warehouses.value.length > 0, label: 'Создать склад', to: '/warehouses' },
  { done: products.value.length > 0, label: 'Добавить товары', to: '/products' },
  { done: movements.value.length > 0, label: 'Оприходовать остатки', to: '/inventory' },
  { done: auth.subscription && auth.subscription.status !== 'trialing', label: 'Оформить подписку', to: '/billing' },
].filter(() => doneCountRaw() < 4) : []);
function doneCountRaw() {
  let d = 0;
  if (warehouses.value.length) d++; if (products.value.length) d++; if (movements.value.length) d++;
  if (auth.subscription && auth.subscription.status !== 'trialing') d++;
  return d;
}
const doneCount = computed(() => onboarding.value.filter((s) => s.done).length);

onMounted(async () => {
  const canWh = auth.can('warehouse.read'); const canCat = auth.can('catalog.read');
  const [st, pr, wh, mv] = await Promise.all([
    canWh ? auth.api('/warehouse/stock') : { stock: [] },
    canCat ? auth.api('/catalog/products') : { products: [] },
    canWh ? auth.api('/warehouse/warehouses') : { warehouses: [] },
    canWh ? auth.api('/warehouse/movements?pageSize=8') : { movements: [] },
  ]);
  stock.value = st.stock; products.value = pr.products; warehouses.value = wh.warehouses; movements.value = mv.movements;
});
</script>

<style scoped>
/* Mobile home launcher — hidden on desktop, shown as tappable cards on mobile. */
.mnav { display: none; }
@media (max-width: 860px) {
  .mnav { display: block; }
}
.mnav-hello { font-size: 20px; font-weight: 700; margin: 4px 4px 14px; }
.mnav-sec { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 18px 4px 10px; }
.mnav-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.mnav-card { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; background: var(--panel); border: 1px solid var(--line);
  border-radius: 14px; padding: 16px; text-decoration: none; color: var(--ink); box-shadow: var(--shadow); }
.mnav-card:active { transform: scale(.97); }
.mnav-ic { width: 44px; height: 44px; border-radius: 12px; background: #eff6ff; color: var(--brand); display: grid; place-items: center; font-size: 22px; }
.mnav-lbl { font-size: 14px; font-weight: 600; line-height: 1.25; }
@media (max-width: 380px) { .mnav-grid { grid-template-columns: 1fr; } }
</style>
