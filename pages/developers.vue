<template>
  <div class="lp dev">
    <header class="lp-head">
      <div class="lp-wrap nav">
        <NuxtLink to="/" class="brand"><div class="logo">T</div>TTR&nbsp;ONE</NuxtLink>
        <div class="links">
          <a href="#auth" class="menu">Аутентификация</a>
          <a href="#quickstart" class="menu">Быстрый старт</a>
          <a href="#resources" class="menu">Ресурсы</a>
          <a href="#webhooks" class="menu">Вебхуки</a>
          <a :href="specUrl" target="_blank" rel="noopener" class="menu">OpenAPI ↗</a>
          <NuxtLink to="/login" class="btn ghost">Вход</NuxtLink>
          <NuxtLink to="/register" class="btn">Регистрация</NuxtLink>
        </div>
      </div>
    </header>

    <section class="hero">
      <div class="lp-wrap">
        <div class="pill">Developer API</div>
        <h1>Документация по интеграции</h1>
        <p class="sub">REST API и вебхуки TTR ONE. Подключите свою систему, мобильное приложение или 1С — данные, склад, продажи, финансы и события в реальном времени.</p>
        <div class="cta">
          <a href="#quickstart" class="btn lg">Быстрый старт</a>
          <a :href="docsUrl" target="_blank" rel="noopener" class="btn ghost lg">Справочник /api-docs ↗</a>
        </div>
      </div>
    </section>

    <div class="lp-wrap body">
      <!-- Auth -->
      <section id="auth" class="doc">
        <h2>Аутентификация</h2>
        <p>Для интеграций используйте <b>API-ключ</b>. Создайте его в приложении: <i>Управление → API-ключи</i>. Передавайте ключ в каждом запросе заголовком <code>X-API-Key</code> (или <code>Authorization: Bearer ttr_live_…</code>).</p>
        <div class="cards2">
          <div class="card"><div class="ic">🔑</div><h3>Только чтение</h3><p>Доступ ко всем <code>GET</code>-эндпоинтам — витрины, отчёты, выгрузки.</p></div>
          <div class="card"><div class="ic">✳️</div><h3>Полный доступ</h3><p>Чтение и запись — создание заказов, движений склада и т.д. Только доверенным приложениям.</p></div>
        </div>
        <pre class="code">curl {{ apiBase }}/catalog/products \
  -H "X-API-Key: ttr_live_xxxxxxxxxxxxxxxxxxxxxxxx"</pre>
      </section>

      <!-- Quickstart -->
      <section id="quickstart" class="doc">
        <h2>Быстрый старт</h2>
        <p>Базовый URL: <code>{{ apiBase }}</code>. Все запросы и ответы — JSON (UTF-8).</p>
        <h3>JavaScript (fetch)</h3>
        <pre class="code">const API = "{{ apiBase }}";
const KEY = "ttr_live_xxxxxxxxxxxxxxxxxxxxxxxx";

