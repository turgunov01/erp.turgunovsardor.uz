<template>
  <div class="lp">
    <header class="lp-head">
      <div class="lp-wrap nav">
        <div class="brand"><div class="logo">T</div>TTR&nbsp;ONE</div>
        <div class="links">
          <a href="#features" class="menu">{{ t('nav.features') }}</a>
          <a href="#pricing" class="menu">{{ t('nav.pricing') }}</a>
          <a href="#niches" class="menu">{{ t('nav.niches') }}</a>
          <NuxtLink to="/developers" class="menu">Разработчикам</NuxtLink>
          <LangSwitcher />
          <NuxtLink to="/login" class="btn ghost">{{ t('auth.login') }}</NuxtLink>
          <NuxtLink to="/register" class="btn">{{ t('auth.register') }}</NuxtLink>
        </div>
      </div>
    </header>

    <section class="hero">
      <div class="lp-wrap">
        <div class="pill">{{ t('hero.pill') }}</div>
        <h1>{{ t('hero.title') }}</h1>
        <p class="sub">{{ t('hero.sub') }}</p>
        <div class="cta">
          <NuxtLink to="/register" class="btn lg">{{ t('hero.startFree') }}</NuxtLink>
          <NuxtLink to="/login" class="btn ghost lg">{{ t('hero.loginPanel') }}</NuxtLink>
        </div>
        <div class="badges">
          <span class="badge">14 дней бесплатно — все модули</span>
          <span class="badge">Мультитенантность</span>
          <span class="badge">AI со своим ключом</span>
          <span class="badge">Мобильное PWA</span>
          <span class="badge">RBAC + аудит + 2FA</span>
        </div>
      </div>
    </section>

    <section id="features" class="sec">
      <div class="lp-wrap">
        <div class="eyebrow">{{ t('features.eyebrow') }}</div>
        <h2>{{ t('features.title') }}</h2>
        <p class="lead">{{ t('features.lead') }}</p>
        <div class="grid">
          <div v-for="f in features" :key="f.t" class="card">
            <div class="ic">{{ f.i }}</div><h3>{{ f.t }}</h3><p>{{ f.d }}</p>
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="sec alt">
      <div class="lp-wrap">
        <div class="eyebrow">{{ t('pricing.eyebrow') }}</div>
        <h2>{{ t('pricing.title') }}</h2>
        <p class="lead">{{ t('pricing.lead') }}</p>
        <div class="plans">
          <div v-for="p in plans" :key="p.key" class="plan" :class="{ hot: p.highlight }">
            <div v-if="p.highlight" class="tagpop">Популярный</div>
            <h3>{{ p.name }}</h3>
            <div class="price">{{ priceLabel(p) }}</div>
            <div class="mods">{{ quotaLabel(p) }}</div>
            <p class="ptag">{{ p.tagline }}</p>
            <NuxtLink to="/register" class="btn block" :class="{ ghost: !p.highlight }">{{ t('pricing.choose') }}</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section id="niches" class="sec">
      <div class="lp-wrap">
        <div class="eyebrow">{{ t('niches.eyebrow') }}</div>
        <h2>{{ t('niches.title') }}</h2>
        <p class="lead">{{ t('niches.lead') }}</p>
        <div class="chips">
          <span v-for="n in nicheList" :key="n" class="chip">{{ n }}</span>
        </div>
      </div>
    </section>

    <section class="sec alt">
      <div class="lp-wrap">
        <div class="cta-band">
          <h2>{{ t('cta.title') }}</h2>
          <p>{{ t('cta.sub') }}</p>
          <NuxtLink to="/register" class="btn lg">{{ t('cta.button') }}</NuxtLink>
        </div>
      </div>
    </section>

    <footer class="lp-foot">© 2026 TTR Inc. · TTR ONE — Enterprise ERP Platform · Узбекистан</footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const auth = useAuth();
const { t } = useI18n();

const features = [
  { i: '▤', t: 'Склад и запасы', d: 'Склады, ячейки, партии и сроки, серийники, штрихкоды, мин-остатки и автозаявки.' },
  { i: '↗', t: 'Продажи и CRM', d: 'Клиенты, КП, заказы, резерв, отгрузки, возвраты, прайс-листы и воронка сделок.' },
  { i: '↘', t: 'Закупки и тендеры', d: 'Поставщики, 3-way match, приход по накладной + парсинг тендеров с гос-порталов.' },
  { i: '⚙', t: 'Производство', d: 'Спецификации (BOM), производственные заказы, списание материалов и выпуск ГП.' },
  { i: '₴', t: 'Финансы и учёт', d: 'Двойная запись, себестоимость FIFO/средневзвеш., НДС, бюджеты, платёжный календарь.' },
  { i: '📊', t: 'Аналитика и BI', d: 'Настраиваемые KPI-дашборды, графики, отчёты с экспортом в Excel/PDF.' },
  { i: '✦', t: 'AI-ассистент', d: 'Вопросы к данным на русском, OCR накладных, прогноз спроса. Свой ключ и модель.' },
  { i: '🗎', t: 'Документооборот', d: 'Word-редактор, импорт .docx, шаблоны, версии, маршрут согласования и подпись.' },
  { i: '📱', t: 'Мобильное (PWA)', d: 'Кладовщик со сканером штрихкодов, офлайн-режим и синхронизация. Ставится на телефон.' },
  { i: '⊞', t: 'Маркетплейс и no-code', d: 'Модули как плагины + конструктор собственных форм без программирования.' },
  { i: '🔌', t: 'Интеграции', d: 'Telegram, SMTP, Payme/Click/Stripe, Didox ЭСФ, телефония — ключи шифруются.' },
  { i: '🔒', t: 'Безопасность', d: 'RBAC/ABAC, 2FA, PIN-шифрование доступа, полный аудит, изоляция тенантов.' },
];
const nicheList = ['Производство', 'Ритейл / Магазин', 'Интернет-магазин', 'Оптовая торговля', 'Строительство', 'Услуги', 'Логистика', 'и другие'];