const res = await fetch(`${API}/catalog/products?page=1&pageSize=20`, {
  headers: { "X-API-Key": KEY },
});
const { products, meta } = await res.json();
console.log(products, meta);</pre>
        <h3>Создание записи (POST)</h3>
        <pre class="code">await fetch(`${API}/catalog/categories`, {
  method: "POST",
  headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ code: "ELEC", name: "Электроника" }),
});</pre>
      </section>

      <!-- Conventions -->
      <section id="conventions" class="doc">
        <h2>Соглашения</h2>
        <ul class="conv">
          <li><b>Ошибки</b> — <code>{ "error": { "code": "...", "message": "..." } }</code> с HTTP-статусом 4xx/5xx.</li>
          <li><b>Пагинация</b> — <code>?page=&pageSize=</code>; в ответе поле <code>meta</code> (total, page, totalPages).</li>
          <li><b>Деньги</b> — в тийинах (целое; ÷100 = сум). Поля вида <code>amountMinor</code>.</li>
          <li><b>Количества</b> — строки Decimal (точность сохраняется).</li>
          <li><b>Права</b> — ключ «только чтение» видит все <code>GET</code>; «полный» — читает и пишет. При нехватке прав — <code>403 MISSING_PERMISSION</code>.</li>
        </ul>
      </section>

      <!-- Resources -->
      <section id="resources" class="doc">
        <h2>Основные ресурсы</h2>
        <p>Полный список операций — в <a :href="specUrl" target="_blank" rel="noopener">OpenAPI-спецификации</a> (импортируйте в Postman, Insomnia или Swagger UI и сгенерируйте клиент под любой язык).</p>
        <div class="restable">
          <div v-for="r in resources" :key="r.p" class="resrow"><code>{{ r.p }}</code><span>{{ r.d }}</span></div>
        </div>
      </section>

      <!-- Webhooks -->
      <section id="webhooks" class="doc">
        <h2>Вебхуки</h2>
        <p>Подпишитесь на события в <i>Управление → Вебхуки</i>. TTR ONE отправит <code>POST</code> с JSON на ваш URL при наступлении события. Неуспешные (не-2xx) доставки повторяются с нарастающей задержкой.</p>
        <h3>События</h3>
        <div class="evgrid">
          <div v-for="e in events" :key="e.k" class="evrow"><code>{{ e.k }}</code><span>{{ e.d }}</span></div>
        </div>
        <h3>Тело запроса</h3>
        <pre class="code">{
  "event": "sales.shipped",
  "tenantId": "…",
  "at": "2026-08-04T07:36:29.811Z",
  "data": { /* данные события */ }
}</pre>
        <h3>Проверка подписи</h3>
        <p>Каждая доставка подписана заголовком <code>X-TTR-Signature: sha256=&lt;hmac&gt;</code> — HMAC-SHA256 от <b>сырого тела</b> вашим секретом вебхука. Проверяйте её, чтобы убедиться в подлинности:</p>
        <pre class="code">import crypto from "node:crypto";

function verify(rawBody, signatureHeader, secret) {
  const expected = "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return signatureHeader === expected;
}</pre>
      </section>

      <section class="cta-wrap">
        <div class="cta-band">
          <h2 style="color:#fff;margin:0 0 6px">Готовы интегрировать?</h2>
          <p style="margin:0;opacity:.9">Создайте организацию, получите API-ключ и подключите своё приложение за минуты.</p>
          <NuxtLink to="/register" class="btn">Начать бесплатно</NuxtLink>
        </div>
      </section>
    </div>

    <footer class="lp-foot"><div class="lp-wrap">© TTR ONE · <NuxtLink to="/">На главную</NuxtLink> · <a :href="docsUrl" target="_blank" rel="noopener">/api-docs</a></div></footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const apiBase = computed(() => (useRuntimeConfig().public.apiBase as string));
const origin = computed(() => apiBase.value.replace(/\/api\/v1$/, ''));
const docsUrl = computed(() => origin.value + '/api-docs');
const specUrl = computed(() => origin.value + '/openapi.yaml');

const resources = [
  { p: '/catalog', d: 'Товары, категории, единицы измерения, штрихкоды' },
  { p: '/warehouse', d: 'Склады, остатки, движения (append-only реестр)' },
  { p: '/inventory', d: 'Ячейки (зона→стеллаж→полка→ячейка), партии, инвентаризация' },
  { p: '/procurement', d: 'Поставщики, заявки, заказы, приёмка, счета (3-way match)' },
  { p: '/sales', d: 'Клиенты, прайс-листы, КП, заказы, отгрузки' },
  { p: '/crm', d: 'Сделки, воронка' },
  { p: '/production', d: 'BOM, производственные заказы, маршруты, ОТК' },
  { p: '/finance', d: 'Счета, касса, план счетов, проводки, НДС, отчёты' },
  { p: '/hr', d: 'Сотрудники, отпуска, табель, расчёт зарплаты' },
  { p: '/pos', d: 'Кассы, смены, чеки' },
  { p: '/projects', d: 'Проекты, задачи (канбан), тайм-трекинг' },
  { p: '/logistics', d: 'Автопарк, рейсы, маршруты доставки' },
  { p: '/analytics', d: 'KPI, отчёты, экспорт (CSV/XLSX), ABC-анализ' },
];
const events = [
  { k: 'sales.shipped', d: 'Отгрузка по продаже' },
  { k: 'sales.returned', d: 'Возврат по продаже' },
  { k: 'purchase.received', d: 'Приёмка по закупке' },
  { k: 'production.issued', d: 'Списание материалов в производство' },
  { k: 'production.completed', d: 'Выпуск готовой продукции' },
  { k: 'pos.sale', d: 'Продажа на кассе' },
  { k: 'pos.refund', d: 'Возврат на кассе' },
  { k: 'payroll.accrued', d: 'Начисление зарплаты' },
];
</script>