// Live plans from the public onboarding metadata (fallback keeps the section working offline).
const plans = ref<any[]>([
  { key: 'trial', name: 'Бесплатный', priceMinor: 0, maxModules: null, highlight: true, tagline: 'Все модули · 14 дней' },
  { key: 'starter', name: 'Starter', priceMinor: 29_900_000, maxModules: 3, tagline: 'Для старта — до 3 модулей' },
  { key: 'business', name: 'Business', priceMinor: 99_900_000, maxModules: 6, tagline: 'Для растущей компании — до 6 модулей' },
  { key: 'enterprise', name: 'Enterprise', priceMinor: null, maxModules: null, tagline: 'Все модули без ограничений' },
]);
function priceLabel(p: any) { return p.priceMinor == null ? t('price.onRequest') : p.priceMinor === 0 ? t('price.free') : (p.priceMinor / 100).toLocaleString('ru-RU') + ' ' + t('price.perMonth'); }
function quotaLabel(p: any) { return p.maxModules == null ? t('price.allModules') : `${p.maxModules} ${p.maxModules === 1 ? 'модуля' : 'модулей'}`; }
onMounted(async () => {
  try { const d = await auth.api<any>('/auth/onboarding-meta'); if (d.plans?.length) plans.value = d.plans; } catch { /* keep fallback */ }
});
</script>

<style scoped>
.lp { color: #0f172a; }
.lp-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
.lp-head { position: sticky; top: 0; background: rgba(255,255,255,.85); backdrop-filter: blur(8px); border-bottom: 1px solid #e2e8f0; z-index: 10; }
.nav { display: flex; align-items: center; justify-content: space-between; height: 66px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; }
.brand .logo { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#2563eb,#1e40af); display: grid; place-items: center; color: #fff; }
.links { display: flex; align-items: center; gap: 14px; }
.menu { color: #475569; font-weight: 500; text-decoration: none; }
.hero { padding: 76px 0 66px; background: radial-gradient(1000px 420px at 50% -10%, #dbeafe, transparent); text-align: center; }
.pill { display: inline-block; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-bottom: 22px; }
.hero h1 { font-size: 48px; line-height: 1.1; font-weight: 850; max-width: 840px; margin: 0 auto; }
.hero .sub { font-size: 19px; color: #475569; max-width: 720px; margin: 22px auto 0; }
.cta { display: flex; gap: 14px; justify-content: center; margin-top: 32px; flex-wrap: wrap; }
.btn.lg { padding: 14px 28px; font-size: 16px; }
.btn.block { width: 100%; margin-top: 16px; }
.badges { display: flex; gap: 10px; justify-content: center; margin-top: 26px; flex-wrap: wrap; }
.badge { background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 14px; color: #475569; font-size: 14px; }
.sec { padding: 62px 0; }
.sec.alt { background: #f8fafc; }
.eyebrow { color: #2563eb; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; font-size: 13px; text-align: center; }
.sec h2 { font-size: 34px; font-weight: 800; text-align: center; margin: 8px 0 0; }
.lead { text-align: center; color: #64748b; max-width: 640px; margin: 12px auto 0; font-size: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 44px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; }
.card .ic { width: 44px; height: 44px; border-radius: 11px; background: #eff6ff; color: #2563eb; display: grid; place-items: center; font-size: 22px; margin-bottom: 14px; }
.card h3 { font-size: 17px; margin-bottom: 7px; }
.card p { color: #475569; font-size: 14.5px; line-height: 1.5; }
.plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px; margin-top: 44px; }
.plan { position: relative; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 26px 22px; text-align: center; }
.plan.hot { border-color: #2563eb; box-shadow: 0 12px 40px rgba(37,99,235,.14); }
.tagpop { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #2563eb; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; }
.plan h3 { font-size: 18px; }
.price { font-size: 24px; font-weight: 800; margin: 10px 0 2px; }
.mods { color: #2563eb; font-weight: 700; font-size: 14px; }
.ptag { color: #64748b; font-size: 13px; margin-top: 8px; min-height: 34px; }
.chips { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 40px; }
.chip { background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 9px 18px; font-weight: 600; }
.cta-band { background: linear-gradient(135deg,#2563eb,#1e40af); color: #fff; border-radius: 20px; padding: 54px; text-align: center; }
.cta-band h2 { font-size: 32px; font-weight: 800; }
.cta-band p { opacity: .9; margin-top: 10px; }
.cta-band .btn { background: #fff; color: #1e40af; margin-top: 24px; }
.lp-foot { border-top: 1px solid #e2e8f0; padding: 34px 0; color: #475569; font-size: 14px; text-align: center; }
@media (max-width: 640px) { .hero h1 { font-size: 32px; } .hero .sub { font-size: 17px; } .links .menu { display: none; } }
</style>