<style scoped>
.lp { color: #0f172a; background: #fff; }
.lp-wrap { max-width: 1000px; margin: 0 auto; padding: 0 24px; }
.lp-head { position: sticky; top: 0; background: rgba(255,255,255,.9); backdrop-filter: blur(8px); border-bottom: 1px solid #e2e8f0; z-index: 10; }
.nav { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #0f172a; text-decoration: none; }
.brand .logo { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#2563eb,#1e40af); display: grid; place-items: center; color: #fff; }
.links { display: flex; align-items: center; gap: 16px; }
.menu { color: #475569; text-decoration: none; font-size: 14px; font-weight: 600; }
.menu:hover { color: #2563eb; }
.hero { padding: 56px 0 34px; background: radial-gradient(900px 360px at 50% -10%, #dbeafe, transparent); text-align: center; }
.pill { display: inline-block; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 700; margin-bottom: 18px; }
.hero h1 { font-size: 40px; margin: 0 0 12px; }
.hero .sub { color: #475569; font-size: 17px; max-width: 720px; margin: 0 auto 24px; }
.cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.body { padding: 20px 24px 40px; }
.doc { padding: 26px 0; border-top: 1px solid #eef2f7; scroll-margin-top: 76px; }
.doc h2 { font-size: 26px; margin: 0 0 10px; }
.doc h3 { font-size: 16px; margin: 20px 0 8px; color: #334155; }
.doc p { color: #475569; line-height: 1.7; margin: 0 0 10px; }
code { background: #f1f5f9; padding: 2px 7px; border-radius: 6px; font-size: 13px; font-family: ui-monospace, monospace; color: #0f172a; }
.code { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 12px; font-size: 13px; overflow-x: auto; white-space: pre; line-height: 1.6; }
.cards2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 12px 0; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; }
.card .ic { font-size: 22px; margin-bottom: 6px; }
.card h3 { margin: 0 0 4px; font-size: 15px; }
.card p { margin: 0; font-size: 14px; }
.conv { color: #475569; line-height: 1.9; padding-left: 20px; }
.restable, .evgrid { display: grid; gap: 8px; margin-top: 10px; }
.resrow, .evrow { display: grid; grid-template-columns: 180px 1fr; gap: 12px; align-items: center; padding: 9px 12px; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; }
.resrow span, .evrow span { color: #475569; font-size: 14px; }
.cta-wrap { padding: 24px 0 8px; }
.cta-band { background: linear-gradient(135deg,#2563eb,#1e40af); color: #fff; border-radius: 20px; padding: 40px; text-align: center; }
.cta-band .btn { background: #fff; color: #1e40af; margin-top: 18px; }
.lp-foot { border-top: 1px solid #e2e8f0; padding: 22px 0; color: #94a3b8; font-size: 14px; text-align: center; }
.lp-foot a { color: #2563eb; text-decoration: none; }
@media (max-width: 760px) {
  .links .menu { display: none; }
  .hero h1 { font-size: 30px; }
  .cards2, .resrow, .evrow { grid-template-columns: 1fr; }
}
</style>
